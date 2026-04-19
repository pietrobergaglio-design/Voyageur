import type { AIItinerary, AIMultiCityItinerary } from './ai-itinerary';
import type { CityStop, TransportSuggestion } from './multi-city';

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
  items: TripItem[];
  bookingRef: string;
  createdAt: string;
  bookedAt?: string;
  itinerary?: AIItinerary;
  isMultiCity?: boolean;
  cityStops?: CityStop[];
  transportSuggestions?: TransportSuggestion[];
  multiCityItinerary?: AIMultiCityItinerary;
}
