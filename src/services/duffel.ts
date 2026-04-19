// TODO: spostare su backend proxy in produzione per non esporre API key

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FlightOffer, FlightSegment, BaggageAllowance, RefundPolicy, MatchTag, Currency, SearchParams, ScoreBreakdown } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';

const DUFFEL_BASE = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';
const TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_PREFIX = 'duffel_cache_';
const DEBUG_MATCH = __DEV__ && true;

// ─── IATA lookup ──────────────────────────────────────────────────────────────

const CITY_TO_IATA: Record<string, string> = {
  'milano': 'MXP', 'milan': 'MXP', 'malpensa': 'MXP',
  'roma': 'FCO', 'rome': 'FCO',
  'tokyo': 'NRT', 'tokio': 'NRT',
  'new york': 'JFK', 'new york city': 'JFK', 'nyc': 'JFK',
  'london': 'LHR', 'londra': 'LHR',
  'paris': 'CDG', 'parigi': 'CDG',
  'barcelona': 'BCN', 'barcellona': 'BCN',
  'madrid': 'MAD',
  'amsterdam': 'AMS',
  'dubai': 'DXB',
  'bangkok': 'BKK',
  'singapore': 'SIN',
  'hong kong': 'HKG',
  'seoul': 'ICN',
  'osaka': 'KIX',
  'beijing': 'PEK', 'pechino': 'PEK',
  'shanghai': 'PVG',
  'sydney': 'SYD',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  'chicago': 'ORD',
  'miami': 'MIA',
  'toronto': 'YYZ',
  'montreal': 'YUL',
  'mexico city': 'MEX', 'città del messico': 'MEX',
  'buenos aires': 'EZE',
  'rio de janeiro': 'GIG',
  'istanbul': 'IST',
  'vienna': 'VIE',
  'zurich': 'ZRH', 'zurigo': 'ZRH',
  'frankfurt': 'FRA', 'francoforte': 'FRA',
  'munich': 'MUC', 'monaco': 'MUC',
  'brussels': 'BRU', 'bruxelles': 'BRU',
  'lisbon': 'LIS', 'lisbona': 'LIS',
  'athens': 'ATH', 'atene': 'ATH',
  'cairo': 'CAI',
  'johannesburg': 'JNB',
  'nairobi': 'NBO',
  'mumbai': 'BOM', 'bombay': 'BOM',
  'delhi': 'DEL', 'new delhi': 'DEL',
  'kuala lumpur': 'KUL',
  'jakarta': 'CGK',
  'manila': 'MNL',
  'taipei': 'TPE',
};

