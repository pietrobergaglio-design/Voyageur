import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityOffer, MatchTag, Currency, SearchParams } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';

const RAPIDAPI_BASE = 'https://booking-com15.p.rapidapi.com/api/v1/attraction';
const CACHE_PREFIX = 'booking_activities_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class ActivitiesError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'ActivitiesError';
  }
}

function rapidApiHeaders(): Record<string, string> {
  return {
    'x-rapidapi-key': process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '',
    'x-rapidapi-host': process.env.EXPO_PUBLIC_RAPIDAPI_HOST_BOOKING ?? 'booking-com15.p.rapidapi.com',
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new ActivitiesError('Request timeout')), timeoutMs),
  );
  return Promise.race([fetch(url, options), timeout]);
}

// ─── Raw Booking Attraction types ────────────────────────────────────────────

interface AttractionSuggestion {
  productId?: string;
  productSlug?: string;
  name?: string;
  cityName?: string;
  categoryId?: number;
}

interface AttractionDetails {
  id?: string;
  name?: string;
  shortDescription?: string;
  reviewsStats?: { allReviewsCount?: number; combinedNumericStats?: { average?: number } };
  primaryPhoto?: { small?: string; large?: string };
  representativePrice?: { chargeAmount?: number; currency?: string };
  durationRange?: { durationInMinutes?: { lowerBound?: number; upperBound?: number } };
  cancellationPolicy?: { hasFreeCancellation?: boolean };
  highlights?: string[];
  slug?: string;
}

// ─── Match score ──────────────────────────────────────────────────────────────

function calcActivityMatchScore(
  rating: number,
  reviewCount: number,
  price: number,
  profile: OnboardingData,
): number {
  let score = 60;

  if (rating >= 4.5) score += 15;
  else if (rating >= 4.0) score += 10;
  else if (rating >= 3.5) score += 5;

  if (reviewCount > 5000) score += 10;
  else if (reviewCount > 500) score += 7;
  else if (reviewCount > 50) score += 3;

  // Budget match
  if (profile.budget <= 30 && price < 20) score += 10;
  else if (profile.budget >= 70 && price > 50) score += 8;
  else if (price >= 20 && price <= 80) score += 5;

  return Math.min(99, score);
}

function assignActivityTags(activities: ActivityOffer[]): void {
  if (activities.length === 0) return;
  const bestMatch = activities.reduce((b, a) => a.matchScore > b.matchScore ? a : b, activities[0]);
  bestMatch.tags.push('best_match');
  const mostReviewed = activities.reduce((b, a) => (a.reviewCount ?? 0) > (b.reviewCount ?? 0) ? a : b, activities[0]);
  if (mostReviewed.id !== bestMatch.id) mostReviewed.tags.push('most_popular');
}

function parseDurationMinutes(details: AttractionDetails): number {
  const lower = details.durationRange?.durationInMinutes?.lowerBound;
  const upper = details.durationRange?.durationInMinutes?.upperBound;
  if (lower && upper) return Math.round((lower + upper) / 2);
  if (lower) return lower;
  if (upper) return upper;
  return 120; // 2h default
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function normalizeActivity(
  details: AttractionDetails,
  profile: OnboardingData,
): ActivityOffer | null {
  const price = details.representativePrice?.chargeAmount;
  if (!price) return null;

  const currency = (details.representativePrice?.currency ?? 'EUR') as Currency;
  const rating = details.reviewsStats?.combinedNumericStats?.average ?? 0;
  const reviewCount = details.reviewsStats?.allReviewsCount ?? 0;
  const durationMinutes = parseDurationMinutes(details);
  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;
  const durationLabel = formatDurationLabel(durationMinutes);
  const thumbnailUrl = details.primaryPhoto?.small ?? details.primaryPhoto?.large;
  const photoUrls = details.primaryPhoto?.large ? [details.primaryPhoto.large] : [];
  const hasFreeCancellation = details.cancellationPolicy?.hasFreeCancellation ?? false;
  const highlights = (details.highlights ?? []).slice(0, 3);

  const matchScore = calcActivityMatchScore(rating, reviewCount, price, profile);

  return {
    id: details.id ?? details.slug ?? String(Math.random()),
    provider: 'booking_attractions',
    name: details.name ?? '',
    slug: details.slug,
    shortDescription: details.shortDescription,
    durationHours,
    durationLabel,
    price,
    currency,
    rating: rating > 0 ? rating : undefined,
    reviewCount: reviewCount > 0 ? reviewCount : undefined,
    thumbnailUrl,
    photoUrls,
    hasFreeCancellation,
    matchScore,
    tags: [],
    highlights,
    rawOffer: details,
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function buildCacheKey(params: SearchParams): string {
  const city = (params.destinationCode ?? params.destination).toLowerCase().replace(/\s/g, '_');
  return `${CACHE_PREFIX}${city}`;
}

interface CachedActivities {
  timestamp: number;
  activities: ActivityOffer[];
}

async function readCache(key: string): Promise<ActivityOffer[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedActivities;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return cached.activities;
  } catch {
    return null;
  }
}

async function writeCache(key: string, activities: ActivityOffer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), activities }));
  } catch {
    // non-fatal
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function searchAttractionLocation(query: string): Promise<AttractionSuggestion[]> {
  try {
    const url = `${RAPIDAPI_BASE}/searchLocation?query=${encodeURIComponent(query)}&languagecode=it`;
    const resp = await fetchWithTimeout(url, { headers: rapidApiHeaders() }, 10_000);
    if (!resp.ok) return [];
    const json = await resp.json() as { status: boolean; data?: { products?: AttractionSuggestion[] } };
    return json.data?.products ?? [];
  } catch {
    return [];
  }
}

async function getAttractionDetails(slug: string): Promise<AttractionDetails | null> {
  try {
    const url = `${RAPIDAPI_BASE}/getAttractionDetails?slug=${encodeURIComponent(slug)}&languagecode=it`;
    const resp = await fetchWithTimeout(url, { headers: rapidApiHeaders() }, 10_000);
    if (!resp.ok) return null;
    const json = await resp.json() as { status: boolean; data?: AttractionDetails };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function searchActivities(
  params: SearchParams,
  profile: OnboardingData,
): Promise<ActivityOffer[]> {
  const apiKey = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '';
  if (!apiKey) throw new ActivitiesError('RapidAPI key not configured');

  const cacheKey = buildCacheKey(params);
  const cached = await readCache(cacheKey);
  if (cached) {
    if (__DEV__) console.log('[activities] cache hit');
    return cached;
  }

  const cityName = params.destination.split(',')[0].trim();
  const suggestions = await searchAttractionLocation(cityName);

  const slugs = suggestions
    .filter((s) => s.productSlug)
    .slice(0, 6)
    .map((s) => s.productSlug as string);

  if (slugs.length === 0) {
    if (__DEV__) console.warn('[activities] no slugs found for', cityName);
    return [];
  }

  const detailResults = await Promise.allSettled(
    slugs.map((slug) => getAttractionDetails(slug)),
  );

  const activities: ActivityOffer[] = [];
  for (const result of detailResults) {
    if (result.status === 'fulfilled' && result.value) {
      const normalized = normalizeActivity(result.value, profile);
      if (normalized) activities.push(normalized);
    }
  }

  activities.sort((a, b) => b.matchScore - a.matchScore);
  assignActivityTags(activities);

  await writeCache(cacheKey, activities);
  if (__DEV__) console.log(`[activities] ${activities.length} activities fetched`);
  return activities;
}
