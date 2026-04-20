import type {
  FlightOffer,
  HotelOffer,
  ActivityOffer,
  CarOffer,
  InsurancePlan,
  VisaInfo,
  RefundPolicy,
  SearchParams,
} from '../types/booking';
import type { FlightDirectionGroup } from '../types/booking';
import type { TransportSuggestion } from '../types/multi-city';
import type {
  BookingItem,
  BookingType,
  TimeOfDay,
} from '../types/booking';
import {
  HOTEL_DEFAULT_CHECKIN_TIME,
  HOTEL_DEFAULT_CHECKOUT_TIME,
  CAR_DEFAULT_PICKUP_TIME,
  CAR_DEFAULT_RETURN_TIME,
} from '../constants/booking-defaults';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function timeOfDayFromIso(isoOrTime: string | undefined): TimeOfDay | undefined {
  if (!isoOrTime) return undefined;
  const hour = new Date(isoOrTime).getHours();
  if (isNaN(hour)) return undefined;
  return timeOfDayFromHour(hour);
}

function hhmmFromIso(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateStringFromIso(iso: string | undefined): string {
  if (!iso) return new Date().toISOString().split('T')[0];
  // Handle both full ISO and "YYYY-MM-DD"
  return iso.split('T')[0];
}

function daysBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000));
}

function refundFromPolicy(policy: RefundPolicy, departureIso?: string): BookingItem['refund'] {
  switch (policy) {
    case 'flexible':
      return {
        refundable: true,
        fullRefundDeadline: departureIso
          ? new Date(new Date(departureIso).getTime() - 30 * 86_400_000).toISOString()
          : undefined,
        description: 'Rimborso gratuito entro 30 giorni dalla partenza',
      };
    case 'moderate':
      return {
        refundable: true,
        fullRefundDeadline: departureIso
          ? new Date(new Date(departureIso).getTime() - 7 * 86_400_000).toISOString()
          : undefined,
        partialRefundDeadline: departureIso
          ? new Date(new Date(departureIso).getTime() - 2 * 86_400_000).toISOString()
          : undefined,
        partialRefundPercentage: 50,
        description: 'Rimborso completo entro 7 giorni, parziale entro 48h',
      };
    case 'strict':
    default:
      return {
        refundable: false,
        description: 'Non rimborsabile',
      };
  }
}

// ─── IATA → city name (best effort) ──────────────────────────────────────────

const IATA_TO_CITY: Record<string, string> = {
  MXP: 'Milano', FCO: 'Roma', NRT: 'Tokyo', HND: 'Tokyo', KIX: 'Osaka',
  ITM: 'Osaka', NGO: 'Nagoya', CTS: 'Sapporo', FUK: 'Fukuoka',
  JFK: 'New York', LHR: 'Londra', CDG: 'Parigi', BCN: 'Barcellona',
  MAD: 'Madrid', AMS: 'Amsterdam', DXB: 'Dubai', BKK: 'Bangkok',
  SIN: 'Singapore', HKG: 'Hong Kong', ICN: 'Seoul', PEK: 'Pechino',
  PVG: 'Shanghai', SYD: 'Sydney', LAX: 'Los Angeles', SFO: 'San Francisco',
  ORD: 'Chicago', MIA: 'Miami', YYZ: 'Toronto', DOH: 'Doha', IST: 'Istanbul',
  VIE: 'Vienna', ZRH: 'Zurigo', FRA: 'Francoforte', MUC: 'Monaco',
  BRU: 'Bruxelles', LIS: 'Lisbona', ATH: 'Atene',
};

function iataToCity(iata: string): string {
  return IATA_TO_CITY[iata.toUpperCase()] ?? iata;
}

// ─── Flight ───────────────────────────────────────────────────────────────────

/**
 * Convert a FlightDirectionGroup (outbound or return) to a BookingItem.
 * Pass the matched FlightOffer for baggage and refund data.
 */
