export type TripStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled';

export interface TripItem {
  id: string;
  type: 'flight' | 'hotel' | 'transport' | 'activity' | 'insurance';
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
  destination: string;
  destinationCode: string;
  coverEmoji: string;
  dateRange: string;
  status: TripStatus;
  travelers: number;
  totalPrice: number;
  currency: string;
  items: TripItem[];
  bookingRef: string;
}
