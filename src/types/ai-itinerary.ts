export type AITimeSlot = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';

export interface AIActivitySuggestion {
  time_slot: AITimeSlot;
  start_time: string;
  end_time: string;
  emoji: string;
  title: string;
  caption: string;
  description: string;
  category: string;
  is_bookable: boolean;
  price_estimate_eur: number;
  tags: string[];
  best_light?: string;
  suitable_for?: string;
}

export interface AIItineraryDay {
  day_number: number;
  date: string;
  suggestions: AIActivitySuggestion[];
}

export interface AIItinerary {
  days: AIItineraryDay[];
  generatedAt: string;
}