export function flightDirectionGroupToBookingItem(
  group: FlightDirectionGroup,
  direction: 'outbound' | 'return',
  offer: FlightOffer | null,
): BookingItem {
  const firstSeg = group.segments[0];
  const lastSeg = group.segments[group.segments.length - 1];

  const depDate = dateStringFromIso(group.departureAt);
  const arrDate = dateStringFromIso(group.arrivalAt);
  const dayOffset = arrDate > depDate ? 1 : 0;

  const depHour = new Date(group.departureAt).getHours();
  const timeOfDay = isNaN(depHour) ? undefined : timeOfDayFromHour(depHour);

  const stops = group.stops > 0
    ? group.segments.slice(0, -1).map((seg, i) => {
        const nextSeg = group.segments[i + 1];
        const layoverMs = nextSeg
          ? new Date(nextSeg.departureAt).getTime() - new Date(seg.arrivalAt).getTime()
          : 0;
        return {
          location: seg.destination,
          locationName: iataToCity(seg.destination),
          durationMin: Math.max(0, Math.round(layoverMs / 60_000)),
        };
      })
    : [];

  const hasChecked = offer?.baggageIncluded ?? false;
  const hasCabin = offer?.baggage?.some((b) => b.type === 'carry_on' && b.quantity > 0) ?? true;
  const baggageDescription = hasChecked
    ? 'Bagaglio incluso'
    : hasCabin
    ? 'Solo bagaglio a mano'
    : 'Nessun bagaglio incluso';

  const refund = offer?.refundPolicy
    ? refundFromPolicy(offer.refundPolicy, group.departureAt)
    : { refundable: false, description: 'Non rimborsabile' };

  const durationTotalMin = group.durationMinutes;
  const dh = Math.floor(durationTotalMin / 60);
  const dm = durationTotalMin % 60;
  const durationLabel = dm > 0 ? `${dh}h ${dm}m` : `${dh}h`;

  return {
    id: uniqueId(),
    type: 'flight' as BookingType,
    status: 'selected',
    title: `${iataToCity(firstSeg.origin)} → ${iataToCity(lastSeg.destination)}`,
    provider: group.airline,
    price: group.estimatedPrice,
    currency: offer?.currency ?? 'EUR',
    photos: offer?.logoUrl ? [offer.logoUrl] : [],
    timing: {
      startDate: depDate,
      endDate: arrDate,
      startTime: hhmmFromIso(group.departureAt),
      endTime: hhmmFromIso(group.arrivalAt),
      dayOffset,
      timeOfDay,
      duration: durationLabel,
    },
    flight: {
      airline: group.airline,
      flightNumber: firstSeg.flightNumber ?? '',
      origin: firstSeg.origin,
      originName: iataToCity(firstSeg.origin),
      destination: lastSeg.destination,
      destinationName: iataToCity(lastSeg.destination),
      direction,
      stops,
      baggage: {
        cabin: hasCabin,
        checked: hasChecked,
        description: baggageDescription,
      },
    },
    refund,
    rawData: offer?.rawOffer,
  };
}

// ─── Hotel ────────────────────────────────────────────────────────────────────

