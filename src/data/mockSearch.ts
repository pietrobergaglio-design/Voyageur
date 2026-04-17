import type {
  FlightOffer,
  HotelOffer,
  TransportOffer,
  ActivityOffer,
  InsurancePlan,
  VisaInfo,
  SearchResults,
  SearchParams,
} from '../types/booking';

// ─── Mock Flights (provider: Duffel) ─────────────────────────────────────────

export const mockFlights: FlightOffer[] = [
  {
    id: 'FL001',
    provider: 'duffel',
    airline: 'ITA Airways',
    airlineCode: 'AZ',
    segments: [
      {
        origin: 'MXP',
        destination: 'NRT',
        departureAt: '2026-07-15T10:30:00',
        arrivalAt: '2026-07-16T07:20:00',
        durationMinutes: 740,
        flightNumber: 'AZ788',
        aircraft: 'Boeing 777-200',
      },
    ],
    stops: 0,
    price: 845,
    currency: 'EUR',
    refundPolicy: 'flexible',
    matchScore: 94,
    tags: ['best_match'],
    cabin: 'economy',
    baggageIncluded: true,
  },
  {
    id: 'FL002',
    provider: 'duffel',
    airline: 'Lufthansa + ANA',
    airlineCode: 'LH',
    segments: [
      {
        origin: 'MXP',
        destination: 'FRA',
        departureAt: '2026-07-15T07:15:00',
        arrivalAt: '2026-07-15T09:00:00',
        durationMinutes: 105,
        flightNumber: 'LH1932',
        aircraft: 'Airbus A320',
      },
      {
        origin: 'FRA',
        destination: 'NRT',
        departureAt: '2026-07-15T11:30:00',
        arrivalAt: '2026-07-16T07:55:00',
        durationMinutes: 685,
        flightNumber: 'NH204',
        aircraft: 'Boeing 787-9',
      },
    ],
    stops: 1,
    price: 612,
    currency: 'EUR',
    refundPolicy: 'moderate',
    matchScore: 81,
    tags: ['cheapest'],
    cabin: 'economy',
    baggageIncluded: true,
  },
  {
    id: 'FL003',
    provider: 'duffel',
    airline: 'Japan Airlines',
    airlineCode: 'JL',
    segments: [
      {
        origin: 'MXP',
        destination: 'NRT',
        departureAt: '2026-07-15T13:45:00',
        arrivalAt: '2026-07-16T10:10:00',
        durationMinutes: 745,
        flightNumber: 'JL044',
        aircraft: 'Boeing 787-9',
      },
    ],
    stops: 0,
    price: 2240,
    currency: 'EUR',
    refundPolicy: 'flexible',
    matchScore: 88,
    tags: ['premium'],
    cabin: 'business',
    baggageIncluded: true,
  },
];

// ─── Mock Hotels (provider: Expedia) ─────────────────────────────────────────

export const mockHotels: HotelOffer[] = [
  {
    id: 'HT001',
    provider: 'expedia',
    name: 'Park Hyatt Tokyo',
    zone: 'Shinjuku',
    stars: 5,
    pricePerNight: 480,
    totalPrice: 3360,
    currency: 'EUR',
    refundPolicy: 'flexible',
    matchScore: 92,
    tags: ['best_match'],
    amenities: ['Piscina', 'Spa', 'Palestra', 'Ristorante', 'Bar panoramico'],
  },
  {
    id: 'HT002',
    provider: 'expedia',
    name: 'Aman Tokyo',
    zone: 'Otemachi',
    stars: 5,
    pricePerNight: 920,
    totalPrice: 6440,
    currency: 'EUR',
    refundPolicy: 'moderate',
    matchScore: 85,
    tags: ['premium'],
    amenities: ['Spa', 'Piscina indoor', 'Sala meditazione', 'Ristorante kaiseki'],
  },
  {
    id: 'HT003',
    provider: 'expedia',
    name: 'Apartment Shibuya Modern',
    zone: 'Shibuya',
    stars: 4,
    pricePerNight: 140,
    totalPrice: 980,
    currency: 'EUR',
    refundPolicy: 'strict',
    matchScore: 76,
    tags: ['cheapest'],
    amenities: ['Cucina completa', 'Lavatrice', 'WiFi', 'Smart TV'],
  },
];

// ─── Mock Transports (provider: Expedia / local) ──────────────────────────────

export const mockTransports: TransportOffer[] = [
  {
    id: 'TR001',
    provider: 'expedia',
    type: 'car_rental',
    name: 'Budget · Toyota Corolla',
    description: 'Auto economica con navigatore, assicurazione inclusa',
    pricePerDay: 65,
    totalPrice: 455,
    currency: 'EUR',
    refundPolicy: 'flexible',
    tags: [],
    highlights: ['Navigatore GPS', 'Assicurazione base', 'Km illimitati'],
  },
  {
    id: 'TR002',
    provider: 'local',
    type: 'rail_pass',
    name: 'JR Pass 7 giorni',
    description: 'Shinkansen + treni regionali illimitati in tutto il Giappone',
    totalPrice: 390,
    currency: 'EUR',
    refundPolicy: 'strict',
    tags: ['best_match'],
    highlights: ['Shinkansen incluso', 'Tutte le linee JR', 'Incluso Narita Express'],
  },
];

