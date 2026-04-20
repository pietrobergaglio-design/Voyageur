import type { AIItinerary, AIMultiCityItinerary } from './ai-itinerary';
import type { CityStop, TransportSuggestion } from './multi-city';
import type { FlightDirectionGroup, CarOffer, InsurancePlan, VisaInfo, BookingItem } from './booking';

export type TripStatus = 'draft' | 'booked' | 'active' | 'past';

export interface TripItem {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'activity' | 'insurance';
  title: string;
  subtitle: string;
  dateLabel: string;
  confirmCode: string;
  price: number;
  refundPolicy?: 'flexible' | 'moderate' | 'strict';
  insuranceProvider?: string;
  coverageItems?: string[];
  iata?: { origin: string; destination: string };
  departureAt?: string;
  arrivalAt?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  destinationCode: string;
  coverEmoji: string;
  dateRange: string;
  checkIn?: string;
  checkOut?: string;
  status: TripStatus;
  travelers: number;
  totalPrice: number;
  currency: string;
  /** @deprecated use bookings[] instead */
  items: TripItem[];
  bookingRef: string;
  createdAt: string;
  updatedAt?: string;
  bookedAt?: string;
  itinerary?: AIItinerary;
  /** @deprecated use bookings[] instead */
  flightOutbound?: FlightDirectionGroup;
  /** @deprecated use bookings[] instead */
  flightReturn?: FlightDirectionGroup;
  /** @deprecated use bookings[] instead */
  selectedCar?: CarOffer;
  /** @deprecated use bookings[] instead */
  selectedInsurancePlan?: InsurancePlan;
  visaInfo?: VisaInfo;
  // Multi-city
  isMultiCity?: boolean;
  cityStops?: CityStop[];
  transportSuggestions?: TransportSuggestion[];
  multiCityItinerary?: AIMultiCityItinerary;

  // Unified booking items (v2 data model — optional for backward compatibility)
  bookings?: BookingItem[];

  // Search params snapshot (for draft restore)
  origin?: string;
  originCode?: string;
}
