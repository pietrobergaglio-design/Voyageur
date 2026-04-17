// TODO: spostare su backend proxy in produzione per non esporre API key

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HotelOffer, PropertyType, RefundPolicy, MatchTag, Currency, SearchParams, ScoreBreakdown } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';

const RAPIDAPI_BASE = 'https://booking-com15.p.rapidapi.com/api/v1/hotels';
const CACHE_PREFIX = 'booking_hotels_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEBUG_MATCH = __DEV__ && true;

// ─── Errors ───────────────────────────────────────────────────────────────────

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rapidApiHeaders(): Record<string, string> {
  return {
    'x-rapidapi-key': process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '',
    'x-rapidapi-host': process.env.EXPO_PUBLIC_RAPIDAPI_HOST_BOOKING ?? 'booking-com15.p.rapidapi.com',
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new BookingError('Request timeout')), timeoutMs),
  );
  return Promise.race([fetch(url, options), timeout]);
}

function extractDistrict(label: string, fallback: string): string {
  const match = label.match(/[\u202a\u200e]([^\u202c\u200f\u202a\u2022•]+)[\u202c\u200f]\s*[\u2022•]/);
  if (match) return match[1].trim();
  return fallback;
}

function mapRefundPolicy(label: string): RefundPolicy {
  const lower = label.toLowerCase();
  if (lower.includes('cancellazione gratuita') || lower.includes('rimborso gratuito')) return 'flexible';
  if (lower.includes('non rimbors') || lower.includes('no cancel')) return 'strict';
  return 'moderate';
}

function clampStars(v: number): HotelOffer['stars'] {
  if (v <= 0) return 0;
  if (v >= 5) return 5;
  return v as HotelOffer['stars'];
}

// ─── Property type detection ──────────────────────────────────────────────────

function parsePropertyType(label: string, stars: number, highlightNames: string[]): PropertyType {
  const lower = (label + ' ' + highlightNames.join(' ')).toLowerCase();

  if (lower.includes('hostel') || lower.includes('ostello')) return 'hostel';
  if (lower.includes('resort')) return 'resort';
  if (lower.includes('boutique')) return 'boutique';
  if (
    lower.includes('b&b') ||
    lower.includes('bed and breakfast') ||
    lower.includes('bed & breakfast') ||
    lower.includes('bed&breakfast')
  ) return 'bnb';
  if (
    lower.includes('guesthouse') ||
    lower.includes('guest house') ||
    lower.includes('pensione') ||
    lower.includes('affittacamere')
  ) return 'guesthouse';
  if (
    lower.includes('apartment') ||
    lower.includes('appartamento') ||
    lower.includes('studio apartment') ||
    lower.includes('flat') ||
    stars === 0
  ) return 'apartment';

  return 'hotel';
}

// ─── Amenities parsing ────────────────────────────────────────────────────────

const AMENITY_PATTERNS: Array<[RegExp, string]> = [
  [/pool|piscina/i, 'pool'],
  [/\bspa\b/i, 'spa'],
  [/wellness/i, 'wellness'],
  [/gym|palestra|fitness/i, 'gym'],
  [/breakfast|colazione/i, 'breakfast'],
  [/parking|parcheggio|garage/i, 'parking'],
  [/\bwifi\b|wi-fi/i, 'wifi'],
  [/pet.friendly|animali ammessi/i, 'pet-friendly'],
  [/family.friendly|famiglie|bambini/i, 'family-friendly'],
  [/kids.club|club bambini/i, 'family-friendly'],
  [/\bbeach\b|spiaggia/i, 'beach'],
  [/garden|giardino/i, 'garden'],
  [/\bbar\b/i, 'bar'],
  [/restaurant|ristorante/i, 'restaurant'],
  [/rooftop/i, 'rooftop'],
  [/romantic|romantico/i, 'romantic'],
  [/adult.only|solo adulti|adults only/i, 'adult-only'],
  [/coworking|co.working/i, 'coworking'],
  [/terrace|terrazza/i, 'terrace'],
  [/sauna/i, 'sauna'],
  [/jacuzzi|hot tub/i, 'jacuzzi'],
  [/airport.shuttle|navetta aeroporto/i, 'airport-shuttle'],
];

