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

export type PropertyType =
  | 'hotel'
  | 'apartment'
  | 'hostel'
  | 'guesthouse'
  | 'resort'
  | 'boutique'
  | 'bnb'
  | 'unknown';

/** Per-component breakdown used by DEBUG_MATCH logging. */
export type ScoreBreakdown = Record<string, number>;

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
  scoreBreakdown?: ScoreBreakdown;
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
  propertyType: PropertyType;
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
  scoreBreakdown?: ScoreBreakdown;
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
  categories: string[];
  matchScore: number;
  scoreBreakdown?: ScoreBreakdown;
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
  returnOriginCode?: string; // for open-jaw multi-city: last stop's IATA → origin
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

// ─── FlightDirectionGroup ─────────────────────────────────────────────────────

export interface FlightDirectionGroup {
  key: string;
  airline: string;
  segments: FlightSegment[];
  stops: number;
  durationMinutes: number;
  departureAt: string;
  arrivalAt: string;
  estimatedPrice: number;
  offerIds: string[];
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

// ─── Unified BookingItem ───────────────────────────────────────────────────────

export type BookingType = 'flight' | 'hotel' | 'activity' | 'car' | 'insurance' | 'visa' | 'transfer';
export type BookingStatus = 'selected' | 'booked' | 'cancelled';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type BaggageLevel = 'full' | 'cabin' | 'none';

export interface BookingItem {
  id: string;
  type: BookingType;
  status: BookingStatus;

  // Core presentation
  title: string;
  provider: string;
  price: number;
  currency: string;
  photos: string[];
  description?: string;
  rating?: number;
  reviewCount?: number;

  // Timing (essential for itinerary)
  timing: {
    startDate: string;            // ISO date "YYYY-MM-DD"
    endDate?: string;
    startTime?: string;           // "HH:MM"
    endTime?: string;
    dayOffset?: number;           // +1 if arrival is day after departure
    timeOfDay?: TimeOfDay;
    duration?: string;            // human label "2h10", "Full day"
  };

  // Flight-specific
  flight?: {
    airline: string;
    flightNumber: string;
    origin: string;               // IATA code
    originName: string;
    destination: string;
    destinationName: string;
    direction?: 'outbound' | 'return';
    stops: {
      location: string;           // IATA
      locationName: string;
      durationMin: number;
    }[];
    baggage: {
      cabin: boolean;
      checked: boolean;
      description: string;        // "Bagaglio incluso" / "Solo mano"
    };
  };

  // Hotel-specific
  hotel?: {
    address: string;
    coordinates?: { lat: number; lng: number };
    amenities: string[];
    checkinTime: string;          // "15:00"
    checkoutTime: string;         // "11:00"
    roomType?: string;
    nights: number;
  };

  // Activity-specific
  activity?: {
    meetingPoint?: string;
    category?: string;
    durationMin?: number;
  };

  // Car rental-specific
  car?: {
    company: string;
    carType: string;
    pickupLocation: string;
    pickupTime: string;
    returnLocation: string;
    returnTime: string;
  };

  // Insurance-specific
  insurance?: {
    plan: 'Essential' | 'Plus' | 'Complete';
    coverage: string[];
    medicalLimit: number;
  };

  // Visa-specific
  visa?: {
    type: 'visa_free' | 'eta' | 'evisa' | 'embassy';
    stayDays: number;
  };

  // Transfer between cities (multi-city)
  transfer?: {
    from: string;
    to: string;
    mode: 'train' | 'flight' | 'bus' | 'car';
    modeLabel: string;            // "Shinkansen", "Frecciarossa"
    durationMin: number;
    priceEstimate: number;
  };

  // Refund policy (for Documents tab + semaphore badge)
  refund: {
    refundable: boolean;
    fullRefundDeadline?: string;          // ISO — 100% refund before this date
    partialRefundDeadline?: string;       // ISO — partial refund before this date
    partialRefundPercentage?: number;     // e.g. 50
    description: string;                  // user-friendly text
  };

  // Operational data (Documents tab)
  confirmation?: {
    code?: string;
    qrData?: string;
    barcodeData?: string;
    pdfUrl?: string;
    emailSentTo?: string;
    notes?: string;
  };

  // City reference for multi-city (null = trip-level like intercontinental flight, insurance)
  cityId?: string;

  // Original API payload for debugging
  rawData?: unknown;
}

export interface BookingSummary {
  total: number;
  currency: string;
  byType: Partial<Record<BookingType, { count: number; total: number }>>;
  byCity?: Record<string, { count: number; total: number }>;
}
