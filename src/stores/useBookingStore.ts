import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BookingItem,
  BookingType,
  BookingSummary,
  SearchParams,
} from '../types/booking';
import type { CityStop, TransportSuggestion } from '../types/multi-city';
import type { Trip } from '../types/trip';

// ─── Store interface ──────────────────────────────────────────────────────────

interface BookingStore {
  // Current search
  searchParams: SearchParams | null;

  // Unified booking items for the current trip being built
  bookings: BookingItem[];

  // Multi-city
  isMultiCity: boolean;
  cityStops: CityStop[];
  transportSuggestions: TransportSuggestion[];

  // Reference to saved trip being edited (null = new trip)
  currentTripId?: string;

  // ── Actions ──────────────────────────────────────────────────────────────────
  setSearchParams(params: SearchParams): void;

  addBooking(item: BookingItem): void;
  updateBooking(id: string, updates: Partial<BookingItem>): void;
  removeBooking(id: string): void;

  /** Replace a booking of the same type (e.g. swapping selected flight) */
  replaceBookingByType(type: BookingType, item: BookingItem): void;

  clearBookings(): void;

  // Multi-city
  setMultiCity(enabled: boolean): void;
  setCityStops(stops: CityStop[], transport?: TransportSuggestion[]): void;
  addCityStop(stop: CityStop): void;
  removeCityStop(cityId: string): void;
  updateCityStop(cityId: string, updates: Partial<CityStop>): void;
  reorderCityStops(fromIdx: number, toIdx: number): void;

  // ── Selectors ─────────────────────────────────────────────────────────────────
  getBookingsByType(type: BookingType): BookingItem[];
  getBookingsByCity(cityId: string): BookingItem[];
  getBookingsByDate(date: string): BookingItem[];
  getSelectedBookings(): BookingItem[];
  getBookedBookings(): BookingItem[];
  getSummary(): BookingSummary;

  // ── Persistence ───────────────────────────────────────────────────────────────
  saveDraft(name: string): Trip;
  bookNow(): Trip;
  loadFromTrip(trip: Trip): void;
  reset(): void;
}

// ─── Migration: old TripItem → BookingItem ────────────────────────────────────

