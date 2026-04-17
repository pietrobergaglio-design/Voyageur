import type { CartItem, SearchParams, SearchResults, Currency } from './booking';

export interface TravelerInfo {
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  passport: string;
}

export type PaymentTab = 'saved' | 'new' | 'apple_pay';

export interface NewCardData {
  number: string;
  expiry: string;
  cvv: string;
  save: boolean;
}

export interface CheckoutSnapshot {
  cartItems: CartItem[];
  subtotal: number;
  taxAmount: number;
  finalTotal: number;
  currency: Currency;
  searchParams: SearchParams;
  results: SearchResults;
}