export async function resolveCityToIATA(cityName: string): Promise<string> {
  const key = cityName.toLowerCase().trim();
  if (CITY_TO_IATA[key]) return CITY_TO_IATA[key];

  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (key.startsWith(city) || city.startsWith(key)) return code;
  }

  const apiKey = process.env.EXPO_PUBLIC_DUFFEL_API_KEY ?? '';
  if (!apiKey) return '';

  try {
    const resp = await fetchWithTimeout(
      `${DUFFEL_BASE}/places/suggestions?query=${encodeURIComponent(cityName)}`,
      { headers: duffelHeaders(apiKey) },
      5_000,
    );
    if (!resp.ok) return '';
    const json = await resp.json() as { data: Array<{ type: string; iata_code: string }> };
    const airport = json.data.find((p) => p.type === 'airport');
    return airport?.iata_code ?? '';
  } catch {
    return '';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function duffelHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Duffel-Version': DUFFEL_VERSION,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

function parseDurationToMinutes(iso: string): number {
  const days = parseInt(iso.match(/(\d+)D/)?.[1] ?? '0', 10);
  const hours = parseInt(iso.match(/(\d+)H/)?.[1] ?? '0', 10);
  const minutes = parseInt(iso.match(/(\d+)M/)?.[1] ?? '0', 10);
  return days * 1440 + hours * 60 + minutes;
}

const PREMIUM_AIRLINES = new Set([
  'Singapore Airlines', 'ANA', 'Japan Airlines', 'Cathay Pacific',
  'Emirates', 'Qatar Airways', 'Swiss', 'Austrian', 'Finnair',
  'Lufthansa', 'British Airways', 'Air France', 'KLM',
]);

const LOW_COST_IATA = new Set(['FR', 'U2', 'W6', 'B6', 'VY', 'DY', 'PC', 'HV']);

function mapCabin(fareBrandName: string | null | undefined): FlightOffer['cabin'] {
  const name = (fareBrandName ?? '').toLowerCase();
  if (name.includes('first')) return 'first';
  if (name.includes('business') || name.includes('flex')) return 'business';
  if (name.includes('premium')) return 'premium_economy';
  return 'economy';
}

function mapRefundPolicy(conditions: DuffelConditions | null | undefined): RefundPolicy {
  const r = conditions?.refund_before_departure;
  if (!r || r.allowed === false) return 'strict';
  const penalty = parseFloat(r.penalty_amount ?? '0');
  return penalty === 0 ? 'flexible' : 'moderate';
}

// ─── Score (base score — duration bonus applied separately) ───────────────────

function calcMatchScore(
  offer: DuffelOffer,
  profile: OnboardingData,
  price: number,
  stops: number,
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {};

  // Stops: biggest quality signal
  let stopsPts = 0;
  if (stops === 0) stopsPts = 20;
  else if (stops === 1) stopsPts = 5;
  else stopsPts = -10;
  breakdown.stops = stopsPts;

  // Budget fit (price relative to budget cursor)
  let budgetPts = 0;
  if (profile.budget <= 40 && price < 700) budgetPts = 15;
  else if (profile.budget >= 60 && price > 800) budgetPts = 10;
  else if (price >= 400 && price <= 900) budgetPts = 15;
  else if (price < 300) budgetPts = 8; // very cheap is OK for most
  breakdown.budget = budgetPts;

  // Departure time
  const depHour = new Date(offer.slices[0]?.segments[0]?.departing_at ?? '').getHours();
  let timePts = 0;
  if (!isNaN(depHour)) {
    if (depHour >= 0 && depHour < 6) {
      timePts = -15; // Night departure — discomfort for most travelers
    } else if (depHour >= 6 && depHour < 12) {
      timePts = profile.pace >= 70 ? 10 : 3; // Morning: great for fast travelers
    } else {
      timePts = 5; // Afternoon or evening
    }
  }
  breakdown.departure = timePts;

  // Airline preference by budget cursor
  let airlinePts = 0;
  if (profile.budget > 70 && PREMIUM_AIRLINES.has(offer.owner.name)) airlinePts = 8;
  if (profile.budget < 30 && LOW_COST_IATA.has(offer.owner.iata_code)) airlinePts = 8;
  breakdown.airline = airlinePts;

  const base = 20;
  const total = base + stopsPts + budgetPts + timePts + airlinePts;
  // Cap at 85 to leave room for the duration bonus (+10)
  return { score: Math.min(85, total), breakdown };
}

/** Second pass: add duration-percentile bonus after all offers are normalized. */
function applyDurationBonus(offers: FlightOffer[]): void {
  if (offers.length < 2) return;

  const durations = offers.map((o) =>
    o.totalDurationMinutes ?? o.segments.reduce((s, seg) => s + seg.durationMinutes, 0),
  );
  const sorted = [...durations].sort((a, b) => a - b);
  const p25idx = Math.floor(sorted.length * 0.25);
  const p50idx = Math.floor(sorted.length * 0.50);
  const p25 = sorted[p25idx];
  const p50 = sorted[p50idx];

  offers.forEach((offer) => {
    const dur = offer.totalDurationMinutes ?? offer.segments.reduce((s, seg) => s + seg.durationMinutes, 0);
    let bonus = 0;
    if (dur <= p25) bonus = 10;
    else if (dur <= p50) bonus = 5;
    if (bonus > 0) {
      offer.matchScore = Math.min(95, offer.matchScore + bonus);
      if (offer.scoreBreakdown) offer.scoreBreakdown.duration = bonus;
    }
  });
}

function assignTags(offers: FlightOffer[]): void {
  if (offers.length === 0) return;

  const bestMatch = offers.reduce((best, o) => o.matchScore > best.matchScore ? o : best, offers[0]);
  bestMatch.tags.push('best_match');

  const cheapest = offers.reduce((c, o) => o.price < c.price ? o : c, offers[0]);
  if (cheapest.id !== bestMatch.id) cheapest.tags.push('cheapest');

  const totalMins = (o: FlightOffer) => o.totalDurationMinutes ?? o.segments.reduce((s, seg) => s + seg.durationMinutes, 0);
  const fastest = offers.reduce((f, o) => totalMins(o) < totalMins(f) ? o : f, offers[0]);
  if (fastest.id !== bestMatch.id && fastest.id !== cheapest.id) {
    fastest.tags.push('fastest');
  }

  offers.forEach((o) => {
    if (PREMIUM_AIRLINES.has(o.airline) && !o.tags.includes('premium')) {
      o.tags.push('premium');
    }
  });
}

// ─── Duffel raw types ─────────────────────────────────────────────────────────

interface DuffelSegment {
  origin: { iata_code: string };
  destination: { iata_code: string };
  departing_at: string;
  arriving_at: string;
  duration: string;
  marketing_carrier_flight_designation: string;
  operating_carrier_flight_designation?: string;
  aircraft?: { name: string };
  passengers?: Array<{ baggages: Array<{ type: string; quantity: number }> }>;
}

interface DuffelSlice {
  segments: DuffelSegment[];
  duration: string;
  fare_brand_name?: string | null;
}

interface DuffelConditions {
  refund_before_departure?: {
    allowed: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  } | null;
}

interface DuffelOffer {
  id: string;
  owner: { name: string; iata_code: string; logo_symbol_url?: string };
  total_amount: string;
  total_currency: string;
  slices: DuffelSlice[];
  conditions: DuffelConditions | null;
  passengers?: unknown[];
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeOffer(offer: DuffelOffer, profile: OnboardingData): FlightOffer {
  const outbound = offer.slices[0];
  const outSegs = outbound.segments; // outbound-only, used for stops/baggage/cabin
  const first = outSegs[0];

  // Flatten all slices so round-trip offers include both outbound and return segments
  const allRawSegs = offer.slices.flatMap((s) => s.segments);

  const normalizedSegments: FlightSegment[] = allRawSegs.map((seg) => ({
    origin: seg.origin.iata_code,
    destination: seg.destination.iata_code,
    departureAt: seg.departing_at,
    arrivalAt: seg.arriving_at,
    durationMinutes: parseDurationToMinutes(seg.duration),
    flightNumber: seg.operating_carrier_flight_designation ?? seg.marketing_carrier_flight_designation,
    aircraft: seg.aircraft?.name,
  }));

  const stops = outSegs.length - 1; // outbound stops only
  const stopoverCities = stops > 0 ? outSegs.slice(0, -1).map((s) => s.destination.iata_code) : [];
  const price = parseFloat(offer.total_amount);
  const refundPolicy = mapRefundPolicy(offer.conditions);
  const { score: matchScore, breakdown } = calcMatchScore(offer, profile, price, stops);

  const passengerBaggages = first.passengers?.[0]?.baggages ?? [];
  const baggage: BaggageAllowance[] = passengerBaggages.map((b) => ({
    type: (b.type === 'checked' ? 'checked' : 'carry_on') as BaggageAllowance['type'],
    quantity: b.quantity,
  }));
  const baggageIncluded = baggage.some((b) => b.type === 'checked' && b.quantity > 0);

  const totalDurationMinutes = parseDurationToMinutes(outbound.duration);

  return {
    id: offer.id,
    provider: 'duffel',
    airline: offer.owner.name,
    airlineCode: offer.owner.iata_code,
    logoUrl: offer.owner.logo_symbol_url,
    segments: normalizedSegments,
    stops,
    stopoverCities,
    totalDurationMinutes,
    price,
    currency: offer.total_currency as Currency,
    refundPolicy,
    matchScore,
    scoreBreakdown: breakdown,
    tags: [],
    cabin: mapCabin(outbound.fare_brand_name),
    baggageIncluded,
    baggage,
    rawOffer: offer,
  };
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function buildCacheKey(params: SearchParams): string {
  const dep = params.checkIn.toISOString().split('T')[0];
  const ret = params.checkOut.toISOString().split('T')[0];
  return `${CACHE_PREFIX}${params.originCode}_${params.destinationCode ?? params.destination}_${dep}_${ret}_${params.travelers}`;
}

interface CachedFlights {
  timestamp: number;
  offers: FlightOffer[];
}

async function readCache(key: string): Promise<FlightOffer[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedFlights;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;
    return cached.offers;
  } catch {
    return null;
  }
}

async function writeCache(key: string, offers: FlightOffer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), offers }));
  } catch {
    // cache write failure is non-fatal
  }
}