// ─── Mock Activities (provider: Viator) ──────────────────────────────────────

export const mockActivities: ActivityOffer[] = [
  {
    id: 'AC001',
    provider: 'viator',
    name: 'teamLab Borderless',
    emoji: '🎨',
    suggestedDay: 'Giorno 2',
    durationHours: 3,
    price: 32,
    currency: 'EUR',
    matchScore: 97,
    tags: ['best_match'],
    highlights: ['Prenotazione prioritaria', 'Guida in italiano', 'Foto incluse'],
  },
  {
    id: 'AC002',
    provider: 'viator',
    name: 'Tsukiji Market Tour + colazione',
    emoji: '🐟',
    suggestedDay: 'Giorno 1',
    durationHours: 2.5,
    price: 48,
    currency: 'EUR',
    matchScore: 91,
    tags: ['best_match'],
    highlights: ['Guida madrelingua', 'Degustazioni incluse', 'Piccolo gruppo'],
  },
  {
    id: 'AC003',
    provider: 'viator',
    name: 'Fuji e Hakone · Day Trip',
    emoji: '🗻',
    suggestedDay: 'Giorno 4',
    durationHours: 10,
    price: 89,
    currency: 'EUR',
    matchScore: 88,
    tags: [],
    highlights: ['Pullman A/R', 'Ropeway inclusa', 'Onsen opzionale'],
  },
  {
    id: 'AC004',
    provider: 'viator',
    name: 'Torneo di Sumo · Posti premium',
    emoji: '🏆',
    suggestedDay: 'Giorno 3',
    durationHours: 4,
    price: 75,
    currency: 'EUR',
    matchScore: 82,
    tags: [],
    highlights: ['Posti ringside', 'Spiegazione in italiano', 'Meet & greet'],
  },
  {
    id: 'AC005',
    provider: 'viator',
    name: 'Tokyo Street Food Walk · Asakusa',
    emoji: '🍜',
    suggestedDay: 'Giorno 5',
    durationHours: 3,
    price: 55,
    currency: 'EUR',
    matchScore: 93,
    tags: ['best_match'],
    highlights: ['10+ assaggi', 'Guida locale', 'Senza allergeni su richiesta'],
  },
];

// ─── Mock Insurance (provider: Qover) ────────────────────────────────────────

export const mockInsurance: InsurancePlan[] = [
  {
    id: 'IN001',
    provider: 'qover',
    name: 'Qover Essential',
    planType: 'essential',
    coverageItems: ['Annullamento viaggio', 'Spese mediche base (€50k)', 'Bagaglio (€500)'],
    price: 42,
    currency: 'EUR',
    tags: [],
    highlights: ['Copertura di base', 'Rimborso entro 7 giorni'],
  },
  {
    id: 'IN002',
    provider: 'qover',
    name: 'Qover Plus',
    planType: 'plus',
    coverageItems: [
      'Annullamento viaggio',
      'Spese mediche (€150k)',
      'Bagaglio (€1.500)',
      'Ritardo volo',
      'Assistenza 24/7',
    ],
    price: 78,
    currency: 'EUR',
    tags: ['most_popular'],
    highlights: ['Copertura completa', 'Assistenza telefonica H24', 'App sinistri'],
  },
  {
    id: 'IN003',
    provider: 'qover',
    name: 'Qover Premium',
    planType: 'premium',
    coverageItems: [
      'Annullamento per qualsiasi motivo',
      'Spese mediche (€500k)',
      'Bagaglio (€3.000)',
      'Ritardo volo + alloggio',
      'Sport estremi inclusi',
      'Evacuazione medica',
    ],
    price: 134,
    currency: 'EUR',
    tags: ['high_coverage'],
    highlights: ['Massima protezione', 'Sport estremi', 'Rimborso integrale'],
  },
];

// ─── Mock Visa ────────────────────────────────────────────────────────────────

export const mockVisa: VisaInfo = {
  destination: 'Giappone',
  forNationality: 'IT',
  status: 'not_required',
  details:
    'I cittadini italiani non necessitano di visto per soggiorni turistici fino a 90 giorni.',
};

// ─── Mock Search Results ──────────────────────────────────────────────────────

export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  origin: 'Milano, Italia',
  originCode: 'MXP',
  destination: 'Tokyo, Giappone',
  destinationCode: 'NRT',
  checkIn: new Date(2026, 6, 15),
  checkOut: new Date(2026, 6, 22),
  travelers: 2,
};

export function getMockResults(params: SearchParams): SearchResults {
  return {
    params,
    flights: mockFlights,
    hotels: mockHotels,
    transports: mockTransports,
    activities: mockActivities,
    insurance: mockInsurance,
    visa: mockVisa,
  };
}
