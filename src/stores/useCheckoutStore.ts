import { create } from 'zustand';
import type { CartItem, SearchParams, SearchResults, Currency } from '../types/booking';
import type { TravelerInfo, PaymentTab, NewCardData, CheckoutSnapshot } from '../types/checkout';

const TAX_RATE = 0.08;

const emptyTraveler = (): TravelerInfo => ({
  firstName: '',
  lastName: '',
  birthDate: '',
  nationality: '',
  passport: '',
});

const defaultCard: NewCardData = {
  number: '',
  expiry: '',
  cvv: '',
  save: false,
};

export interface PendingDraftRestore {
  tripId: string;
  destination: string;
  destinationCode: string;
  checkIn: string;
  checkOut: string;
  travelers: number;
  itemIds: Array<{ type: string; offerId: string }>;
}

interface CheckoutState {
  snapshot: CheckoutSnapshot | null;
  travelers: TravelerInfo[];
  paymentTab: PaymentTab;
  newCard: NewCardData;
  bookingRef: string;
  draftTripId: string | null;
  pendingDraftRestore: PendingDraftRestore | null;

  initCheckout: (
    cartItems: CartItem[],
    total: number,
    currency: Currency,
    params: SearchParams,
    results: SearchResults,
    draftTripId?: string,
  ) => void;
  setTraveler: (index: number, data: Partial<TravelerInfo>) => void;
  setPaymentTab: (tab: PaymentTab) => void;
  setNewCard: (data: Partial<NewCardData>) => void;
  setBookingRef: (ref: string) => void;
  setPendingDraftRestore: (restore: PendingDraftRestore | null) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  snapshot: null,
  travelers: [],
  paymentTab: 'saved',
  newCard: defaultCard,
  bookingRef: '',
  draftTripId: null,
  pendingDraftRestore: null,

  initCheckout: (cartItems, total, currency, params, results, draftTripId) => {
    const taxAmount = Math.round(total * TAX_RATE);
    const finalTotal = total + taxAmount;
    set({
      snapshot: { cartItems, subtotal: total, taxAmount, finalTotal, currency, searchParams: params, results },
      travelers: Array.from({ length: params.travelers }, emptyTraveler),
      paymentTab: 'saved',
      newCard: defaultCard,
      bookingRef: '',
      draftTripId: draftTripId ?? null,
    });
  },

  setTraveler: (index, data) => {
    const travelers = [...get().travelers];
    travelers[index] = { ...travelers[index], ...data };
    set({ travelers });
  },

  setPaymentTab: (tab) => set({ paymentTab: tab }),
  setNewCard: (data) => set((s) => ({ newCard: { ...s.newCard, ...data } })),
  setBookingRef: (ref) => set({ bookingRef: ref }),
  setPendingDraftRestore: (restore) => set({ pendingDraftRestore: restore }),

  reset: () => set({
    snapshot: null,
    travelers: [],
    paymentTab: 'saved',
    newCard: defaultCard,
    bookingRef: '',
    draftTripId: null,
  }),
}));