// ─── Main search ──────────────────────────────────────────────────────────────

export class DuffelError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'DuffelError';
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new DuffelError('Request timeout')), timeoutMs),
  );
  return Promise.race([fetch(url, options), timeoutPromise]);
}

export async function searchFlights(
  params: SearchParams,
  profile: OnboardingData,
): Promise<FlightOffer[]> {
  const apiKey = process.env.EXPO_PUBLIC_DUFFEL_API_KEY ?? '';
  if (!apiKey) throw new DuffelError('Duffel API key not configured');

  const cacheKey = buildCacheKey(params);
  const cached = await readCache(cacheKey);
  if (cached) {
    if (__DEV__) console.log('[duffel] cache hit');
    return cached;
  }

  const originCode = params.originCode || (await resolveCityToIATA(params.origin));
  const destCode = params.destinationCode || (await resolveCityToIATA(params.destination));

  if (!originCode || !destCode) {
    throw new DuffelError('Impossibile risolvere i codici IATA per le città inserite');
  }

  const depDate = params.checkIn.toISOString().split('T')[0];
  const retDate = params.checkOut.toISOString().split('T')[0];

  const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
    { origin: originCode, destination: destCode, departure_date: depDate },
  ];
  if (retDate !== depDate) {
    // Open-jaw multi-city: return from last city (returnOriginCode), else standard round-trip
    const returnOrigin = params.returnOriginCode ?? destCode;
    slices.push({ origin: returnOrigin, destination: originCode, departure_date: retDate });
    if (__DEV__) console.log(`[duffel] slices: ${originCode}→${destCode} (${depDate}) + ${returnOrigin}→${originCode} (${retDate})`);
  }

  const passengers = Array.from({ length: params.travelers }, () => ({ type: 'adult' as const }));

  let offerRequestId: string;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const createResp = await fetchWithTimeout(
        `${DUFFEL_BASE}/air/offer_requests`,
        {
          method: 'POST',
          headers: duffelHeaders(apiKey),
          body: JSON.stringify({
            data: { slices, passengers, cabin_class: 'economy' },
          }),
        },
        TIMEOUT_MS,
      );

      if (!createResp.ok) {
        const body = await createResp.text().catch(() => '');
        if (__DEV__) console.error('[duffel] offer_request error', createResp.status, body);
        throw new DuffelError(`Duffel ${createResp.status}`, createResp.status);
      }

      const createData = await createResp.json() as { data: { id: string } };
      offerRequestId = createData.data.id;

      const offersResp = await fetchWithTimeout(
        `${DUFFEL_BASE}/air/offers?offer_request_id=${offerRequestId}&limit=20&sort=total_amount`,
        { method: 'GET', headers: duffelHeaders(apiKey) },
        TIMEOUT_MS,
      );

      if (!offersResp.ok) {
        const body = await offersResp.text().catch(() => '');
        if (__DEV__) console.error('[duffel] offers error', offersResp.status, body);
        throw new DuffelError(`Duffel ${offersResp.status}`, offersResp.status);
      }

      const offersData = await offersResp.json() as { data: DuffelOffer[] };
      const rawOffers = offersData.data ?? [];

      if (rawOffers.length === 0) return [];

      const normalized = rawOffers.map((o) => normalizeOffer(o, profile));

      // Dedup by fingerprint (same flight, different offer IDs from Duffel)
      const seenFp = new Set<string>();
      const deduped = normalized.filter((o) => {
        const first = o.segments[0];
        const last = o.segments[o.segments.length - 1];
        const fp = `${o.airlineCode}_${first.departureAt}_${last.arrivalAt}_${o.price}`;
        if (seenFp.has(fp)) return false;
        seenFp.add(fp);
        return true;
      });

      // Second pass: add duration-percentile bonus
      applyDurationBonus(deduped);

      // Filter out poor matches
      const filtered = deduped.filter((o) => o.matchScore >= 10);
      const finalOffers = filtered.length >= 3 ? filtered : deduped;

      finalOffers.sort((a, b) => b.matchScore - a.matchScore || a.price - b.price);
      assignTags(finalOffers);

      if (DEBUG_MATCH) {
        finalOffers.forEach((o) => {
          const bd = o.scoreBreakdown ?? {};
          console.log(
            `[FLIGHT] ${o.airline} ${o.stops === 0 ? 'direct' : `${o.stops}s`} €${o.price} | score: ${o.matchScore} | ${JSON.stringify(bd)}`,
          );
        });
      }

      await writeCache(cacheKey, finalOffers);
      if (__DEV__) console.log(`[duffel] ${finalOffers.length} offers (${rawOffers.length} raw, ${deduped.length} deduped)`);
      return finalOffers;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (__DEV__) console.warn(`[duffel] attempt ${attempt + 1} failed:`, lastError.message);
      if (err instanceof DuffelError && (err.statusCode ?? 0) >= 400 && (err.statusCode ?? 0) < 500) {
        throw err;
      }
    }
  }

  throw lastError ?? new DuffelError('Unknown error');
}
