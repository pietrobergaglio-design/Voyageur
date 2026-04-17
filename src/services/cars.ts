import type { CarOffer, SearchParams, MatchTag } from '../types/booking';
import type { OnboardingData } from '../stores/useAppStore';

// Booking.com car rental API returns status:false on free tier — using smart mock.

const CAR_TEMPLATES = [
  { name: 'Toyota Yaris', category: 'Economy', transmission: 'manual' as const, seats: 5, doors: 4, hasAC: true, basePerDay: 38 },
  { name: 'Volkswagen Golf', category: 'Compact', transmission: 'manual' as const, seats: 5, doors: 4, hasAC: true, basePerDay: 52 },
  { name: 'Toyota Corolla', category: 'Compact', transmission: 'automatic' as const, seats: 5, doors: 4, hasAC: true, basePerDay: 58 },
  { name: 'Nissan Qashqai', category: 'SUV', transmission: 'automatic' as const, seats: 5, doors: 5, hasAC: true, basePerDay: 78 },
  { name: 'Toyota Alphard', category: 'Minivan', transmission: 'automatic' as const, seats: 7, doors: 4, hasAC: true, basePerDay: 110 },
  { name: 'Mercedes C-Class', category: 'Premium', transmission: 'automatic' as const, seats: 5, doors: 4, hasAC: true, basePerDay: 145 },
] as const;

const COMPANIES = [
  { name: 'Hertz', logoUrl: undefined },
  { name: 'Budget', logoUrl: undefined },
  { name: 'Sixt', logoUrl: undefined },
  { name: 'Europcar', logoUrl: undefined },
  { name: 'Enterprise', logoUrl: undefined },
  { name: 'Avis', logoUrl: undefined },
] as const;

function calcCarMatchScore(
  pricePerDay: number,
  transmission: 'automatic' | 'manual',
  category: string,
  profile: OnboardingData,
): number {
  let score = 65;

  if (profile.budget <= 30 && pricePerDay < 50) score += 15;
  else if (profile.budget >= 70 && (category === 'Premium' || category === 'SUV')) score += 15;
  else if (pricePerDay >= 40 && pricePerDay <= 90) score += 8;

  // Most travelers prefer automatic for unfamiliar roads
  if (transmission === 'automatic') score += 5;

  if (category === 'SUV' || category === 'Compact') score += 5;

  return Math.min(99, score);
}

function assignCarTags(cars: CarOffer[]): void {
  if (cars.length === 0) return;
  const best = cars.reduce((b, c) => c.matchScore > b.matchScore ? c : b, cars[0]);
  best.tags.push('best_match');
  const cheapest = cars.reduce((b, c) => c.totalPrice < b.totalPrice ? c : b, cars[0]);
  if (cheapest.id !== best.id) cheapest.tags.push('cheapest');
}

// Deterministic but destination-sensitive seed
function seededVariant(seed: string, index: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h + index * 137) % 100;
}

export function generateMockCars(params: SearchParams, profile: OnboardingData): CarOffer[] {
  const days = Math.max(1, Math.round(
    (params.checkOut.getTime() - params.checkIn.getTime()) / 86_400_000,
  ));
  const city = params.destination.split(',')[0].trim();
  const seed = `${city}_${days}`;

  const cars: CarOffer[] = CAR_TEMPLATES.map((tmpl, idx) => {
    const company = COMPANIES[(seededVariant(seed, idx) + idx) % COMPANIES.length];
    const priceVariance = 0.85 + (seededVariant(seed, idx + 10) / 100) * 0.35;
    const pricePerDay = Math.round(tmpl.basePerDay * priceVariance);
    const totalPrice = pricePerDay * days;
    const matchScore = calcCarMatchScore(pricePerDay, tmpl.transmission, tmpl.category, profile);

    return {
      id: `CAR_${idx + 1}_${seed}`,
      provider: 'mock',
      name: tmpl.name,
      category: tmpl.category,
      company: company.name,
      companyLogoUrl: company.logoUrl,
      pricePerDay,
      totalPrice,
      currency: 'EUR',
      days,
      transmission: tmpl.transmission,
      seats: tmpl.seats,
      doors: tmpl.doors,
      hasAC: tmpl.hasAC,
      freeKm: idx < 4 ? 'unlimited' : 'limited',
      pickupLocation: `${city} Airport`,
      insuranceIncluded: idx % 2 === 0,
      refundPolicy: idx === 0 ? 'flexible' : idx === 1 ? 'moderate' : 'strict',
      matchScore,
      tags: [] as MatchTag[],
    };
  });

  cars.sort((a, b) => b.matchScore - a.matchScore);
  assignCarTags(cars);
  return cars;
}
