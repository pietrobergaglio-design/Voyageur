// ─── Shared ──────────────────────────────────────────────────────────────────

export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY';

export type RefundPolicy = 'flexible' | 'moderate' | 'strict';

export type MatchTag =
  | 'best_match'
  | 'cheapest'
  | 'fastest'
  | 'premium'
  | 'most_popular'
  | 'high_coverage';

// ─── Flight ──────────────────────────────────────────────────────────────────

export interface FlightSegment {
  origin: string;           // IATA code, e.g. 'MXP'
  destination: string;      // IATA code, e.g. 'NRT'
  departureAt: string;      // ISO 8601
  arrivalAt: string;        // ISO 8601
  durationMinutes: number;
  flightNumber: string;
  aircraft?: string;
}

export interface BaggageAllowance {
  type: 'checked' | 'carry_on';
  quantity: number;
}

export interface FlightOffer {
  id: string;
  provider: 'duffel';
  airline: string;
  airlineCode: string;
  logoUrl?: string;
  segments: FlightSegment[];
  stops: number;
  stopoverCities?: string[];
  /** Total door-to-door minutes including layovers (from slice.duration). */
  totalDurationMinutes?: number;
  price: number;
  currency: Currency;
  refundPolicy: RefundPolicy;
  matchScore: number;
  tags: MatchTag[];
  cabin: 'economy' | 'premium_economy' | 'business' | 'first';
  baggageIncluded: boolean;
  baggage?: BaggageAllowance[];
  rawOffer?: unknown;
}

// ─── Hotel ───────────────────────────────────────────────────────────────────

export interface HotelOffer {
  id: string;
  provider: 'expedia' | 'booking';
  name: string;
  zone: string;
  stars: 0 | 1 | 2 | 3 | 4 | 5;
  thumbnailUrl?: string;
  photoUrls?: string[];
  rating?: number;
  reviewCount?: number;
  reviewWord?: string;
  hasFreeCancellation?: boolean;
  originalPrice?: number;
  pricePerNight: number;
  totalPrice: number;
  currency: Currency;
  refundPolicy: RefundPolicy;
  matchScore: number;
  tags: MatchTag[];
  amenities: string[];
  rawHotel?: unknown;
}

// ─── Car Rental ──────────────────────────────────────────────────────────────

export interface CarOffer {
  id: string;
  provider: 'booking_cars' | 'mock';
  name: string;             // "Toyota Yaris"
  category: string;         // "Economy", "Compact", "SUV"
  company: string;          // "Hertz", "Budget", "Sixt"
  companyLogoUrl?: string;
  imageUrl?: string;
  pricePerDay: number;
  totalPrice: number;
  currency: Currency;
  days: number;
  transmission: 'automatic' | 'manual';
  seats: number;
  doors: number;
  hasAC: boolean;
  freeKm: 'unlimited' | 'limited';
  pickupLocation: string;
  insuranceIncluded: boolean;
  refundPolicy: RefundPolicy;
  matchScore: number;
  tags: MatchTag[];
  rawOffer?: unknown;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface ActivityOffer {
  id: string;
  provider: 'viator' | 'booking_attractions';
  name: string;
  slug?: string;
  emoji?: string;
  shortDescription?: string;
  suggestedDay?: string;
  durationHours: number;
  durationLabel?: string;   // "3 ore", "Giornata intera"
  price: number;
  currency: Currency;
  rating?: number;
  reviewCount?: number;
  thumbnailUrl?: string;
  photoUrls?: string[];
  hasFreeCancellation?: boolean;
  matchScore: number;
  tags: MatchTag[];
  highlights: string[];
  rawOffer?: unknown;
}

// ─── Insurance ───────────────────────────────────────────────────────────────

export interface InsurancePlan {
  id: string;
  provider: 'qover';
  name: string;
  planType: 'essential' | 'plus' | 'premium';
  coverageItems: string[];
  price: number;
  currency: Currency;
  tags: MatchTag[];
  highlights: string[];
}

// ─── Visa ────────────────────────────────────────────────────────────────────

export type VisaStatus = 'not_required' | 'evisa' | 'on_arrival' | 'required';

export interface VisaInfo {
  destination: string;
  destinationFlag?: string;
  forNationality: string;
  status: VisaStatus;
  statusLabel: string;      // "✅ Non richiesto" | "🟡 eVisa" | "🔴 Visto richiesto"
  details: string;
  requirements?: string[];
  processingDays?: number;
  fee?: number;
  feeCurrency?: Currency;
  link?: string;
  applyLink?: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchParams {
  origin: string;
  originCode: string;
  destination: string;
  destinationCode?: string;
  checkIn: Date;
  checkOut: Date;
  travelers: number;
}

export interface SearchResults {
  params: SearchParams;
  flights: FlightOffer[];
  hotels: HotelOffer[];
  cars: CarOffer[];
  activities: ActivityOffer[];
  insurance: InsurancePlan[];
  visa?: VisaInfo;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export type CartItemType = 'flight' | 'hotel' | 'car' | 'activity' | 'insurance';

export interface CartItem {
  type: CartItemType;
  offerId: string;
  name: string;
  price: number;
  currency: Currency;
}

export interface CartState {
  items: CartItem[];
  totalPrice: number;
  currency: Currency;
}
