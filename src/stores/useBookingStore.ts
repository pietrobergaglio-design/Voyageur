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
import { generateConfirmationCode } from '../utils/confirmation-codes';

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

  /** Replace a flight booking by direction (outbound/return), leaving the other direction intact */
  replaceFlightByDirection(direction: 'outbound' | 'return', item: BookingItem): void;

  /** Remove a flight booking by direction */
  removeFlightByDirection(direction: 'outbound' | 'return'): void;

  /** Remove all bookings of a given type */
  removeBookingsByType(type: BookingType): void;

  clearBookings(): void;

  setCurrentTripId(id: string | undefined): void;

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
  bookNow(bookingRef: string, draftTripId?: string): Trip;
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

      replaceFlightByDirection: (direction, item) => set((s) => {
        const without = s.bookings.filter(
          (b) => !(b.type === 'flight' && b.flight?.direction === direction),
        );
        return { bookings: [...without, item] };
      }),

      removeFlightByDirection: (direction) => set((s) => ({
        bookings: s.bookings.filter(
          (b) => !(b.type === 'flight' && b.flight?.direction === direction),
        ),
      })),

      removeBookingsByType: (type) => set((s) => ({
        bookings: s.bookings.filter((b) => b.type !== type),
      })),

      clearBookings: () => set({ bookings: [], currentTripId: undefined }),

      setCurrentTripId: (id) => set({ currentTripId: id }),

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

      bookNow: (bookingRef: string, draftTripId?: string) => {
        // Idempotency: return existing trip if this bookingRef was already booked
        const existing = _findTripByBookingRef(bookingRef);
        if (existing) {
          if (__DEV__) console.warn('[bookNow] Trip already exists for ref', bookingRef);
          return existing;
        }

        const { bookings, searchParams, isMultiCity, cityStops, transportSuggestions } = get();
        const summary = get().getSummary();
        const params = searchParams;
        const now = new Date().toISOString();

        const bookedBookings: BookingItem[] = bookings.map((b) => {
          if (b.confirmation) return { ...b, status: 'booked' as BookingStatus };
          const code = generateConfirmationCode(b);
          if (!code) return { ...b, status: 'booked' as BookingStatus };
          return {
            ...b,
            status: 'booked' as BookingStatus,
            confirmation: {
              code,
              qrData: JSON.stringify({
                id: b.id,
                type: b.type,
                title: b.title,
                code,
                date: b.timing.startDate,
              }),
            },
          };
        });

        const tripId = draftTripId ?? `booked-${Date.now()}`;
        const trip: Trip = {
          id: tripId,
          name: params?.destination.split(',')[0] ?? 'Viaggio',
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
          bookings: bookedBookings,
          bookingRef,
          createdAt: now,
          bookedAt: now,
          isMultiCity,
          cityStops: isMultiCity ? cityStops : undefined,
          transportSuggestions: isMultiCity ? transportSuggestions : undefined,
        };

        if (draftTripId) {
          _updateInAppStore(draftTripId, { ...trip, id: draftTripId });
        } else {
          _addToAppStore(trip);
        }
        set({ currentTripId: tripId });
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
      // Only persist multi-city UI state for convenience; bookings and currentTripId
      // are ephemeral (session-only) — they reset on app restart.
      partialize: (s) => ({
        isMultiCity: s.isMultiCity,
        cityStops: s.cityStops,
        transportSuggestions: s.transportSuggestions,
      }),
    },
  ),
);

// ─── Cross-store helpers (avoids circular import) ─────────────────────────────

type _AppStore = { addTrip: (t: Trip) => void; updateTrip: (id: string, u: Partial<Trip>) => void; trips: Trip[] };

function _getAppStore(): _AppStore | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAppStore } = require('./useAppStore') as { useAppStore: { getState: () => _AppStore } };
    return useAppStore.getState();
  } catch {
    return null;
  }
}

// Lazy import to avoid circular dep: useBookingStore → useAppStore → ...
function _addToAppStore(trip: Trip): void {
  const store = _getAppStore();
  if (store) {
    store.addTrip(trip);
  } else if (__DEV__) {
    console.warn('[useBookingStore] could not add trip to useAppStore');
  }
}

function _updateInAppStore(id: string, updates: Partial<Trip>): void {
  const store = _getAppStore();
  if (store) {
    store.updateTrip(id, updates);
  } else if (__DEV__) {
    console.warn('[useBookingStore] could not update trip in useAppStore');
  }
}

function _findTripByBookingRef(ref: string): Trip | undefined {
  return _getAppStore()?.trips.find((t) => t.bookingRef === ref);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

// Re-export BookingStatus for use in bookNow
type BookingStatus = BookingItem['status'];

export type { BookingStore };