export function hotelOfferToBookingItem(
  hotel: HotelOffer,
  params: SearchParams,
): BookingItem {
  const nights = daysBetween(params.checkIn, params.checkOut);
  const refund = refundFromPolicy(hotel.refundPolicy, params.checkIn.toISOString());

  return {
    id: uniqueId(),
    type: 'hotel',
    status: 'selected',
    title: hotel.name,
    provider: hotel.provider,
    price: hotel.totalPrice,
    currency: hotel.currency,
    photos: hotel.photoUrls ?? (hotel.thumbnailUrl ? [hotel.thumbnailUrl] : []),
    rating: hotel.rating,
    reviewCount: hotel.reviewCount,
    timing: {
      startDate: dateStringFromIso(params.checkIn.toISOString()),
      endDate: dateStringFromIso(params.checkOut.toISOString()),
      startTime: HOTEL_DEFAULT_CHECKIN_TIME,
      endTime: HOTEL_DEFAULT_CHECKOUT_TIME,
      timeOfDay: 'afternoon',
      duration: `${nights} nott${nights === 1 ? 'e' : 'i'}`,
    },
    hotel: {
      address: hotel.zone ?? '',
      coordinates: hotel.coordinates,
      amenities: hotel.amenities ?? [],
      checkinTime: HOTEL_DEFAULT_CHECKIN_TIME,
      checkoutTime: HOTEL_DEFAULT_CHECKOUT_TIME,
      nights,
    },
    refund,
    rawData: hotel.rawHotel,
  };
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function activityOfferToBookingItem(
  activity: ActivityOffer,
  date: string,
): BookingItem {
  const durationMin = activity.durationHours > 0
    ? Math.round(activity.durationHours * 60)
    : undefined;

  const durationLabel = activity.durationLabel
    ?? (durationMin ? `${Math.floor(durationMin / 60)}h ${durationMin % 60 > 0 ? `${durationMin % 60}m` : ''}`.trim() : undefined);

  return {
    id: uniqueId(),
    type: 'activity',
    status: 'selected',
    title: activity.name,
    provider: activity.provider,
    price: activity.price,
    currency: activity.currency,
    photos: activity.photoUrls ?? (activity.thumbnailUrl ? [activity.thumbnailUrl] : []),
    description: activity.shortDescription,
    rating: activity.rating,
    reviewCount: activity.reviewCount,
    timing: {
      startDate: date,
      timeOfDay: 'morning', // default; can be overridden from API time data
      duration: durationLabel,
    },
    activity: {
      category: activity.categories?.[0],
      durationMin,
    },
    refund: activity.hasFreeCancellation
      ? {
          refundable: true,
          fullRefundDeadline: new Date(new Date(date).getTime() - 24 * 3_600_000).toISOString(),
          description: 'Cancellazione gratuita',
        }
      : {
          refundable: false,
          description: 'Non rimborsabile',
        },
    rawData: activity.rawOffer,
  };
}

// ─── Car ──────────────────────────────────────────────────────────────────────

export function carOfferToBookingItem(
  car: CarOffer,
  params: SearchParams,
): BookingItem {
  const pickupDate = dateStringFromIso(params.checkIn.toISOString());
  const returnDate = dateStringFromIso(params.checkOut.toISOString());

  return {
    id: uniqueId(),
    type: 'car',
    status: 'selected',
    title: car.name,
    provider: car.provider,
    price: car.totalPrice,
    currency: car.currency,
    photos: car.imageUrl ? [car.imageUrl] : [],
    timing: {
      startDate: pickupDate,
      endDate: returnDate,
      startTime: CAR_DEFAULT_PICKUP_TIME,
      duration: `${car.days} giorn${car.days === 1 ? 'o' : 'i'}`,
    },
    car: {
      company: car.company,
      carType: car.category,
      pickupLocation: car.pickupLocation,
      pickupTime: CAR_DEFAULT_PICKUP_TIME,
      returnLocation: car.pickupLocation,
      returnTime: CAR_DEFAULT_RETURN_TIME,
    },
    refund: refundFromPolicy(car.refundPolicy),
    rawData: car.rawOffer,
  };
}

// ─── Insurance ────────────────────────────────────────────────────────────────

const PLAN_MAP: Record<InsurancePlan['planType'], 'Essential' | 'Plus' | 'Complete'> = {
  essential: 'Essential',
  plus: 'Plus',
  premium: 'Complete',
};

export function insurancePlanToBookingItem(
  plan: InsurancePlan,
  params: SearchParams,
): BookingItem {
  return {
    id: uniqueId(),
    type: 'insurance',
    status: 'selected',
    title: plan.name,
    provider: plan.provider,
    price: plan.price,
    currency: plan.currency,
    photos: [],
    timing: {
      startDate: dateStringFromIso(params.checkIn.toISOString()),
      endDate: dateStringFromIso(params.checkOut.toISOString()),
    },
    insurance: {
      plan: PLAN_MAP[plan.planType],
      coverage: plan.coverageItems ?? [],
      medicalLimit: plan.planType === 'premium' ? 1_000_000 : plan.planType === 'plus' ? 500_000 : 100_000,
    },
    refund: {
      refundable: true,
      fullRefundDeadline: new Date(new Date(params.checkIn).getTime() - 7 * 86_400_000).toISOString(),
      description: 'Rimborsabile entro 7 giorni dalla stipula',
    },
  };
}

// ─── Visa ─────────────────────────────────────────────────────────────────────

const VISA_STATUS_MAP: Record<string, BookingItem['visa']> = {
  not_required: { type: 'visa_free', stayDays: 90 },
  evisa: { type: 'evisa', stayDays: 30 },
  on_arrival: { type: 'eta', stayDays: 30 },
  required: { type: 'embassy', stayDays: 30 },
};

export function visaInfoToBookingItem(info: VisaInfo): BookingItem | null {
  if (info.status === 'not_required') return null; // no booking needed

  return {
    id: uniqueId(),
    type: 'visa',
    status: 'selected',
    title: `Visto — ${info.destination}`,
    provider: 'simplevisa',
    price: info.fee ?? 0,
    currency: info.feeCurrency ?? 'EUR',
    photos: [],
    description: info.details,
    timing: {
      startDate: new Date().toISOString().split('T')[0],
      timeOfDay: 'morning',
    },
    visa: VISA_STATUS_MAP[info.status] ?? { type: 'embassy', stayDays: 30 },
    refund: {
      refundable: false,
      description: 'Le spese di visto non sono rimborsabili',
    },
  };
}

// ─── Transfer (multi-city) ────────────────────────────────────────────────────

function transferModeFromString(mode: string): 'train' | 'flight' | 'bus' | 'car' {
  const lower = mode.toLowerCase();
  if (lower.includes('train') || lower.includes('rail') || lower.includes('shinkansen') || lower.includes('tren')) return 'train';
  if (lower.includes('flight') || lower.includes('fly') || lower.includes('air')) return 'flight';
  if (lower.includes('bus') || lower.includes('coach')) return 'bus';
  return 'car';
}

function modeLabelFromSuggestion(suggestion: TransportSuggestion): string {
  // Use the provided duration/mode info to build a readable label
  const lower = suggestion.mode.toLowerCase();
  if (lower.includes('shinkansen')) return 'Shinkansen';
  if (lower.includes('frecciarossa') || lower.includes('italo')) return lower.charAt(0).toUpperCase() + lower.slice(1);
  if (lower.includes('train') || lower.includes('rail')) return 'Treno';
  if (lower.includes('flight')) return 'Volo';
  if (lower.includes('bus')) return 'Bus';
  return suggestion.mode;
}

export function transferSuggestionToBookingItem(
  suggestion: TransportSuggestion,
  date: string,
  pace: number,
): BookingItem {
  // Departure time based on pace: slow → morning, medium → midday, fast → afternoon
  const depTimeOfDay: TimeOfDay = pace < 30 ? 'morning' : pace <= 70 ? 'afternoon' : 'afternoon';
  const depTime = pace < 30 ? '08:00' : pace <= 70 ? '11:00' : '14:00';

  // Parse duration string like "2h 10m" or "2h10"
  const durationMin = parseDurationLabel(suggestion.duration);

  const modeType = transferModeFromString(suggestion.mode);

  return {
    id: uniqueId(),
    type: 'transfer',
    status: 'selected',
    title: `${suggestion.from} → ${suggestion.to}`,
    provider: modeLabelFromSuggestion(suggestion),
    price: suggestion.price_eur,
    currency: 'EUR',
    photos: [],
    timing: {
      startDate: date,
      startTime: depTime,
      timeOfDay: depTimeOfDay,
      duration: suggestion.duration,
    },
    transfer: {
      from: suggestion.from,
      to: suggestion.to,
      mode: modeType,
      modeLabel: modeLabelFromSuggestion(suggestion),
      durationMin,
      priceEstimate: suggestion.price_eur,
    },
    refund: {
      refundable: true,
      description: 'Verifica la policy del vettore',
    },
  };
}

function parseDurationLabel(label: string): number {
  const hourMatch = label.match(/(\d+)\s*h/i);
  const minMatch = label.match(/(\d+)\s*m/i);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  return hours * 60 + mins;
}
