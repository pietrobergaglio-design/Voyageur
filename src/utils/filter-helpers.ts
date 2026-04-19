import type { HotelOffer, ActivityOffer, CarOffer, InsurancePlan } from '../types/booking';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterOption {
  key: string;
  label: string;
  count: number;
}

// ─── Brand detection ──────────────────────────────────────────────────────────

const HOTEL_BRANDS = [
  'Marriott', 'Hilton', 'Hyatt', 'Four Seasons', 'Mandarin',
  'Aman', 'Ritz-Carlton', 'Sheraton', 'Westin', 'Novotel',
  'ibis', 'InterContinental', 'Holiday Inn', 'Crowne Plaza',
  'Renaissance', 'Le Méridien',
];

export function detectHotelBrand(hotel: HotelOffer): string {
  const name = hotel.name.toLowerCase();
  for (const brand of HOTEL_BRANDS) {
    if (name.includes(brand.toLowerCase())) return brand;
  }
  const typeMap: Record<string, string> = {
    boutique: 'Boutique',
    resort: 'Resort',
    hostel: 'Hostel',
    apartment: 'Appartamento',
    bnb: 'B&B',
    guesthouse: 'Guesthouse',
  };
  return typeMap[hotel.propertyType] ?? 'Indipendente';
}

export function detectActivityProvider(activity: ActivityOffer): string {
  const providerMap: Record<string, string> = {
    viator: 'Viator',
    booking_attractions: 'Booking.com',
  };
  if (activity.provider in providerMap) return providerMap[activity.provider as string];
  const cat = activity.categories[0];
  if (!cat) return 'Altri';
  const catMap: Record<string, string> = {
    tours: 'Tours', food: 'Food', culture: 'Cultura',
    adventure: 'Avventura', nature: 'Natura', art: 'Arte',
  };
  return catMap[cat.toLowerCase()] ?? cat;
}

export function detectCarCompany(car: CarOffer): string {
  return car.company.trim() || 'Altro';
}

export function detectInsuranceBrand(plan: InsurancePlan): string {
  const providerMap: Record<string, string> = {
    qover: 'Qover',
    allianz: 'Allianz',
    'world-nomads': 'World Nomads',
  };
  const typeLabel: Record<string, string> = {
    essential: 'Essential',
    plus: 'Plus',
    premium: 'Premium',
  };
  const provider = providerMap[plan.provider] ?? plan.provider;
  const type = typeLabel[plan.planType] ?? plan.planType;
  return `${provider} ${type}`;
}

// ─── Filter option builders ───────────────────────────────────────────────────

function buildOptions<T>(
  items: T[],
  extractKey: (item: T) => string,
  sortByCount = true,
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = extractKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const opts: FilterOption[] = Array.from(counts.entries()).map(([key, count]) => ({
    key,
    label: key,
    count,
  }));
  if (sortByCount) opts.sort((a, b) => b.count - a.count);
  return opts;
}

export function extractHotelBrands(hotels: HotelOffer[]): FilterOption[] {
  return buildOptions(hotels, detectHotelBrand);
}

export function extractActivityProviders(activities: ActivityOffer[]): FilterOption[] {
  return buildOptions(activities, detectActivityProvider);
}

export function extractCarCompanies(cars: CarOffer[]): FilterOption[] {
  return buildOptions(cars, detectCarCompany);
}

export function extractInsuranceBrands(plans: InsurancePlan[]): FilterOption[] {
  return buildOptions(plans, detectInsuranceBrand);
}

// ─── Filter application ───────────────────────────────────────────────────────

function matchesQuery(fields: string[], query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return fields.some((f) => f.toLowerCase().includes(q));
}

function matchesChips<T>(
  item: T,
  activeFilters: string[],
  extractKey: (item: T) => string,
): boolean {
  if (activeFilters.length === 0) return true;
  return activeFilters.includes(extractKey(item));
}

export function filterHotels(
  hotels: HotelOffer[],
  query: string,
  activeFilters: string[],
): HotelOffer[] {
  return hotels.filter((h) =>
    matchesQuery([h.name, h.zone, h.propertyType], query) &&
    matchesChips(h, activeFilters, detectHotelBrand),
  );
}

export function filterActivities(
  activities: ActivityOffer[],
  query: string,
  activeFilters: string[],
): ActivityOffer[] {
  return activities.filter((a) =>
    matchesQuery([a.name, a.shortDescription ?? '', ...a.categories], query) &&
    matchesChips(a, activeFilters, detectActivityProvider),
  );
}

export function filterCars(
  cars: CarOffer[],
  query: string,
  activeFilters: string[],
): CarOffer[] {
  return cars.filter((c) =>
    matchesQuery([c.name, c.company, c.category], query) &&
    matchesChips(c, activeFilters, detectCarCompany),
  );
}

export function filterInsurance(
  plans: InsurancePlan[],
  query: string,
  activeFilters: string[],
): InsurancePlan[] {
  return plans.filter((p) =>
    matchesQuery([p.name, p.provider, p.planType, ...p.coverageItems], query) &&
    matchesChips(p, activeFilters, detectInsuranceBrand),
  );
}
