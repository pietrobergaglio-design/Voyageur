import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityOffer, MatchTag, Currency, SearchParams, ScoreBreakdown } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';

const RAPIDAPI_BASE = 'https://booking-com15.p.rapidapi.com/api/v1/attraction';
const CACHE_PREFIX = 'booking_activities_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DEBUG_MATCH = __DEV__ && true;

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

// ─── Category → interest mapping ─────────────────────────────────────────────

const CATEGORY_INTEREST_MAP: Record<string, string[]> = {
  'tours': ['cultura', 'sightseeing', 'turismo'],
  'sightseeing': ['cultura', 'sightseeing', 'turismo'],
  'walking tour': ['cultura', 'sightseeing'],
  'food': ['gastronomia', 'food', 'cucina'],
  'drink': ['gastronomia', 'food', 'cocktail'],
  'cooking': ['gastronomia', 'food', 'cucina', 'cultura'],
  'wine': ['gastronomia', 'food'],
  'outdoor': ['outdoor', 'natura', 'hiking', 'avventura'],
  'nature': ['natura', 'outdoor', 'paesaggio'],
  'hiking': ['hiking', 'natura', 'outdoor', 'avventura'],
  'photography': ['fotografia', 'instagram', 'arte'],
  'museum': ['cultura', 'arte', 'storia', 'musei'],
  'art': ['arte', 'cultura', 'musei'],
  'history': ['storia', 'cultura', 'arte'],
  'cultural': ['cultura', 'storia', 'arte'],
  'adventure': ['avventura', 'adrenalina', 'outdoor'],
  'sport': ['avventura', 'adrenalina', 'sport', 'outdoor'],
  'water sport': ['avventura', 'adrenalina', 'sport'],
  'wellness': ['wellness', 'relax', 'spa', 'benessere'],
  'spa': ['wellness', 'relax', 'spa', 'benessere'],
  'nightlife': ['nightlife', 'divertimento', 'cocktail'],
  'shopping': ['shopping', 'moda'],
  'theater': ['cultura', 'arte', 'spettacolo'],
  'music': ['musica', 'spettacolo', 'arte'],
  'family': ['famiglia', 'bambini'],
  'theme park': ['adrenalina', 'divertimento', 'famiglia'],
};

function extractCategories(
  primaryCategory: string | null | undefined,
  labels: string[],
): string[] {
  const cats = new Set<string>();
  if (primaryCategory) cats.add(primaryCategory.toLowerCase());
  labels.forEach((l) => cats.add(l.toLowerCase()));
  return Array.from(cats);
}

function categoriesMatchInterests(categories: string[], interests: string[]): number {
  if (interests.length === 0 || categories.length === 0) return 0;
  const normInterests = interests.map((i) => i.toLowerCase());
  let matches = 0;

  for (const cat of categories) {
    // Direct category-interest overlap
    if (normInterests.includes(cat)) {
      matches++;
      continue;
    }
    // Check via mapping
    for (const [catKey, mappedInterests] of Object.entries(CATEGORY_INTEREST_MAP)) {
      if (cat.includes(catKey) || catKey.includes(cat)) {
        if (mappedInterests.some((mi) => normInterests.includes(mi))) {
          matches++;
          break;
        }
      }
    }
  }
  return matches;
}

// ─── Raw types ────────────────────────────────────────────────────────────────

interface AttractionSuggestion {
  productId?: string;
  productSlug?: string;
  name?: string;
  cityName?: string;
  categoryId?: number;
}

interface AttractionCategory {
  id?: number;
  name?: string;
}

interface AttractionDetails {
  id?: string;
  name?: string;
  shortDescription?: string;
  reviewsStats?: {
    allReviewsCount?: number;
    combinedNumericStats?: { average?: number };
  };
  primaryPhoto?: { small?: string; large?: string };
  representativePrice?: { chargeAmount?: number; currency?: string };
  durationRange?: { durationInMinutes?: { lowerBound?: number; upperBound?: number } };
  cancellationPolicy?: { hasFreeCancellation?: boolean };
  highlights?: string[];
  slug?: string;
  primaryCategory?: AttractionCategory;
  categories?: AttractionCategory[];
  labels?: string[];
  type?: string;
  ufiDetails?: { bCityName?: string };
}

// ─── Match score ──────────────────────────────────────────────────────────────

function activityBudgetRange(budget: number): { min: number; max: number } {
  if (budget <= 40) return { min: 5, max: 40 };
  if (budget <= 70) return { min: 40, max: 100 };
  return { min: 100, max: Infinity };
}