function parseAmenities(label: string, highlightNames: string[]): string[] {
  const text = label + ' ' + highlightNames.join(' ');
  const found = new Set<string>();
  for (const [pattern, amenity] of AMENITY_PATTERNS) {
    if (pattern.test(text)) found.add(amenity);
  }
  return Array.from(found);
}

// ─── Match score ──────────────────────────────────────────────────────────────

function expectedPriceRange(budget: number): { min: number; max: number } {
  if (budget <= 20) return { min: 30, max: 70 };
  if (budget <= 40) return { min: 70, max: 120 };
  if (budget <= 60) return { min: 120, max: 200 };
  if (budget <= 80) return { min: 200, max: 400 };
  return { min: 400, max: Infinity };
}

function calcHotelMatchScore(
  rating: number,
  reviewCount: number,
  stars: number,
  propertyType: PropertyType,
  amenities: string[],
  totalPrice: number,
  nights: number,
  profile: OnboardingData,
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {};
  const amenitySet = new Set(amenities);

  // Rating (0–20)
  let ratingPts = 0;
  if (rating >= 8.5) ratingPts = 20;
  else if (rating >= 7.5) ratingPts = 12;
  else if (rating >= 6.5) ratingPts = 5;
  breakdown.rating = ratingPts;

  // Property type match (0–20)
  const pref = (profile.accommodation ?? []).map((a) => a.toLowerCase());
  const wantsHostel = pref.some((p) => p.includes('hostel') || p.includes('ostello'));
  const wantsLuxury = pref.some((p) => p.includes('lusso') || p.includes('luxury') || p.includes('resort'));
  const wantsBoutique = pref.some((p) => p.includes('boutique'));
  const wantsApartment = pref.some((p) => p.includes('appartamento') || p.includes('apartment') || p.includes('airbnb'));
  const wantsBnB = pref.some((p) => p.includes('b&b') || p.includes('bed'));
  const wantsHotel = pref.some((p) => p.includes('hotel') || p.includes('albergo'));

  let typePts = 0;
  if (wantsHostel && propertyType === 'hostel') typePts = 20;
  else if (wantsLuxury && (propertyType === 'resort' || stars >= 5)) typePts = 20;
  else if (wantsBoutique && propertyType === 'boutique') typePts = 20;
  else if (wantsApartment && propertyType === 'apartment') typePts = 20;
  else if (wantsBnB && (propertyType === 'bnb' || propertyType === 'guesthouse')) typePts = 20;
  else if (wantsHotel && propertyType === 'hotel') typePts = 20;
  else if (pref.length === 0) typePts = 10; // no preference — neutral
  breakdown.type = typePts;

  // Budget match (−10 to +20)
  const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice;
  const range = expectedPriceRange(profile.budget ?? 50);
  let budgetPts = 0;
  if (range.max === Infinity) {
    if (pricePerNight >= range.min) budgetPts = 20;
    else if (pricePerNight >= range.min * 0.6) budgetPts = 10;
    else budgetPts = -10;
  } else {
    const span = range.max - range.min;
    const lo20 = range.min - span * 0.2;
    const hi20 = range.max + span * 0.2;
    const lo40 = range.min - span * 0.4;
    const hi40 = range.max + span * 0.4;
    if (pricePerNight >= lo20 && pricePerNight <= hi20) budgetPts = 20;
    else if (pricePerNight >= lo40 && pricePerNight <= hi40) budgetPts = 10;
    else budgetPts = -10;
  }
  breakdown.budget = budgetPts;

  // Experience cursor: iconic (0–40) vs hidden gem (60–100) (−5 to +15)
  const exp = profile.experience ?? 50;
  let expPts = 0;
  if (exp <= 40) {
    if (reviewCount >= 800) expPts = 15;
    else if (reviewCount >= 300) expPts = 8;
  } else if (exp >= 60) {
    if (reviewCount >= 50 && reviewCount <= 300) expPts = 15;
    else if (reviewCount > 300 && reviewCount <= 600) expPts = 8;
    else if (reviewCount > 1500) expPts = -5;
  } else {
    if (reviewCount >= 200 && reviewCount <= 800) expPts = 10;
  }
  breakdown.experience = expPts;

  // Amenities × vibe cursor (0–10)
  const pace = profile.pace ?? 50;
  let amenityPts = 0;
  if (pace <= 40) {
    if (amenitySet.has('spa') || amenitySet.has('wellness') || amenitySet.has('pool') || amenitySet.has('garden') || amenitySet.has('sauna') || amenitySet.has('jacuzzi')) {
      amenityPts = 10;
    }
  } else if (pace >= 60) {
    if (amenitySet.has('gym')) amenityPts = 5;
  }
  breakdown.amenities = amenityPts;

  // Interests match (0–20, +10 per match, max 2)
  const interests = (profile.interests ?? []).map((i) => i.toLowerCase());
  let interestPts = 0;
  const interestChecks: Array<[string[], string[]]> = [
    [['gastronomia', 'food', 'cucina'], ['restaurant', 'bar']],
    [['relax', 'wellness', 'spa', 'benessere'], ['spa', 'wellness', 'pool', 'sauna', 'jacuzzi']],
    [['sport', 'fitness', 'palestra'], ['gym']],
    [['natura', 'outdoor', 'green'], ['garden', 'beach', 'terrace']],
  ];
  for (const [userInterests, requiredAmenities] of interestChecks) {
    if (
      interests.some((i) => userInterests.includes(i)) &&
      requiredAmenities.some((a) => amenitySet.has(a))
    ) {
      interestPts += 10;
    }
  }
  interestPts = Math.min(20, interestPts);
  breakdown.interests = interestPts;

  // Companion match (−15 to +15)
  const companion = (profile.companion ?? '').toLowerCase();
  const childAges = profile.childAges ?? [];
  const isFamily = companion.includes('famiglia') || companion.includes('family') || childAges.length > 0;
  const isCouple = companion.includes('coppia') || companion.includes('couple') || companion.includes('partner');
  const isSolo = companion.includes('solo') || companion.includes('da solo') || companion.includes('da sola');
  const isFriends = companion.includes('amici') || companion.includes('friend');

  let companionPts = 0;
  if (isFamily) {
    if (amenitySet.has('family-friendly')) companionPts = 15;
    else if (amenitySet.has('adult-only')) companionPts = -15;
  } else if (isCouple) {
    if (amenitySet.has('romantic') || amenitySet.has('jacuzzi')) companionPts = 5;
  } else if (isSolo) {
    if (amenitySet.has('coworking') || propertyType === 'hostel') companionPts = 5;
  } else if (isFriends) {
    if (amenitySet.has('bar') || amenitySet.has('pool')) companionPts = 5;
  }
  breakdown.companion = companionPts;

  const raw = ratingPts + typePts + budgetPts + expPts + amenityPts + interestPts + companionPts;
  return { score: Math.max(0, Math.min(100, raw)), breakdown };
}

