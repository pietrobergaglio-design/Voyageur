import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaceSuggestion } from '../types/places';
import { searchCitiesFallback } from '../data/cities-fallback';

const DUFFEL_API_KEY = process.env.EXPO_PUBLIC_DUFFEL_API_KEY ?? '';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const CACHE_PREFIX = 'places_cache_';

interface CacheEntry {
  results: PlaceSuggestion[];
  timestamp: number;
}

async function getCached(query: string): Promise<PlaceSuggestion[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + query);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.results;
  } catch {
    return null;
  }
}

async function setCached(query: string, results: PlaceSuggestion[]): Promise<void> {
  try {
    const entry: CacheEntry = { results, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + query, JSON.stringify(entry));
  } catch {
    // ignore cache write failures
  }
}

function countryCodeToFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('');
}

function parseDuffelSuggestions(data: unknown[]): PlaceSuggestion[] {
  const results: PlaceSuggestion[] = [];

  for (const item of data) {
    const d = item as Record<string, unknown>;
    const type = d['type'] as string;

    if (type === 'city') {
      const airports = ((d['airports'] as unknown[]) ?? []).map((a) => {
        const airport = a as Record<string, unknown>;
        return {
          id: airport['id'] as string,
          name: airport['name'] as string,
          iataCode: airport['iata_code'] as string,
        };
      });

      results.push({
        id: d['id'] as string,
        type: 'city',
        name: d['name'] as string,
        iataCode: airports[0]?.iataCode ?? (d['iata_code'] as string) ?? '',
        country: (d['country'] as Record<string, string>)?.['name'] ?? '',
        countryFlag: countryCodeToFlag(
          (d['country'] as Record<string, string>)?.['iata_country_code'] ?? ''
        ),
        cityName: d['name'] as string,
        airports,
      });
    } else if (type === 'airport') {
      results.push({
        id: d['id'] as string,
        type: 'airport',
        name: d['name'] as string,
        iataCode: d['iata_code'] as string,
        country: (d['country'] as Record<string, string>)?.['name'] ?? '',
        countryFlag: countryCodeToFlag(
          (d['country'] as Record<string, string>)?.['iata_country_code'] ?? ''
        ),
        cityName: (d['city'] as Record<string, string>)?.['name'] ?? (d['name'] as string),
      });
    }
  }

  return results.slice(0, 8);
}

const activeControllers = new Map<string, AbortController>();

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.length < 2) return [];

  const normalizedQuery = query.trim().toLowerCase();

  const cached = await getCached(normalizedQuery);
  if (cached) return cached;

  // Cancel any pending request for a different query
  for (const [key, controller] of activeControllers) {
    if (key !== normalizedQuery) {
      controller.abort();
      activeControllers.delete(key);
    }
  }

  if (!DUFFEL_API_KEY) {
    const fallback = searchCitiesFallback(query);
    return fallback;
  }

  const controller = new AbortController();
  activeControllers.set(normalizedQuery, controller);

  try {
    const url = `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        Accept: 'application/json',
      },
    });

    activeControllers.delete(normalizedQuery);

    if (!response.ok) {
      return searchCitiesFallback(query);
    }

    const json = await response.json();
    const results = parseDuffelSuggestions((json?.data as unknown[]) ?? []);
    await setCached(normalizedQuery, results);
    return results;
  } catch (err: unknown) {
    activeControllers.delete(normalizedQuery);
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    return searchCitiesFallback(query);
  }
}
