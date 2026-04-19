import type { HotelOffer, ActivityOffer } from './booking';

export interface CityStop {
  id: string;
  name: string;
  country: string;
  coordinates?: { lat: number; lng: number };
  photoUrl?: string;
  gradientColors: [string, string];
  flagEmoji: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  nights: number;
  selectedHotel?: HotelOffer;
  selectedActivities: ActivityOffer[];
  isBase: boolean;
}

export interface TransportSuggestion {
  from: string;
  to: string;
  mode: string;
  duration: string;
  price_eur: number;
}

export interface AICityDivisionCity {
  name: string;
  nights: number;
  reason: string;
  isBase?: boolean;
}

export interface AICityDivision {
  cities: AICityDivisionCity[];
  transport_suggestions: TransportSuggestion[];
}