function assignHotelTags(hotels: HotelOffer[]): void {
  if (hotels.length === 0) return;

  const bestMatch = hotels.reduce((b, h) => h.matchScore > b.matchScore ? h : b, hotels[0]);
  bestMatch.tags.push('best_match');

  const cheapest = hotels.reduce((c, h) => h.totalPrice < c.totalPrice ? h : c, hotels[0]);
  if (cheapest.id !== bestMatch.id) cheapest.tags.push('cheapest');

  const topRated = hotels.reduce((t, h) => (h.rating ?? 0) > (t.rating ?? 0) ? h : t, hotels[0]);
  if (topRated.id !== bestMatch.id && topRated.id !== cheapest.id) {
    topRated.tags.push('most_popular');
  }
}

// ─── Raw Booking types ────────────────────────────────────────────────────────

interface BookingHighlight {
  name?: string;
}

interface BookingProperty {
  id: number;
  name: string;
  wishlistName?: string;
  accuratePropertyClass?: number;
  reviewScore?: number;
  reviewCount?: number;
  reviewScoreWord?: string;
  isPreferred?: boolean;
  photoUrls?: string[];
  latitude?: number;
  longitude?: number;
  currency?: string;
  propertyHighlightStrip?: BookingHighlight[];
  priceBreakdown?: {
    grossPrice?: { value: number; currency: string };
    strikethroughPrice?: { value: number; currency: string };
    benefitBadges?: Array<{ text: string; identifier: string }>;
  };
}

