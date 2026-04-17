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
  /** Total door-to-door minutes including layovers (from slice.duration). Preferred over summing segment durations. */
  totalDurationMinutes?: number;
  price: number;
  currency: Currency;
  refundPolicy: RefundPolicy;
  matchScore: number;         // 0-100
  tags: MatchTag[];
  cabin: 'economy' | 'premium_economy' | 'business' | 'first';
  baggageIncluded: boolean;
  baggage?: BaggageAllowance[];
  rawOffer?: unknown;
}

// ─── Hotel ───────────────────────────────────────────────────────────────────

export interface HotelOffer {
  id: string;
  provider: 'expedia';
  name: string;
  zone: string;
  stars: 1 | 2 | 3 | 4 | 5;
  thumbnailUrl?: string;
  pricePerNight: number;
  totalPrice: number;
  currency: Currency;
  refundPolicy: RefundPolicy;
  matchScore: number;
  tags: MatchTag[];
  amenities: string[];
}

// ─── Transport ───────────────────────────────────────────────────────────────

export type TransportType = 'car_rental' | 'rail_pass' | 'shuttle' | 'ferry';

export interface TransportOffer {
  id: string;
  provider: 'expedia' | 'local';
  type: TransportType;
  name: string;
  description: string;
  pricePerDay?: number;
  totalPrice: number;
  currency: Currency;
  refundPolicy: RefundPolicy;
  tags: MatchTag[];
  highlights: string[];
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface ActivityOffer {
  id: string;
  provider: 'viator';
  name: string;
  emoji: string;
  suggestedDay: string;       // e.g. 'Giorno 1'
  durationHours: number;
  price: number;
  currency: Currency;
  matchScore: number;
  tags: MatchTag[];
  highlights: string[];
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
  forNationality: string;
  status: VisaStatus;
  details: string;
  processingDays?: number;
  fee?: number;
  feeCurrency?: Currency;
  link?: string;
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
  transports: TransportOffer[];
  activities: ActivityOffer[];
  insurance: InsurancePlan[];
  visa?: VisaInfo;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export type CartItemType = 'flight' | 'hotel' | 'transport' | 'activity' | 'insurance';

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
