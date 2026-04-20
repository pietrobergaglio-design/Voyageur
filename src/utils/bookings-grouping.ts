import type {
  BookingItem,
  Currency,
  FlightDirectionGroup,
  HotelOffer,
  ActivityOffer,
  CarOffer,
  InsurancePlan,
} from '../types/booking';
import type { CityStop, TransportSuggestion } from '../types/multi-city';
import type { Trip } from '../types/trip';

// TODO(future): unify multi-city hotels/activities into trip.bookings[] with
// cityId to eliminate dual-source reading.

// ─── Shape ────────────────────────────────────────────────────────────────────

export interface TotalBreakdown {
  flights: number;
  hotels: number;
  activities: number;
  car: number;
  insurance: number;
}

export interface CityBlockData {
  stop: CityStop;
  hotels: HotelOffer[];
  activities: ActivityOffer[];
  transferAfter?: TransportSuggestion;
  dayRangeStart: number;
  dayRangeEnd: number;
}

export interface SingleGrouped {
  kind: 'single';
  flights: BookingItem[];
  hotels: BookingItem[];
  activities: BookingItem[];
  car?: BookingItem;
  insurance?: BookingItem;
  hasVisa: boolean;
  breakdown: TotalBreakdown;
  isEmpty: boolean;
}

export interface MultiGrouped {
  kind: 'multi';
  flights: BookingItem[];
  cityBlocks: CityBlockData[];
  car?: BookingItem;
  insurance?: BookingItem;
  hasVisa: boolean;
  breakdown: TotalBreakdown;
  isEmpty: boolean;
}

export type GroupedBookings = SingleGrouped | MultiGrouped;

// ─── Main grouping ────────────────────────────────────────────────────────────

export function groupBookings(trip: Trip): GroupedBookings {
  const bookings = trip.bookings ?? [];
  const flightBookings = bookings.filter((b) => b.type === 'flight');
  const carBooking = bookings.find((b) => b.type === 'car');
  const insuranceBooking = bookings.find((b) => b.type === 'insurance');
  const hasVisa = !!trip.visaInfo;

  const isMultiCity = !!(trip.isMultiCity && trip.cityStops && trip.cityStops.length > 0);

  if (isMultiCity) {
    const cityStops = trip.cityStops!;
    let globalDay = 0;
    const cityBlocks: CityBlockData[] = cityStops.map((stop) => {
      const dayStart = globalDay + 1;
      const dayEnd = globalDay + stop.nights;
      globalDay += stop.nights;
      const transferAfter = trip.transportSuggestions?.find(
        (t) => t.from.toLowerCase() === stop.name.toLowerCase(),
      );
      const hotels: HotelOffer[] = stop.selectedHotel ? [stop.selectedHotel] : [];
      const activities: ActivityOffer[] = stop.selectedActivities ?? [];
      return { stop, hotels, activities, transferAfter, dayRangeStart: dayStart, dayRangeEnd: dayEnd };
    });

    const breakdown: TotalBreakdown = { flights: 0, hotels: 0, activities: 0, car: 0, insurance: 0 };
    for (const b of flightBookings) breakdown.flights += b.price;
    for (const block of cityBlocks) {
      for (const h of block.hotels) breakdown.hotels += h.totalPrice;
      for (const a of block.activities) breakdown.activities += a.price;
    }
    if (carBooking) breakdown.car = carBooking.price;
    if (insuranceBooking) breakdown.insurance = insuranceBooking.price;

    const hasCityContent = cityBlocks.some((b) => b.hotels.length > 0 || b.activities.length > 0);
    const isEmpty =
      !hasCityContent &&
      flightBookings.length === 0 &&
      !carBooking &&
      !insuranceBooking &&
      !hasVisa;

    return {
      kind: 'multi',
      flights: flightBookings,
      cityBlocks,
      car: carBooking,
      insurance: insuranceBooking,
      hasVisa,
      breakdown,
      isEmpty,
    };
  }

  const hotelBookings = bookings.filter((b) => b.type === 'hotel');
  const activityBookings = bookings.filter((b) => b.type === 'activity');

  const breakdown: TotalBreakdown = { flights: 0, hotels: 0, activities: 0, car: 0, insurance: 0 };
  for (const b of flightBookings) breakdown.flights += b.price;
  for (const b of hotelBookings) breakdown.hotels += b.price;
  for (const b of activityBookings) breakdown.activities += b.price;
  if (carBooking) breakdown.car = carBooking.price;
  if (insuranceBooking) breakdown.insurance = insuranceBooking.price;

  const isEmpty = bookings.length === 0 && !hasVisa;

  return {
    kind: 'single',
    flights: flightBookings,
    hotels: hotelBookings,
    activities: activityBookings,
    car: carBooking,
    insurance: insuranceBooking,
    hasVisa,
    breakdown,
    isEmpty,
  };
}