interface BookingHotel {
  hotel_id?: number;
  accessibilityLabel?: string;
  property: BookingProperty;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeHotel(
  hotel: BookingHotel,
  nights: number,
  profile: OnboardingData,
): HotelOffer | null {
  const p = hotel.property;
  const label = hotel.accessibilityLabel ?? '';

  const grossPrice = p.priceBreakdown?.grossPrice;
  if (!grossPrice || !grossPrice.value) return null;

  const totalPrice = grossPrice.value;
  const currency = (grossPrice.currency ?? 'EUR') as Currency;
  const pricePerNight = nights > 0 ? Math.round(totalPrice / nights) : totalPrice;
  const originalPrice = p.priceBreakdown?.strikethroughPrice?.value;
  const stars = clampStars(p.accuratePropertyClass ?? 0);
  const rating = p.reviewScore ?? 0;
  const reviewCount = p.reviewCount ?? 0;
  const reviewWord = p.reviewScoreWord ?? '';
  const zone = extractDistrict(label, p.wishlistName ?? '');
  const refundPolicy = mapRefundPolicy(label);
  const hasFreeCancellation = refundPolicy === 'flexible';

  const highlightNames = (p.propertyHighlightStrip ?? []).map((h) => h.name ?? '');
  const propertyType = parsePropertyType(label, stars, highlightNames);
  const amenities = parseAmenities(label, highlightNames);

  const rawPhotos = p.photoUrls ?? [];
  const largePhotos = rawPhotos.map((url) => url.replace('square500', 'square1024'));
  const thumbnailUrl = rawPhotos[0];

  const { score: matchScore, breakdown } = calcHotelMatchScore(
    rating, reviewCount, stars, propertyType, amenities,
    totalPrice, nights, profile,
  );

  return {
    id: String(p.id),
    provider: 'booking',
    name: p.name,
    zone,
    stars,
    propertyType,
    thumbnailUrl,
    photoUrls: largePhotos,
    rating,
    reviewCount,
    reviewWord,
    hasFreeCancellation,
    originalPrice,
    pricePerNight,
    totalPrice,
    currency,
    refundPolicy,
    matchScore,
    scoreBreakdown: breakdown,
    tags: [],
    amenities,
    rawHotel: hotel,
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function buildCacheKey(params: SearchParams): string {
  const city = (params.destinationCode ?? params.destination).toLowerCase().replace(/\s/g, '_');
  const dep = params.checkIn.toISOString().split('T')[0];
  const ret = params.checkOut.toISOString().split('T')[0];
  return `${CACHE_PREFIX}${city}_${dep}_${ret}_${params.travelers}`;
}

interface CachedHotels {
  timestamp: number;
  hotels: HotelOffer[];
}

export async function readHotelCache(key: string): Promise<{ hotels: HotelOffer[]; ageMs: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedHotels;
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs > CACHE_TTL_MS) return null;
    return { hotels: cached.hotels, ageMs };
  } catch {
    return null;
  }
}

async function writeHotelCache(key: string, hotels: HotelOffer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), hotels }));
  } catch {
    // non-fatal
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface HotelLocationResult {
  dest_id: string;
  dest_type: string;
  name: string;
}

export async function searchHotelLocation(query: string): Promise<HotelLocationResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '';
  if (!apiKey) return null;

  try {
    const resp = await fetchWithTimeout(
      `${RAPIDAPI_BASE}/searchDestination?query=${encodeURIComponent(query)}`,
      { headers: rapidApiHeaders() },
      10_000,
    );
    if (!resp.ok) return null;
    type RawDest = { dest_id: string; dest_type?: string; search_type?: string; name: string };
    const json = await resp.json() as { status: boolean; data: RawDest[] };
    const city = json.data?.find((d) => d.dest_type === 'city' || d.search_type === 'city');
    if (!city) return null;
    return { dest_id: city.dest_id, dest_type: (city.dest_type ?? 'CITY').toUpperCase(), name: city.name };
  } catch {
    return null;
  }
}

export interface SearchHotelsResult {
  hotels: HotelOffer[];
  cacheAgeMs?: number;
}

