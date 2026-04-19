import { create } from 'zustand';
import type { CartItem, CartItemType, SearchParams, SearchResults, Currency, HotelOffer, ActivityOffer } from '../types/booking';
import type { TravelerInfo, PaymentTab, NewCardData, CheckoutSnapshot } from '../types/checkout';
import type { CityStop, TransportSuggestion } from '../types/multi-city';

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
  origin?: string;
  originCode?: string;
  destination: string;
  destinationCode: string;
  checkIn: string;
  checkOut: string;
  travelers: number;
  itemIds: Array<{ type: CartItemType; offerId: string }>;
}

interface CheckoutState {
  snapshot: CheckoutSnapshot | null;
  travelers: TravelerInfo[];
  paymentTab: PaymentTab;
  newCard: NewCardData;
  bookingRef: string;
  draftTripId: string | null;
  pendingDraftRestore: PendingDraftRestore | null;

  // Multi-city
  multiCityMode: boolean;
  cityStops: CityStop[];
  transportSuggestions: TransportSuggestion[];

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

  // Multi-city actions
  setMultiCityMode: (enabled: boolean) => void;
  setCityStops: (stops: CityStop[], transport?: TransportSuggestion[]) => void;
  addCityStop: (stop: CityStop) => void;
  removeCityStop: (cityId: string) => void;
  updateCityStop: (cityId: string, updates: Partial<CityStop>) => void;
  reorderCityStops: (fromIndex: number, toIndex: number) => void;
  selectHotelForCity: (cityId: string, hotel: HotelOffer) => void;
  addActivityToCity: (cityId: string, activity: ActivityOffer) => void;
  removeActivityFromCity: (cityId: string, activityId: string) => void;
  clearMultiCity: () => void;
  setTransportSuggestions: (suggestions: TransportSuggestion[]) => void;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  snapshot: null,
  travelers: [],
  paymentTab: 'saved',
  newCard: defaultCard,
  bookingRef: '',
  draftTripId: null,
  pendingDraftRestore: null,
  multiCityMode: false,
  cityStops: [],
  transportSuggestions: [],

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

  // ─── Multi-city ──────────────────────────────────────────────────────────────
  setMultiCityMode: (enabled) => set({ multiCityMode: enabled }),

  setCityStops: (stops, transport) => set({
    cityStops: stops,
    ...(transport !== undefined ? { transportSuggestions: transport } : {}),
  }),

  addCityStop: (stop) => set((s) => ({ cityStops: [...s.cityStops, stop] })),

  removeCityStop: (cityId) => set((s) => ({
    cityStops: s.cityStops.filter((c) => c.id !== cityId),
  })),

  updateCityStop: (cityId, updates) => set((s) => ({
    cityStops: s.cityStops.map((c) => c.id === cityId ? { ...c, ...updates } : c),
  })),

  reorderCityStops: (fromIndex, toIndex) => set((s) => {
    const stops = [...s.cityStops];
    const [moved] = stops.splice(fromIndex, 1);
    stops.splice(toIndex, 0, moved);
    return { cityStops: stops };
  }),

  selectHotelForCity: (cityId, hotel) => set((s) => ({
    cityStops: s.cityStops.map((c) => c.id === cityId ? { ...c, selectedHotel: hotel } : c),
  })),

  addActivityToCity: (cityId, activity) => set((s) => ({
    cityStops: s.cityStops.map((c) =>
      c.id === cityId && !c.selectedActivities.find((a) => a.id === activity.id)
        ? { ...c, selectedActivities: [...c.selectedActivities, activity] }
        : c,
    ),
  })),

  removeActivityFromCity: (cityId, activityId) => set((s) => ({
    cityStops: s.cityStops.map((c) =>
      c.id === cityId
        ? { ...c, selectedActivities: c.selectedActivities.filter((a) => a.id !== activityId) }
        : c,
    ),
  })),

  clearMultiCity: () => set({ multiCityMode: false, cityStops: [], transportSuggestions: [] }),

  setTransportSuggestions: (suggestions) => set({ transportSuggestions: suggestions }),
}));