// ─── BookingItem → Offer adapters (for existing row components) ───────────────

export function bookingToFlightGroup(b: BookingItem): FlightDirectionGroup {
  const dep = `${b.timing.startDate}T${b.timing.startTime ?? '00:00'}:00`;
  const arr = `${b.timing.endDate ?? b.timing.startDate}T${b.timing.endTime ?? '00:00'}:00`;
  return {
    key: b.id,
    airline: b.flight?.airline ?? b.provider,
    segments: [{
      origin: b.flight?.origin ?? '',
      destination: b.flight?.destination ?? '',
      departureAt: dep,
      arrivalAt: arr,
      durationMinutes: 0,
      flightNumber: b.flight?.flightNumber ?? '',
    }],
    stops: b.flight?.stops.length ?? 0,
    durationMinutes: 0,
    departureAt: dep,
    arrivalAt: arr,
    estimatedPrice: b.price,
    offerIds: [],
  };
}

export function bookingToHotel(b: BookingItem, fallbackNights: number): HotelOffer {
  return {
    id: b.id,
    provider: 'booking',
    name: b.title,
    zone: b.hotel?.address ?? '',
    stars: 4,
    propertyType: 'hotel',
    pricePerNight: b.price / Math.max(1, b.hotel?.nights ?? fallbackNights),
    totalPrice: b.price,
    currency: b.currency as Currency,
    refundPolicy: b.refund.refundable ? 'flexible' : 'strict',
    matchScore: 0,
    tags: [],
    amenities: b.hotel?.amenities ?? [],
  };
}

export function bookingToActivity(b: BookingItem): ActivityOffer {
  return {
    id: b.id,
    provider: 'viator',
    name: b.title,
    durationHours: (b.activity?.durationMin ?? 180) / 60,
    price: b.price,
    currency: b.currency as Currency,
    categories: b.activity?.category ? [b.activity.category] : [],
    matchScore: 0,
    tags: [],
    highlights: [],
  };
}

export function bookingToCar(b: BookingItem): CarOffer {
  return {
    id: b.id,
    provider: 'mock',
    name: b.car?.carType ?? b.title,
    category: b.car?.carType ?? '',
    company: b.car?.company ?? b.provider,
    pricePerDay: b.price,
    totalPrice: b.price,
    currency: b.currency as Currency,
    days: 1,
    transmission: 'automatic',
    seats: 5,
    doors: 4,
    hasAC: true,
    freeKm: 'unlimited',
    pickupLocation: b.car?.pickupLocation ?? '',
    insuranceIncluded: false,
    refundPolicy: b.refund.refundable ? 'flexible' : 'strict',
    matchScore: 0,
    tags: [],
  };
}

export function bookingToInsurance(b: BookingItem): InsurancePlan {
  return {
    id: b.id,
    provider: 'qover',
    name: b.title,
    planType: 'essential',
    coverageItems: b.insurance?.coverage ?? [],
    price: b.price,
    currency: b.currency as Currency,
    tags: [],
    highlights: [],
  };
}