function calcActivityMatchScore(
  rating: number,
  reviewCount: number,
  price: number,
  durationHours: number,
  categories: string[],
  highlights: string[],
  profile: OnboardingData,
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {};

  // Rating (0–15)
  let ratingPts = 0;
  if (rating >= 4.5) ratingPts = 15;
  else if (rating >= 4.0) ratingPts = 10;
  else if (rating >= 3.5) ratingPts = 5;
  breakdown.rating = ratingPts;

  // Review volume (0–10)
  let reviewPts = 0;
  if (reviewCount >= 5000) reviewPts = 10;
  else if (reviewCount >= 500) reviewPts = 5;
  breakdown.reviews = reviewPts;

  // Interests match (0–30, +10 per match up to 3)
  const interestMatches = categoriesMatchInterests(categories, profile.interests ?? []);
  const interestPts = Math.min(30, interestMatches * 10);
  breakdown.interests = interestPts;

  // Pace match (0–10)
  const pace = profile.pace ?? 50;
  const allText = categories.join(' ') + ' ' + highlights.join(' ');
  const allLower = allText.toLowerCase();
  const isRelaxActivity = allLower.includes('spa') || allLower.includes('wellness') ||
    allLower.includes('tea') || allLower.includes('garden') || allLower.includes('museum') ||
    allLower.includes('temple') || allLower.includes('culture') || durationHours <= 2;
  const isActiveActivity = allLower.includes('hiking') || allLower.includes('biking') ||
    allLower.includes('sport') || allLower.includes('adventure') || allLower.includes('kayak') ||
    allLower.includes('surf') || allLower.includes('climb');
  let pacePts = 0;
  if (pace <= 30 && isRelaxActivity) pacePts = 10;
  else if (pace >= 70 && isActiveActivity) pacePts = 10;
  breakdown.pace = pacePts;

  // Experience cursor: iconic vs hidden gem (−5 to +15)
  const exp = profile.experience ?? 50;
  let expPts = 0;
  if (exp <= 40) {
    // Iconic
    if (reviewCount >= 3000) expPts = 10;
    else if (reviewCount >= 800) expPts = 5;
  } else if (exp >= 60) {
    // Hidden gem
    if (reviewCount >= 50 && reviewCount <= 800) expPts = 15;
    else if (reviewCount > 3000) expPts = -5;
  }
  breakdown.experience = expPts;

  // Vibe / adventure cursor (0–15)
  const adventure = profile.adventure ?? 50;
  const isAdventureActivity = allLower.includes('adventure') || allLower.includes('outdoor') ||
    allLower.includes('sport') || allLower.includes('hiking') || allLower.includes('climb') ||
    allLower.includes('rafting') || allLower.includes('safari');
  const isCulturalActivity = allLower.includes('museum') || allLower.includes('temple') ||
    allLower.includes('culture') || allLower.includes('art') || allLower.includes('history') ||
    allLower.includes('teatro') || allLower.includes('tour');
  let vibePts = 0;
  if (adventure >= 60 && isAdventureActivity) vibePts = 15;
  else if (adventure <= 40 && isCulturalActivity) vibePts = 15;
  breakdown.vibe = vibePts;

  // Budget match (−5 to +15)
  const range = activityBudgetRange(profile.budget ?? 50);
  let budgetPts = 0;
  if (range.max === Infinity) {
    budgetPts = price >= range.min ? 15 : (price >= range.min * 0.6 ? 5 : -5);
  } else {
    const span = range.max - range.min;
    const lo = range.min - span * 0.3;
    const hi = range.max + span * 0.3;
    if (price >= lo && price <= hi) budgetPts = 15;
    else budgetPts = -5;
  }
  breakdown.budget = budgetPts;

  // Companion match (−15 to +15)
  const companion = (profile.companion ?? '').toLowerCase();
  const childAges = profile.childAges ?? [];
  const isFamily = companion.includes('famiglia') || companion.includes('family') || childAges.length > 0;
  const isCouple = companion.includes('coppia') || companion.includes('couple') || companion.includes('partner');
  let companionPts = 0;
  const textLower = allLower;
  if (isFamily) {
    if (textLower.includes('family') || textLower.includes('kid') || textLower.includes('child')) companionPts = 15;
    else if (textLower.includes('age restriction') || textLower.includes('adults only') || textLower.includes('18+')) companionPts = -15;
  } else if (isCouple) {
    if (textLower.includes('romantic') || textLower.includes('private') || textLower.includes('couple')) companionPts = 5;
  }
  breakdown.companion = companionPts;

  const raw = ratingPts + reviewPts + interestPts + pacePts + expPts + vibePts + budgetPts + companionPts;
  return { score: Math.max(0, Math.min(100, raw)), breakdown };
}