function migrateOldTripItem(item: {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  price: number;
  refundPolicy?: string;
  departureAt?: string;
  arrivalAt?: string;
}): BookingItem {
  const type = (item.type as BookingType) ?? 'flight';
  const startDate = item.departureAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];
  return {
    id: item.id,
    type,
    status: 'booked',
    title: item.title,
    provider: item.subtitle ?? '',
    price: item.price ?? 0,
    currency: 'EUR',
    photos: [],
    timing: {
      startDate,
      endDate: item.arrivalAt?.split('T')[0],
      startTime: item.departureAt ? item.departureAt.slice(11, 16) : undefined,
      endTime: item.arrivalAt ? item.arrivalAt.slice(11, 16) : undefined,
    },
    refund: {
      refundable: item.refundPolicy === 'flexible' || item.refundPolicy === 'moderate',
      description: item.refundPolicy === 'flexible'
        ? 'Rimborsabile'
        : item.refundPolicy === 'moderate'
        ? 'Parzialmente rimborsabile'
        : 'Non rimborsabile',
    },
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      searchParams: null,
      bookings: [],
      isMultiCity: false,
      cityStops: [],
      transportSuggestions: [],
      currentTripId: undefined,

      setSearchParams: (params) => set({ searchParams: params }),

      addBooking: (item) => set((s) => ({ bookings: [...s.bookings, item] })),

      updateBooking: (id, updates) => set((s) => ({
        bookings: s.bookings.map((b) => b.id === id ? { ...b, ...updates } : b),
      })),

      removeBooking: (id) => set((s) => ({
        bookings: s.bookings.filter((b) => b.id !== id),
      })),

      replaceBookingByType: (type, item) => set((s) => {
        const without = s.bookings.filter((b) => b.type !== type);
        return { bookings: [...without, item] };
      }),

      clearBookings: () => set({ bookings: [], currentTripId: undefined }),

      // ── Multi-city ─────────────────────────────────────────────────────────
      setMultiCity: (enabled) => set({ isMultiCity: enabled }),

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

      reorderCityStops: (fromIdx, toIdx) => set((s) => {
        const stops = [...s.cityStops];
        const [moved] = stops.splice(fromIdx, 1);
        stops.splice(toIdx, 0, moved);
        return { cityStops: stops };
      }),

      // ── Selectors ──────────────────────────────────────────────────────────
      getBookingsByType: (type) => get().bookings.filter((b) => b.type === type),

      getBookingsByCity: (cityId) => get().bookings.filter((b) => b.cityId === cityId),

      getBookingsByDate: (date) => get().bookings.filter((b) => {
        const { startDate, endDate } = b.timing;
        if (endDate) return date >= startDate && date <= endDate;
        return startDate === date;
      }),

      getSelectedBookings: () => get().bookings.filter((b) => b.status === 'selected'),

      getBookedBookings: () => get().bookings.filter((b) => b.status === 'booked'),

      getSummary: (): BookingSummary => {
        const { bookings } = get();
        const total = bookings.reduce((s, b) => s + b.price, 0);
        const currency = bookings[0]?.currency ?? 'EUR';
        const byType: BookingSummary['byType'] = {};
        for (const b of bookings) {
          const entry = byType[b.type] ?? { count: 0, total: 0 };
          byType[b.type] = { count: entry.count + 1, total: entry.total + b.price };
        }
        const byCity: Record<string, { count: number; total: number }> = {};
        for (const b of bookings) {
          if (!b.cityId) continue;
          const entry = byCity[b.cityId] ?? { count: 0, total: 0 };
          byCity[b.cityId] = { count: entry.count + 1, total: entry.total + b.price };
        }
        return {
          total,
          currency,
          byType,
          byCity: Object.keys(byCity).length > 0 ? byCity : undefined,
        };
      },

      // ── Persistence ────────────────────────────────────────────────────────
      saveDraft: (name) => {
        const { bookings, searchParams, isMultiCity, cityStops, transportSuggestions } = get();
        const summary = get().getSummary();
        const params = searchParams;

        const trip: Trip = {
          id: `draft-${Date.now()}`,
          name,
          destination: params?.destination ?? '',
          destinationCode: params?.destinationCode ?? '',
          origin: params?.origin,
          originCode: params?.originCode,
          coverEmoji: '📋',
          dateRange: params
            ? `${fmtDate(params.checkIn)} – ${fmtDate(params.checkOut)}`
            : '',
          checkIn: params?.checkIn.toISOString(),
          checkOut: params?.checkOut.toISOString(),
          status: 'draft',
          travelers: params?.travelers ?? 1,
          totalPrice: summary.total,
          currency: summary.currency,
          items: [],
          bookings,
          bookingRef: '',
          createdAt: new Date().toISOString(),
          isMultiCity,
          cityStops: isMultiCity ? cityStops : undefined,
          transportSuggestions: isMultiCity ? transportSuggestions : undefined,
        };

        // Persist to app store
        _addToAppStore(trip);
        set({ currentTripId: trip.id });
        return trip;
      },

      bookNow: () => {
        const { bookings, searchParams, isMultiCity, cityStops, transportSuggestions } = get();
        const summary = get().getSummary();
        const params = searchParams;
        const ref = Math.random().toString(36).slice(2, 10).toUpperCase();

        const trip: Trip = {
          id: `booked-${Date.now()}`,
          name: params?.destination ?? 'Viaggio',
          destination: params?.destination ?? '',
          destinationCode: params?.destinationCode ?? '',
          origin: params?.origin,
          originCode: params?.originCode,
          coverEmoji: '✈️',
          dateRange: params
            ? `${fmtDate(params.checkIn)} – ${fmtDate(params.checkOut)}`
            : '',
          checkIn: params?.checkIn.toISOString(),
          checkOut: params?.checkOut.toISOString(),
          status: 'booked',
          travelers: params?.travelers ?? 1,
          totalPrice: summary.total,
          currency: summary.currency,
          items: [],
          bookings: bookings.map((b) => ({ ...b, status: 'booked' as BookingStatus })),
          bookingRef: ref,
          createdAt: new Date().toISOString(),
          bookedAt: new Date().toISOString(),
          isMultiCity,
          cityStops: isMultiCity ? cityStops : undefined,
          transportSuggestions: isMultiCity ? transportSuggestions : undefined,
        };

        _addToAppStore(trip);
        set({ currentTripId: trip.id });
        return trip;
      },

      loadFromTrip: (trip) => {
        let bookings: BookingItem[];

        if (trip.bookings && trip.bookings.length > 0) {
          // New format — use directly
          bookings = trip.bookings;
        } else {
          // Old format — migrate from TripItem[]
          bookings = (trip.items ?? []).map(migrateOldTripItem);
        }

        const checkIn = trip.checkIn ? new Date(trip.checkIn) : new Date();
        const checkOut = trip.checkOut ? new Date(trip.checkOut) : new Date();

        set({
          bookings,
          currentTripId: trip.id,
          isMultiCity: trip.isMultiCity ?? false,
          cityStops: trip.cityStops ?? [],
          transportSuggestions: trip.transportSuggestions ?? [],
          searchParams: {
            origin: trip.origin ?? '',
            originCode: trip.originCode ?? '',
            destination: trip.destination,
            destinationCode: trip.destinationCode,
            checkIn,
            checkOut,
            travelers: trip.travelers,
          },
        });
      },

      reset: () => set({
        bookings: [],
        searchParams: null,
        isMultiCity: false,
        cityStops: [],
        transportSuggestions: [],
        currentTripId: undefined,
      }),
    }),
    {
      name: 'voyageur-booking-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist bookings and multi-city state; searchParams has non-serializable Date
      partialize: (s) => ({
        bookings: s.bookings,
        isMultiCity: s.isMultiCity,
        cityStops: s.cityStops,
        transportSuggestions: s.transportSuggestions,
        currentTripId: s.currentTripId,
      }),
    },
  ),
);

// ─── Cross-store helper (avoids circular import) ──────────────────────────────

// Lazy import to avoid circular dep: useBookingStore → useAppStore → ...
let _appStoreAdded = false;
function _addToAppStore(trip: Trip): void {
  try {
    // Dynamic require to break potential circular dependency at module level
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore } = require('./useAppStore') as { useAppStore: { getState: () => { addTrip: (t: Trip) => void } } };
    useAppStore.getState().addTrip(trip);
    _appStoreAdded = true;
  } catch {
    if (__DEV__) console.warn('[useBookingStore] could not add trip to useAppStore');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

// Re-export BookingStatus for use in bookNow
type BookingStatus = BookingItem['status'];

export type { BookingStore };