export async function searchHotels(
  params: SearchParams,
  profile: OnboardingData,
): Promise<SearchHotelsResult> {
  const apiKey = process.env.EXPO_PUBLIC_RAPIDAPI_KEY ?? '';
  if (!apiKey) throw new BookingError('RapidAPI key not configured');

  const cacheKey = buildCacheKey(params);
  const cachedResult = await readHotelCache(cacheKey);
  if (cachedResult) {
    if (__DEV__) console.log('[booking] cache hit, age:', Math.round(cachedResult.ageMs / 60000), 'min');
    return { hotels: cachedResult.hotels, cacheAgeMs: cachedResult.ageMs };
  }

  const destName = params.destination.split(',')[0].trim();
  const location = await searchHotelLocation(destName);
  if (!location) throw new BookingError('Destinazione non trovata su Booking.com');

  const arrivalDate = params.checkIn.toISOString().split('T')[0];
  const departureDate = params.checkOut.toISOString().split('T')[0];
  const nights = Math.max(1, Math.round((params.checkOut.getTime() - params.checkIn.getTime()) / 86_400_000));

  const baseParams = new URLSearchParams({
    dest_id: location.dest_id,
    search_type: location.dest_type,
    arrival_date: arrivalDate,
    departure_date: departureDate,
    adults: String(params.travelers),
    room_qty: '1',
    units: 'metric',
    temperature_unit: 'c',
    languagecode: 'it',
    currency_code: 'EUR',
    sort_by: 'popularity',
  });

  async function fetchPage(page: number): Promise<BookingHotel[]> {
    const url = new URL(`${RAPIDAPI_BASE}/searchHotels`);
    baseParams.forEach((v, k) => url.searchParams.set(k, v));
    url.searchParams.set('page_number', String(page));

    const resp = await fetchWithTimeout(url.toString(), { headers: rapidApiHeaders() }, 20_000);
    if (!resp.ok) {
      if (__DEV__) console.warn(`[booking] page ${page} error ${resp.status}`);
      return [];
    }
    const json = await resp.json() as { status: boolean; data?: { hotels?: BookingHotel[] } };
    return json.data?.hotels ?? [];
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Fetch 3 pages in parallel for ~60-90 hotels
      const [r1, r2, r3] = await Promise.allSettled([fetchPage(1), fetchPage(2), fetchPage(3)]);

      // Merge and deduplicate by property ID
      const seen = new Set<number>();
      const rawHotels: BookingHotel[] = [];
      for (const result of [r1, r2, r3]) {
        if (result.status === 'fulfilled') {
          for (const h of result.value) {
            if (!seen.has(h.property.id)) {
              seen.add(h.property.id);
              rawHotels.push(h);
            }
          }
        }
      }

      if (rawHotels.length === 0) {
        if (__DEV__) console.warn('[booking] no hotels returned');
        return { hotels: [] };
      }

      const normalized = rawHotels
        .map((h) => normalizeHotel(h, nights, profile))
        .filter((h): h is HotelOffer => h !== null);

      if (DEBUG_MATCH) {
        const avg = normalized.length > 0 ? Math.round(normalized.reduce((s, h) => s + h.matchScore, 0) / normalized.length) : 0;
        console.log(`[HOTEL] pre-filter: ${normalized.length} hotels, avg score: ${avg}`);
        normalized.slice(0, 10).forEach((h) => console.log(`  ${h.name} | score: ${h.matchScore} | ${JSON.stringify(h.scoreBreakdown)}`));
      }

      // Filter poor matches — relax threshold if too few results
      const filtered = normalized.filter((h) => h.matchScore >= 5);
      const finalHotels = filtered.length >= 3 ? filtered : normalized;

      finalHotels.sort((a, b) => b.matchScore - a.matchScore || a.totalPrice - b.totalPrice);
      assignHotelTags(finalHotels);

      if (DEBUG_MATCH) {
        finalHotels.slice(0, 10).forEach((h) => {
          const bd = h.scoreBreakdown ?? {};
          const bdStr = Object.entries(bd).map(([k, v]) => `${k}: ${v}`).join(', ');
          console.log(`[HOTEL] ${h.name} | score: ${h.matchScore} | breakdown: { ${bdStr} }`);
        });
      }

      await writeHotelCache(cacheKey, finalHotels);
      if (__DEV__) console.log(`[booking] ${finalHotels.length} hotels (${rawHotels.length} raw)`);
      return { hotels: finalHotels };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (__DEV__) console.warn(`[booking] attempt ${attempt + 1} failed:`, lastError.message);
      if (err instanceof BookingError && (err.statusCode ?? 0) >= 400 && (err.statusCode ?? 0) < 500) {
        throw err;
      }
    }
  }

  throw lastError ?? new BookingError('Unknown error');
}