function assignActivityTags(activities: ActivityOffer[]): void {
  if (activities.length === 0) return;
  const bestMatch = activities.reduce((b, a) => a.matchScore > b.matchScore ? a : b, activities[0]);
  bestMatch.tags.push('best_match');
  const mostReviewed = activities.reduce(
    (b, a) => (a.reviewCount ?? 0) > (b.reviewCount ?? 0) ? a : b,
    activities[0],
  );
  if (mostReviewed.id !== bestMatch.id) mostReviewed.tags.push('most_popular');
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

function parseDurationMinutes(details: AttractionDetails): number {
  const lower = details.durationRange?.durationInMinutes?.lowerBound;
  const upper = details.durationRange?.durationInMinutes?.upperBound;
  if (lower && upper) return Math.round((lower + upper) / 2);
  if (lower) return lower;
  if (upper) return upper;
  return 120;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

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

  // Extract categories from all available fields
  const primaryCatName = details.primaryCategory?.name ?? details.type;
  const extraCats = (details.categories ?? []).map((c) => c.name ?? '').filter(Boolean);
  const labels = details.labels ?? [];
  const categories = extractCategories(primaryCatName, [...extraCats, ...labels]);

  const { score: matchScore, breakdown } = calcActivityMatchScore(
    rating, reviewCount, price, durationHours, categories, highlights, profile,
  );

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
    categories,
    matchScore,
    scoreBreakdown: breakdown,
    tags: [],
    highlights,
    rawOffer: details,
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function buildCacheKey(params: SearchParams): string {
  const city = (params.destinationCode ?? params.destination).toLowerCase().replace(/\s/g, '_');
  const dep = params.checkIn.toISOString().split('T')[0];
  const ret = params.checkOut.toISOString().split('T')[0];
  return `${CACHE_PREFIX}${city}_${dep}_${ret}_${params.travelers}`;
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

async function searchAttractionLocation(
  query: string,
  page: number,
): Promise<AttractionSuggestion[]> {
  const url = `${RAPIDAPI_BASE}/searchLocation?query=${encodeURIComponent(query)}&languagecode=it&rows=18&page=${page}`;
  if (__DEV__) console.log(`[activities:location] GET ${url}`);
  try {
    const resp = await fetchWithTimeout(url, { headers: rapidApiHeaders() }, 10_000);
    if (__DEV__) console.log(`[activities:location] status=${resp.status} page=${page}`);
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      if (__DEV__) console.warn(`[activities:location] ERROR ${resp.status}: ${body.slice(0, 500)}`);
      return [];
    }
    const json = await resp.json() as { status: boolean; data?: { products?: AttractionSuggestion[] } };
    const products = json.data?.products ?? [];
    if (__DEV__) console.log(`[activities:location] page=${page} found ${products.length} products, slugs: [${products.slice(0, 5).map((p) => p.productSlug).join(', ')}...]`);
    return products;
  } catch (err) {
    if (__DEV__) console.warn('[activities:location] fetch threw:', String(err));
    return [];
  }
}

async function getAttractionDetails(
  slug: string,
  startDate: string,
  endDate: string,
): Promise<AttractionDetails | null> {
  const url = `${RAPIDAPI_BASE}/getAttractionDetails?slug=${encodeURIComponent(slug)}&languagecode=it&startDate=${startDate}&endDate=${endDate}`;
  try {
    const resp = await fetchWithTimeout(url, { headers: rapidApiHeaders() }, 10_000);
    if (!resp.ok) {
      if (__DEV__) console.warn(`[activities:details] ${slug} → status=${resp.status}`);
      return null;
    }
    const json = await resp.json() as { status: boolean; data?: AttractionDetails };
    if (__DEV__ && !json.data) console.warn(`[activities:details] ${slug} → no data in response`);
    return json.data ?? null;
  } catch (err) {
    if (__DEV__) console.warn(`[activities:details] ${slug} threw:`, String(err));
    return null;
  }
}

export async function searchActivities(
  params: SearchParams,
  profile: OnboardingData,
): Promise<ActivityOffer[]> {
  const apiKey = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '';

  if (__DEV__) {
    console.log('━━━ [searchActivities] params ━━━');
    console.log(`  destination: ${params.destination}`);
    console.log(`  destinationCode: ${params.destinationCode ?? '(none)'}`);
    console.log(`  origin: ${params.origin}`);
    console.log(`  checkIn: ${params.checkIn.toISOString()}`);
    console.log(`  checkOut: ${params.checkOut.toISOString()}`);
    console.log(`  travelers: ${params.travelers}`);
    console.log(`  apiKey present: ${!!apiKey} (${apiKey ? apiKey.slice(0, 8) + '...' : 'MISSING'})`);
  }

  if (!apiKey) throw new ActivitiesError('RapidAPI key not configured');

  const cacheKey = buildCacheKey(params);
  if (__DEV__) console.log(`[activities] cache key: "${cacheKey}"`);

  const cached = await readCache(cacheKey);
  if (cached) {
    if (__DEV__) console.log(`[activities] CACHE HIT — returning ${cached.length} cached activities (key: ${cacheKey})`);
    return cached;
  }
  if (__DEV__) console.log('[activities] cache miss — fetching from API');

  const cityName = params.destination.split(',')[0].trim();
  const startDate = params.checkIn.toISOString().split('T')[0];
  const endDate = params.checkOut.toISOString().split('T')[0];
  if (__DEV__) console.log(`[activities] querying city="${cityName}" startDate=${startDate} endDate=${endDate}`);

  // Fetch 2 pages in parallel (up to 36 suggestions)
  const [page1Results, page2Results] = await Promise.allSettled([
    searchAttractionLocation(cityName, 1),
    searchAttractionLocation(cityName, 2),
  ]);

  const page1 = page1Results.status === 'fulfilled' ? page1Results.value : [];
  const page2 = page2Results.status === 'fulfilled' ? page2Results.value : [];
  if (__DEV__) {
    if (page1Results.status === 'rejected') console.warn('[activities] page1 rejected:', page1Results.reason);
    if (page2Results.status === 'rejected') console.warn('[activities] page2 rejected:', page2Results.reason);
    console.log(`[activities] location results: page1=${page1.length} page2=${page2.length}`);
  }

  // Deduplicate slugs
  const seenSlugs = new Set<string>();
  const allSuggestions = [...page1, ...page2];
  const slugs = allSuggestions
    .filter((s) => s.productSlug && !seenSlugs.has(s.productSlug) && seenSlugs.add(s.productSlug as string))
    .slice(0, 20)
    .map((s) => s.productSlug as string);

  if (slugs.length === 0) {
    if (__DEV__) console.warn(`[activities] ⚠️ no slugs found for "${cityName}" — API may be failing or rate-limited`);
    return [];
  }
  if (__DEV__) console.log(`[activities] fetching details for ${slugs.length} slugs:`, slugs);

  const detailResults = await Promise.allSettled(
    slugs.map((slug) => getAttractionDetails(slug, startDate, endDate)),
  );

  if (__DEV__) {
    const ok = detailResults.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    const nulls = detailResults.filter((r) => r.status === 'fulfilled' && r.value === null).length;
    const errs = detailResults.filter((r) => r.status === 'rejected').length;
    console.log(`[activities] detail results: ${ok} ok, ${nulls} null, ${errs} errors`);
  }

  const activities: ActivityOffer[] = [];
  for (const result of detailResults) {
    if (result.status === 'fulfilled' && result.value) {
      const normalized = normalizeActivity(result.value, profile);
      if (normalized) activities.push(normalized);
    }
  }

  if (DEBUG_MATCH) {
    const avg = activities.length > 0 ? Math.round(activities.reduce((s, a) => s + a.matchScore, 0) / activities.length) : 0;
    console.log(`[ACTIVITY] pre-filter: ${activities.length} activities, avg score: ${avg}`);
    activities.slice(0, 5).forEach((a) => console.log(`  ${a.name} | score: ${a.matchScore} | ${JSON.stringify(a.scoreBreakdown)}`));
  }

  // Filter poor matches
  const filtered = activities.filter((a) => a.matchScore >= 5);
  const finalActivities = filtered.length >= 3 ? filtered : activities;

  finalActivities.sort((a, b) => b.matchScore - a.matchScore);
  assignActivityTags(finalActivities);

  if (DEBUG_MATCH) {
    finalActivities.forEach((a) => {
      const bd = a.scoreBreakdown ?? {};
      const bdStr = Object.entries(bd).map(([k, v]) => `${k}: ${v}`).join(', ');
      console.log(`[ACTIVITY] ${a.name} | score: ${a.matchScore} | breakdown: { ${bdStr} }`);
    });
  }

  await writeCache(cacheKey, finalActivities);
  if (__DEV__) console.log(`[activities] ${finalActivities.length} activities (${activities.length} raw, ${slugs.length} slugs)`);
  return finalActivities;
}
