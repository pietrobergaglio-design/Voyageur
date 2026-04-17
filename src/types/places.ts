export interface Airport {
  id: string;
  name: string;
  iataCode: string;
}

export interface PlaceSuggestion {
  id: string;
  type: 'city' | 'airport';
  name: string;
  iataCode: string;
  country: string;
  countryFlag: string;
  cityName?: string;
  airports?: Airport[];
}

export interface PlaceSelection {
  displayName: string;
  iataCode: string;
  cityName: string;
}
