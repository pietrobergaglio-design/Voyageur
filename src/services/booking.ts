// TODO: spostare su backend proxy in produzione per non esporre API key

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HotelOffer, RefundPolicy, MatchTag, Currency, SearchParams } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';

const RAPIDAPI_BASE = 'https://booking-com15.p.rapidapi.com/api/v1/hotels';
const CACHE_PREFIX = 'booking_hotels_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

// Extract district/neighbourhood from Booking accessibilityLabel.
// The label uses Unicode LTR markers: ‎<text>‬ • ‎<km>‬
function extractDistrict(label: string, fallback: string): string {
  // Booking labels use U+200E (LRM) as opener and U+202C (PDF) as closer before U+2022 bullet
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

// ─── Match score ──────────────────────────────────────────────────────────────

function calcHotelMatchScore(
  rating: number,
  reviewCount: number,
  stars: number,
  price: number,
  nights: number,
  profile: OnboardingData,
): number {
  let score = 60;

  // Rating bonus
  if (rating >= 9) score += 15;
  else if (rating >= 8) score += 10;
  else if (rating >= 7) score += 5;

  // Accommodation preference match
  const pref = profile.accommodation;
  if ((pref.includes('ostello') || pref.includes('hostel')) && stars <= 2) score += 10;
  else if ((pref.includes('hotel') || pref.includes('Hotel')) && stars >= 3 && stars <= 4) score += 10;
  else if ((pref.includes('lusso') || pref.includes('luxury') || pref.includes('resort')) && stars >= 5) score += 10;
  else if ((pref.includes('appartamento') || pref.includes('apartment') || pref.includes('Airbnb')) && stars === 0) score += 10;

  // Budget fit
  const pricePerNight = nights > 0 ? price / nights : price;
  if (profile.budget <= 30 && pricePerNight < 80) score += 10;
  else if (profile.budget >= 70 && pricePerNight > 200) score += 10;
  else if (pricePerNight >= 80 && pricePerNight <= 250) score += 10;

  // Popularity
  if (reviewCount > 1000) score += 5;
  else if (reviewCount > 100) score += 3;

  return Math.min(99, score);
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
  if (!grossPrice || !grossPrice.value) return null; // skip hotels with no price

  const totalPrice = grossPrice.value;
  const currency = (grossPrice.currency ?? 'EUR') as Currency;
  const pricePerNight = nights > 0 ? Math.round(totalPrice / nights) : totalPrice;

  const originalPrice = p.priceBreakdown?.strikethroughPrice?.value;
  const stars = clampStars(p.accuratePropertyClass ?? 0);
  const rating = p.reviewScore ?? 0;
  const reviewCount = p.reviewCount ?? 0;
  const reviewWord = p.reviewScoreWord ?? '';
  const zone = extractDistrict(label, p.wishlistName ?? '');
  const hasFreeCancellation = mapRefundPolicy(label) === 'flexible';
  const refundPolicy = mapRefundPolicy(label);

  // Use larger images (square1024 if available, else first URL)
  const rawPhotos = p.photoUrls ?? [];
  const largePhotos = rawPhotos.map((url) => url.replace('square500', 'square1024'));
  const thumbnailUrl = rawPhotos[0];

  const matchScore = calcHotelMatchScore(rating, reviewCount, stars, totalPrice, nights, profile);

  return {
    id: String(p.id),
    provider: 'booking',
    name: p.name,
    zone,
    stars,
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
    tags: [],
    amenities: [],
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
    const payload: CachedHotels = { timestamp: Date.now(), hotels };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
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

  // Resolve destination
  const destName = params.destination.split(',')[0].trim();
  const location = await searchHotelLocation(destName);
  if (!location) throw new BookingError('Destinazione non trovata su Booking.com');

  const arrivalDate = params.checkIn.toISOString().split('T')[0];
  const departureDate = params.checkOut.toISOString().split('T')[0];
  const nights = Math.max(1, Math.round((params.checkOut.getTime() - params.checkIn.getTime()) / 86_400_000));

  const url = new URL(`${RAPIDAPI_BASE}/searchHotels`);
  url.searchParams.set('dest_id', location.dest_id);
  url.searchParams.set('search_type', location.dest_type);
  url.searchParams.set('arrival_date', arrivalDate);
  url.searchParams.set('departure_date', departureDate);
  url.searchParams.set('adults', String(params.travelers));
  url.searchParams.set('room_qty', '1');
  url.searchParams.set('page_number', '1');
  url.searchParams.set('units', 'metric');
  url.searchParams.set('temperature_unit', 'c');
  url.searchParams.set('languagecode', 'it');
  url.searchParams.set('currency_code', 'EUR');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetchWithTimeout(url.toString(), { headers: rapidApiHeaders() }, 20_000);

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        if (__DEV__) console.error('[booking] searchHotels error', resp.status, body);
        throw new BookingError(`Booking API ${resp.status}`, resp.status);
      }

      const json = await resp.json() as { status: boolean; data?: { hotels?: BookingHotel[] } };
      const rawHotels = json.data?.hotels ?? [];

      const normalized = rawHotels
        .map((h) => normalizeHotel(h, nights, profile))
        .filter((h): h is HotelOffer => h !== null);

      // Sort by match score desc, then price asc
      normalized.sort((a, b) => b.matchScore - a.matchScore || a.totalPrice - b.totalPrice);
      assignHotelTags(normalized);

      await writeHotelCache(cacheKey, normalized);
      if (__DEV__) console.log(`[booking] ${normalized.length} hotels fetched`);
      return { hotels: normalized };
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
