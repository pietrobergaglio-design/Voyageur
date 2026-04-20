import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Modal, TextInput, Pressable, LayoutAnimation, Platform, UIManager, Alert } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { useBookingStore } from '../../src/stores/useBookingStore';
import { MultiCityPanel } from '../../src/components/search/MultiCityPanel';
import { CityPanel } from '../../src/components/search/CityPanel';
import type { CityStop, TransportSuggestion } from '../../src/types/multi-city';
import { Toast } from '../../src/components/common/Toast';

import { SearchBar } from '../../src/components/search/SearchBar';
import { ResultSection } from '../../src/components/search/ResultSection';
import { FlightCard } from '../../src/components/search/FlightCard';
import { FlightSegmentCard, type FlightDirectionGroup } from '../../src/components/search/FlightSegmentCard';
import { HotelCard } from '../../src/components/search/HotelCard';
import { CarCard } from '../../src/components/search/CarCard';
import { ActivityCard } from '../../src/components/search/ActivityCard';
import { InsuranceCard } from '../../src/components/search/InsuranceCard';
import { VisaCard } from '../../src/components/search/VisaCard';
import { CartBar } from '../../src/components/search/CartBar';
import { ShowMoreButton, ShowLessButton } from '../../src/components/search/ShowMoreButton';
import { FilterBar } from '../../src/components/search/FilterBar';
import {
  extractHotelBrands, extractActivityProviders, extractCarCompanies, extractInsuranceBrands,
  filterHotels, filterActivities, filterCars, filterInsurance,
} from '../../src/utils/filter-helpers';

import { getMockResults, DEFAULT_SEARCH_PARAMS } from '../../src/data/mockSearch';
import { searchFlights, DuffelError, resolveCityToIATA } from '../../src/services/duffel';
import { searchHotels, BookingError } from '../../src/services/booking';
import { searchActivities } from '../../src/services/activities';
import { generateMockCars } from '../../src/services/cars';
import { getVisaInfo } from '../../src/services/visa';
import type { SearchParams, SearchResults, CartItem, CartItemType, FlightSegment, BookingItem, HotelOffer, ActivityOffer, CarOffer, InsurancePlan, FlightOffer, Currency } from '../../src/types/booking';
import type { Trip } from '../../src/types/trip';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

const CART_BAR_HEIGHT = 88;

function nightsBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

// ─── Flight 3+3 helpers ───────────────────────────────────────────────────────

function segmentGroupKey(segs: FlightSegment[]): string {
  if (segs.length === 0) return '';
  const first = segs[0];
  const last = segs[segs.length - 1];
  const dep = first.departureAt.slice(11, 16); // HH:MM
  return `${first.origin}_${last.destination}_${dep}_${segs.length}`;
}

function extractDirectionGroups(
  flights: import('../../src/types/booking').FlightOffer[],
  destCode: string | undefined,
): { outbound: FlightDirectionGroup[]; returnDir: FlightDirectionGroup[] } {
  const obMap = new Map<string, FlightDirectionGroup>();
  const retMap = new Map<string, FlightDirectionGroup>();

  for (const offer of flights) {
    const segs = offer.segments;
    if (segs.length === 0) continue;

    // Find split index: last segment whose destination matches destCode
    let splitIdx = segs.length; // default = all outbound (one-way)
    if (destCode) {
      for (let i = 0; i < segs.length; i++) {
        if (segs[i].destination.toUpperCase() === destCode.toUpperCase()) {
          splitIdx = i + 1;
          break;
        }
      }
    }

    const outSegs = segs.slice(0, splitIdx);
    const retSegs = segs.slice(splitIdx);

    // Outbound group
    if (outSegs.length > 0) {
      const key = segmentGroupKey(outSegs);
      const existing = obMap.get(key);
      const dur = outSegs.reduce((s, seg) => s + seg.durationMinutes, 0);
      if (!existing) {
        obMap.set(key, {
          key,
          airline: offer.airline,
          segments: outSegs,
          stops: outSegs.length - 1,
          durationMinutes: offer.totalDurationMinutes ?? dur,
          departureAt: outSegs[0].departureAt,
          arrivalAt: outSegs[outSegs.length - 1].arrivalAt,
          estimatedPrice: offer.price / 2,
          offerIds: [offer.id],
        });
      } else {
        existing.offerIds.push(offer.id);
        existing.estimatedPrice = Math.min(existing.estimatedPrice, offer.price / 2);
      }
    }

    // Return group
    if (retSegs.length > 0) {
      const key = segmentGroupKey(retSegs);
      const existing = retMap.get(key);
      const dur = retSegs.reduce((s, seg) => s + seg.durationMinutes, 0);
      if (!existing) {
        retMap.set(key, {
          key,
          airline: offer.airline,
          segments: retSegs,
          stops: retSegs.length - 1,
          durationMinutes: dur,
          departureAt: retSegs[0].departureAt,
          arrivalAt: retSegs[retSegs.length - 1].arrivalAt,
          estimatedPrice: offer.price / 2,
          offerIds: [offer.id],
        });
      } else {
        existing.offerIds.push(offer.id);
        existing.estimatedPrice = Math.min(existing.estimatedPrice, offer.price / 2);
      }
    }
  }

  // Sort by departure time
  const sortByDep = (a: FlightDirectionGroup, b: FlightDirectionGroup) =>
    a.departureAt.localeCompare(b.departureAt);

  return {
    outbound: Array.from(obMap.values()).sort(sortByDep),
    returnDir: Array.from(retMap.values()).sort(sortByDep),
  };
}

function findBestOffer(
  flights: import('../../src/types/booking').FlightOffer[],
  outboundKey: string,
  returnKey: string,
): import('../../src/types/booking').FlightOffer | null {
  // Exact match: offer contains both outbound and return
  for (const offer of flights) {
    const segs = offer.segments;
    const obKey = segmentGroupKey(segs.slice(0, Math.ceil(segs.length / 2)));
    const retKey = segmentGroupKey(segs.slice(Math.ceil(segs.length / 2)));
    if (obKey === outboundKey && retKey === returnKey) return offer;
  }
  // Fallback: offer that contains the outbound key
  return flights.find((f) => {
    const key = segmentGroupKey(f.segments.slice(0, Math.ceil(f.segments.length / 2)));
    return key === outboundKey;
  }) ?? flights[0] ?? null;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  photoBlock: {
    backgroundColor: Colors.border,
    borderRadius: 0,
    height: 160,
    marginBottom: Spacing.sm,
  },
});

function FlightSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={[skStyles.bar, { width: '40%', height: 14 }]} />
      <View style={skStyles.routeRow}>
        <View style={[skStyles.bar, { width: 52, height: 28 }]} />
        <View style={[skStyles.bar, { flex: 1, height: 2, marginHorizontal: 8 }]} />
        <View style={[skStyles.bar, { width: 52, height: 28 }]} />
      </View>
      <View style={[skStyles.bar, { width: '60%', height: 12 }]} />
    </View>
  );
}

function HotelSkeleton() {
  return (
    <View style={[skStyles.card, { padding: 0 }]}>
      <View style={skStyles.photoBlock} />
      <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
        <View style={[skStyles.bar, { width: '65%', height: 15 }]} />
        <View style={[skStyles.bar, { width: '40%', height: 11 }]} />
        <View style={[skStyles.bar, { width: '30%', height: 18 }]} />
      </View>
    </View>
  );
}

// ─── SaveDraftModal ───────────────────────────────────────────────────────────

function SaveDraftModal({ visible, defaultName, onSave, onCancel }: {
  visible: boolean;
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) setName(defaultName);
  }, [visible, defaultName]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={dmStyles.backdrop} onPress={onCancel}>
        <Pressable style={[dmStyles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]} onPress={() => {}}>
          <View style={dmStyles.handle} />
          <Text style={dmStyles.title}>Salva come bozza</Text>
          <Text style={dmStyles.subtitle}>Dai un nome al tuo viaggio per trovarlo facilmente</Text>
          <TextInput
            style={dmStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="es. Vacanza estiva a Tokyo"
            placeholderTextColor={Colors.text.muted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && onSave(name.trim())}
          />
          <View style={dmStyles.btnRow}>
            <Pressable
              style={({ pressed }) => [dmStyles.btnCancel, pressed && dmStyles.btnPressed]}
              onPress={onCancel}
            >
              <Text style={dmStyles.btnCancelText}>Annulla</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [dmStyles.btnSave, !name.trim() && dmStyles.btnSaveDisabled, pressed && dmStyles.btnPressed]}
              onPress={() => name.trim() && onSave(name.trim())}
              disabled={!name.trim()}
            >
              <Text style={dmStyles.btnSaveText}>💾 Salva bozza</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dmStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, gap: Spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.xs },
  title: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: Colors.text.primary },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  input: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.text.primary, backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 14, minHeight: 52 },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  btnCancel: { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 14, alignItems: 'center', minHeight: 50 },
  btnCancelText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.text.secondary },
  btnSave: { flex: 2, borderRadius: Radius.md, backgroundColor: Colors.accent, paddingVertical: 14, alignItems: 'center', minHeight: 50 },
  btnSaveDisabled: { backgroundColor: Colors.accent + '55' },
  btnSaveText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.white },
  btnPressed: { opacity: 0.85 },
});

// ─── BookingItem converters ───────────────────────────────────────────────────

function flightGroupToBookingItem(
  direction: 'outbound' | 'return',
  group: FlightDirectionGroup,
  offer: FlightOffer | null,
): BookingItem {
  const first = group.segments[0];
  const last = group.segments[group.segments.length - 1];
  const stops = group.segments.slice(1).map((seg) => ({
    location: seg.origin,
    locationName: seg.origin,
    durationMin: 0,
  }));
  return {
    id: `flight-${direction}-${group.key}`,
    type: 'flight',
    status: 'selected',
    title: direction === 'outbound'
      ? `Volo Andata · ${group.airline}`
      : `Volo Ritorno · ${group.airline}`,
    provider: group.airline,
    price: group.estimatedPrice,
    currency: offer?.currency ?? 'EUR',
    photos: [],
    timing: {
      startDate: first.departureAt.split('T')[0],
      endDate: last.arrivalAt.split('T')[0],
      startTime: first.departureAt.slice(11, 16),
      endTime: last.arrivalAt.slice(11, 16),
      duration: `${Math.floor(group.durationMinutes / 60)}h ${group.durationMinutes % 60}m`,
    },
    flight: {
      airline: group.airline,
      flightNumber: first.flightNumber ?? '',
      origin: first.origin,
      originName: first.origin,
      destination: last.destination,
      destinationName: last.destination,
      direction,
      stops,
      baggage: {
        cabin: true,
        checked: offer?.baggageIncluded ?? false,
        description: offer?.baggageIncluded ? 'Bagaglio incluso' : 'Solo bagaglio a mano',
      },
    },
    refund: {
      refundable: offer?.refundPolicy !== 'strict',
      description: offer?.refundPolicy === 'flexible' ? 'Rimborsabile'
        : offer?.refundPolicy === 'moderate' ? 'Parzialmente rimborsabile'
        : 'Non rimborsabile',
    },
  };
}

function hotelOfferToBookingItem(hotel: HotelOffer, params: SearchParams): BookingItem {
  const nights = Math.max(1, Math.round(
    (params.checkOut.getTime() - params.checkIn.getTime()) / 86_400_000,
  ));
  return {
    id: `hotel-${hotel.id}`,
    type: 'hotel',
    status: 'selected',
    title: hotel.name,
    provider: hotel.provider,
    price: hotel.totalPrice,
    currency: hotel.currency,
    photos: hotel.photoUrls ?? [],
    rating: hotel.rating,
    timing: {
      startDate: params.checkIn.toISOString().split('T')[0],
      endDate: params.checkOut.toISOString().split('T')[0],
    },
    hotel: {
      address: hotel.zone,
      amenities: hotel.amenities,
      checkinTime: '15:00',
      checkoutTime: '11:00',
      nights,
    },
    refund: {
      refundable: hotel.refundPolicy !== 'strict',
      description: hotel.refundPolicy === 'flexible' ? 'Rimborsabile'
        : hotel.refundPolicy === 'moderate' ? 'Parzialmente rimborsabile'
        : 'Non rimborsabile',
    },
  };
}

function activityOfferToBookingItem(activity: ActivityOffer, params: SearchParams): BookingItem {
  return {
    id: `activity-${activity.id}`,
    type: 'activity',
    status: 'selected',
    title: activity.name,
    provider: activity.provider,
    price: activity.price * params.travelers,
    currency: activity.currency,
    photos: activity.photoUrls ?? [],
    timing: {
      startDate: params.checkIn.toISOString().split('T')[0],
    },
    activity: {
      category: activity.categories[0],
      durationMin: Math.round(activity.durationHours * 60),
    },
    refund: {
      refundable: activity.hasFreeCancellation ?? false,
      description: activity.hasFreeCancellation ? 'Cancellazione gratuita' : 'Non rimborsabile',
    },
  };
}

function carOfferToBookingItem(car: CarOffer, params: SearchParams): BookingItem {
  return {
    id: `car-${car.id}`,
    type: 'car',
    status: 'selected',
    title: `${car.company} · ${car.name}`,
    provider: car.provider,
    price: car.totalPrice,
    currency: car.currency,
    photos: [],
    timing: {
      startDate: params.checkIn.toISOString().split('T')[0],
      endDate: params.checkOut.toISOString().split('T')[0],
    },
    car: {
      company: car.company,
      carType: car.category,
      pickupLocation: car.pickupLocation,
      pickupTime: '10:00',
      returnLocation: car.pickupLocation,
      returnTime: '10:00',
    },
    refund: {
      refundable: car.refundPolicy !== 'strict',
      description: car.refundPolicy === 'flexible' ? 'Rimborsabile' : 'Non rimborsabile',
    },
  };
}

function insurancePlanToBookingItem(plan: InsurancePlan, params: SearchParams): BookingItem {
  return {
    id: `insurance-${plan.id}`,
    type: 'insurance',
    status: 'selected',
    title: plan.name,
    provider: plan.provider,
    price: plan.price * params.travelers,
    currency: plan.currency,
    photos: [],
    timing: {
      startDate: params.checkIn.toISOString().split('T')[0],
      endDate: params.checkOut.toISOString().split('T')[0],
    },
    insurance: {
      plan: plan.planType === 'essential' ? 'Essential' : plan.planType === 'plus' ? 'Plus' : 'Complete',
      coverage: plan.coverageItems,
      medicalLimit: 50_000,
    },
    refund: {
      refundable: false,
      description: 'Non rimborsabile dopo acquisto',
    },
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const initCheckout = useCheckoutStore((s) => s.initCheckout);
  const pendingDraftRestore = useCheckoutStore((s) => s.pendingDraftRestore);
  const setPendingDraftRestore = useCheckoutStore((s) => s.setPendingDraftRestore);
  const multiCityMode = useBookingStore((s) => s.isMultiCity);
  const cityStops = useBookingStore((s) => s.cityStops);
  const transportSuggestions = useBookingStore((s) => s.transportSuggestions);
  const setMultiCityMode = useBookingStore((s) => s.setMultiCity);
  const setCityStops = useBookingStore((s) => s.setCityStops);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const storeTrips = useAppStore((s) => s.trips);
  const onboardingData = useAppStore((s) => s.onboardingData);

  // ─── Booking store (single source of truth for selections) ────────────────
  const storeBookings = useBookingStore((s) => s.bookings);
  const currentTripId = useBookingStore((s) => s.currentTripId);
  const replaceFlightByDirection = useBookingStore((s) => s.replaceFlightByDirection);
  const removeFlightByDirection = useBookingStore((s) => s.removeFlightByDirection);
  const replaceBookingByType = useBookingStore((s) => s.replaceBookingByType);
  const removeBookingsByType = useBookingStore((s) => s.removeBookingsByType);
  const addBooking = useBookingStore((s) => s.addBooking);
  const removeBooking = useBookingStore((s) => s.removeBooking);
  const clearBookings = useBookingStore((s) => s.clearBookings);
  const setCurrentTripId = useBookingStore((s) => s.setCurrentTripId);
  const setStoreSearchParams = useBookingStore((s) => s.setSearchParams);
  const saveDraftFromStore = useBookingStore((s) => s.saveDraft);

  // Trip being edited (if currentTripId is set)
  const editingDraft = currentTripId ? storeTrips.find((t) => t.id === currentTripId) ?? null : null;

  const [params, setParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFlightsLoading, setIsFlightsLoading] = useState(false);
  const [isHotelsLoading, setIsHotelsLoading] = useState(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
  const [activitiesUnavailable, setActivitiesUnavailable] = useState(false);
  const [hotelCacheAgeMs, setHotelCacheAgeMs] = useState<number | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showMultiCityPanel, setShowMultiCityPanel] = useState(false);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Show-more state per section (default: 3 visible)
  const SECTION_DEFAULT = 3;
  const [showAllFlights, setShowAllFlights] = useState(false);
  const [showAllHotels, setShowAllHotels] = useState(false);
  const [showAllCars, setShowAllCars] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllInsurance, setShowAllInsurance] = useState(false);

  // Filter state
  const [hotelQuery, setHotelQuery] = useState('');
  const [hotelFilters, setHotelFilters] = useState<string[]>([]);
  const [activityQuery, setActivityQuery] = useState('');
  const [activityFilters, setActivityFilters] = useState<string[]>([]);
  const [carQuery, setCarQuery] = useState('');
  const [carFilters, setCarFilters] = useState<string[]>([]);
  const [insuranceQuery, setInsuranceQuery] = useState('');
  const [insuranceFilters, setInsuranceFilters] = useState<string[]>([]);

  const toggleShowMore = (setter: (v: boolean) => void, next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(next);
  };

  // Selections
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);
  const [selectedOutboundKey, setSelectedOutboundKey] = useState<string | null>(null);
  const [selectedReturnKey, setSelectedReturnKey] = useState<string | null>(null);
  const [showAllOutbound, setShowAllOutbound] = useState(false);
  const [showAllReturn, setShowAllReturn] = useState(false);

  // Restore draft selections when returning from a draft's "Modifica selezioni"
  useFocusEffect(
    useCallback(() => {
      if (!pendingDraftRestore) return;
      const restore = pendingDraftRestore;
      setPendingDraftRestore(null);

      const restoredParams: SearchParams = {
        origin: restore.origin ?? DEFAULT_SEARCH_PARAMS.origin,
        originCode: restore.originCode ?? DEFAULT_SEARCH_PARAMS.originCode,
        destination: restore.destination,
        destinationCode: restore.destinationCode,
        checkIn: new Date(restore.checkIn),
        checkOut: new Date(restore.checkOut),
        travelers: restore.travelers,
      };
      setParams(restoredParams);

      const r = getMockResults(restoredParams);
      setResults(r);
      setHasSearched(true);

      if (restore.isMultiCity && restore.cityStops) {
        setCityStops(restore.cityStops, restore.transportSuggestions);
        setMultiCityMode(true);
      }

      for (const { type, offerId } of restore.itemIds) {
        if (type === 'flight') setSelectedFlight(offerId);
        else if (type === 'hotel') setSelectedHotel(offerId);
        else if (type === 'car') setSelectedCar(offerId);
        else if (type === 'activity') setSelectedActivities((prev) => [...prev, offerId]);
        else if (type === 'insurance') setSelectedInsurance(offerId);
      }

      // Load bookings from the draft trip into bookingStore (new format support)
      const draftTrip = useAppStore.getState().trips.find((t) => t.id === restore.tripId);
      if (draftTrip) {
        useBookingStore.getState().loadFromTrip(draftTrip);
      }
    }, [pendingDraftRestore]),
  );

  const doSearch = async () => {
    setIsSearching(true);
    setIsFlightsLoading(true);
    setIsHotelsLoading(true);
    setIsActivitiesLoading(true);
    setActivitiesUnavailable(false);
    setHotelCacheAgeMs(null);
    setResults(null);
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedCar(null);
    setSelectedActivities([]);
    setSelectedInsurance(null);
    setSelectedOutboundKey(null);
    setSelectedReturnKey(null);
    setStoreSearchParams(params);
    clearBookings();
    setShowAllOutbound(false);
    setShowAllReturn(false);
    setShowAllFlights(false);
    setShowAllHotels(false);
    setShowAllCars(false);
    setShowAllActivities(false);
    setShowAllInsurance(false);
    setHotelQuery(''); setHotelFilters([]);
    setActivityQuery(''); setActivityFilters([]);
    setCarQuery(''); setCarFilters([]);
    setInsuranceQuery(''); setInsuranceFilters([]);

    // Generate cars + visa immediately (sync/near-sync)
    const mockBase = getMockResults(params);
    const cars = generateMockCars(params, onboardingData);
    const visa = getVisaInfo(params.destination, onboardingData.nationality || 'IT');

    setResults({ ...mockBase, flights: [], hotels: [], cars, activities: [], visa });
    setHasSearched(true);
    setIsSearching(false);

    // For multi-city open-jaw: resolve last city's IATA so return slice departs from there
    let flightParams = params;
    if (multiCityMode && cityStops.length > 1) {
      const lastStop = cityStops[cityStops.length - 1];
      const lastIata = await resolveCityToIATA(lastStop.name).catch(() => '');
      if (lastIata) flightParams = { ...params, returnOriginCode: lastIata };
      if (__DEV__) console.log(`[search] multi-city open-jaw: return from ${lastStop.name} (${lastIata || 'unresolved'})`);
    }

    // Fetch flights, hotels, activities independently
    const flightPromise = searchFlights(flightParams, onboardingData)
      .then((flights) => {
        setIsFlightsLoading(false);
        setResults((prev) => prev ? { ...prev, flights } : prev);
      })
      .catch((err) => {
        setIsFlightsLoading(false);
        if (__DEV__) console.warn('[search] Duffel error:', err);
        setToastMessage('Ricerca voli non disponibile, riprova');
        setToastVisible(true);
        setResults((prev) => prev ? { ...prev, flights: mockBase.flights } : prev);
      });

    const hotelPromise = searchHotels(params, onboardingData)
      .then((result) => {
        setIsHotelsLoading(false);
        if (result.cacheAgeMs !== undefined) setHotelCacheAgeMs(result.cacheAgeMs);
        setResults((prev) => prev ? { ...prev, hotels: result.hotels } : prev);
      })
      .catch((err) => {
        setIsHotelsLoading(false);
        if (__DEV__) console.warn('[search] Booking error:', err);
        setToastMessage('Ricerca hotel non disponibile, riprova');
        setToastVisible(true);
        setResults((prev) => prev ? { ...prev, hotels: mockBase.hotels } : prev);
      });

    const activitiesPromise = searchActivities(params, onboardingData)
      .then((activities) => {
        setIsActivitiesLoading(false);
        setResults((prev) => prev ? { ...prev, activities } : prev);
      })
      .catch((err) => {
        setIsActivitiesLoading(false);
        setActivitiesUnavailable(true);
        if (__DEV__) console.warn('[search] Activities error:', err?.message ?? err);
        setResults((prev) => prev ? { ...prev, activities: [] } : prev);
      });

    await Promise.allSettled([flightPromise, hotelPromise, activitiesPromise]);
  };

  const handleSearch = () => {
    const hasSelections = storeBookings.length > 0;

    // Case 1: editing a draft and destination/dates changed
    if (editingDraft) {
      const destChanged = params.destination !== editingDraft.destination;
      const checkInChanged = params.checkIn.toISOString().split('T')[0] !== editingDraft.checkIn?.split('T')[0];
      const checkOutChanged = params.checkOut.toISOString().split('T')[0] !== editingDraft.checkOut?.split('T')[0];
      if (destChanged || checkInChanged || checkOutChanged) {
        Alert.alert(
          `Stai modificando: ${editingDraft.name}`,
          'Cambiare destinazione o date creerà un viaggio separato. La bozza originale non sarà modificata.',
          [
            {
              text: 'Crea nuovo viaggio',
              onPress: () => {
                setCurrentTripId(undefined);
                doSearch();
              },
            },
            {
              text: 'Mantieni bozza originale',
              style: 'destructive',
              onPress: () => {
                // Reset params to match the draft and search with those
                const draftParams: SearchParams = {
                  origin: editingDraft.origin ?? '',
                  originCode: editingDraft.originCode ?? '',
                  destination: editingDraft.destination,
                  destinationCode: editingDraft.destinationCode,
                  checkIn: editingDraft.checkIn ? new Date(editingDraft.checkIn) : params.checkIn,
                  checkOut: editingDraft.checkOut ? new Date(editingDraft.checkOut) : params.checkOut,
                  travelers: editingDraft.travelers,
                };
                setParams(draftParams);
                // doSearch will use the updated params on next call — inform user
                setToastMessage('Parametri ripristinati dalla bozza');
                setToastVisible(true);
              },
            },
            { text: 'Annulla', style: 'cancel' },
          ],
        );
        return;
      }
    }

    // Case 2: unsaved selections in a fresh search (no currentTripId)
    if (!editingDraft && hasSelections) {
      Alert.alert(
        'Selezioni non salvate',
        `Hai ${storeBookings.length} ${storeBookings.length === 1 ? 'selezione' : 'selezioni'} non salvate. Cosa vuoi fare?`,
        [
          {
            text: 'Salva come bozza',
            onPress: () => {
              setStoreSearchParams(params);
              saveDraftFromStore(params.destination.split(',')[0]);
              doSearch();
            },
          },
          {
            text: 'Scarta',
            style: 'destructive',
            onPress: () => doSearch(),
          },
          { text: 'Annulla', style: 'cancel' },
        ],
      );
      return;
    }

    doSearch();
  };

  const toggleActivity = (id: string) => {
    const wasSelected = selectedActivities.includes(id);
    setSelectedActivities((prev) => wasSelected ? prev.filter((x) => x !== id) : [...prev, id]);
    if (wasSelected) {
      removeBooking(`activity-${id}`);
    } else {
      const activity = results?.activities.find((a) => a.id === id);
      if (activity) addBooking(activityOfferToBookingItem(activity, params));
    }
  };

  const cartItems = useMemo<CartItem[]>(() => {
    if (!results) return [];
    const items: CartItem[] = [];

    if (multiCityMode) {
      // Multi-città: flights from bookingStore, hotel/activities from cityStops
      for (const b of storeBookings) {
        if (b.type !== 'flight' || b.status !== 'selected') continue;
        items.push({ type: 'flight', offerId: b.id, name: b.title, price: b.price, currency: b.currency as Currency });
      }
      for (const stop of cityStops) {
        if (stop.selectedHotel) {
          const h = stop.selectedHotel;
          items.push({ type: 'hotel', offerId: h.id, name: `${h.name} · ${stop.name}`, price: h.totalPrice, currency: h.currency });
        }
        for (const act of stop.selectedActivities) {
          items.push({ type: 'activity', offerId: act.id, name: act.name, price: act.price * params.travelers, currency: act.currency });
        }
      }
      // Car and insurance from store even in multi-city
      for (const b of storeBookings) {
        if ((b.type === 'car' || b.type === 'insurance') && b.status === 'selected') {
          items.push({ type: b.type as CartItemType, offerId: b.id, name: b.title, price: b.price, currency: b.currency as Currency });
        }
      }
    } else {
      // Singola destinazione: tutto da bookingStore
      for (const b of storeBookings) {
        if (b.status !== 'selected') continue;
        if (b.type === 'visa' || b.type === 'transfer') continue;
        items.push({ type: b.type as CartItemType, offerId: b.id, name: b.title, price: b.price, currency: b.currency as Currency });
      }
    }

    return items;
  }, [results, storeBookings, multiCityMode, cityStops, params.travelers]);

  const totalPrice = useMemo(() => cartItems.reduce((sum, item) => sum + item.price, 0), [cartItems]);

  const { outboundGroups, returnGroups } = useMemo(() => {
    if (!results?.flights?.length) return { outboundGroups: [] as FlightDirectionGroup[], returnGroups: [] as FlightDirectionGroup[] };
    const { outbound, returnDir } = extractDirectionGroups(results.flights, params.destinationCode);
    return { outboundGroups: outbound, returnGroups: returnDir };
  }, [results?.flights, params.destinationCode]);

  useEffect(() => {
    if (!results?.flights?.length) { setSelectedFlight(null); return; }
    if (!selectedOutboundKey) { setSelectedFlight(null); return; }
    const best = findBestOffer(results.flights, selectedOutboundKey, selectedReturnKey ?? '');
    setSelectedFlight(best?.id ?? null);
  }, [selectedOutboundKey, selectedReturnKey, results?.flights]);

  // Filter option memos
  const hotelFilterOptions = useMemo(
    () => extractHotelBrands(results?.hotels ?? []),
    [results?.hotels],
  );
  const activityFilterOptions = useMemo(
    () => extractActivityProviders(results?.activities ?? []),
    [results?.activities],
  );
  const carFilterOptions = useMemo(
    () => extractCarCompanies(results?.cars ?? []),
    [results?.cars],
  );
  const insuranceFilterOptions = useMemo(
    () => extractInsuranceBrands(results?.insurance ?? []),
    [results?.insurance],
  );

  // Filtered result memos
  const filteredHotels = useMemo(
    () => filterHotels(results?.hotels ?? [], hotelQuery, hotelFilters),
    [results?.hotels, hotelQuery, hotelFilters],
  );
  const filteredActivities = useMemo(
    () => filterActivities(results?.activities ?? [], activityQuery, activityFilters),
    [results?.activities, activityQuery, activityFilters],
  );
  const filteredCars = useMemo(
    () => filterCars(results?.cars ?? [], carQuery, carFilters),
    [results?.cars, carQuery, carFilters],
  );
  const filteredInsurance = useMemo(
    () => filterInsurance(results?.insurance ?? [], insuranceQuery, insuranceFilters),
    [results?.insurance, insuranceQuery, insuranceFilters],
  );

  const nights = nightsBetween(params.checkIn, params.checkOut);
  const hasCart = cartItems.length > 0;
  const totalSelectedActivities = multiCityMode
    ? cityStops.reduce((sum, s) => sum + s.selectedActivities.length, 0)
    : 0;

  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleSaveDraft = (name?: string) => {
    if (!results) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingDraft) {
      // Update existing draft — preserve id, createdAt; merge bookings
      updateTrip(editingDraft.id, {
        bookings: storeBookings,
        ...(results.visa ? { visaInfo: results.visa } : {}),
      });
      setShowDraftModal(false);
      setToastMessage('Bozza aggiornata!');
      setToastVisible(true);
      toastTimerRef.current = setTimeout(() => {
        setToastVisible(false);
        router.replace('/(tabs)/trips');
      }, 1800);
      return;
    }

    // New draft
    setStoreSearchParams(params);
    const savedTrip = saveDraftFromStore(name ?? params.destination.split(',')[0]);
    if (results.visa) updateTrip(savedTrip.id, { visaInfo: results.visa });

    setShowDraftModal(false);
    setToastMessage('Bozza salvata!');
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      router.replace('/(tabs)/trips');
    }, 1800);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, hasCart && { paddingBottom: CART_BAR_HEIGHT + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Cerca</Text>
        <SearchBar params={params} onChange={setParams} onSearch={handleSearch} isLoading={isSearching || isFlightsLoading || isHotelsLoading || isActivitiesLoading} />

        {isSearching && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Cerco le migliori opzioni…</Text>
          </View>
        )}

        {!hasSearched && !isSearching && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>Dove vuoi andare?</Text>
            <Text style={styles.emptySubtitle}>
              Cerca voli, hotel, attività e assicurazione in un colpo solo
            </Text>
          </View>
        )}

        {!isSearching && results && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Risultati per {results.params.destination}</Text>
              <Text style={styles.resultsSubtitle}>
                {nightsBetween(results.params.checkIn, results.params.checkOut)} notti · {results.params.travelers} {results.params.travelers === 1 ? 'persona' : 'persone'}
              </Text>
            </View>

            {/* ✈️ Voli */}
            {(() => {
              const isOneWay = returnGroups.length === 0;
              const obSlice = outboundGroups.slice(0, showAllOutbound ? outboundGroups.length : SECTION_DEFAULT);
              const retSlice = returnGroups.slice(0, showAllReturn ? returnGroups.length : SECTION_DEFAULT);

              return (
                <ResultSection
                  title="✈️ Voli"
                  totalCount={isFlightsLoading ? 0 : outboundGroups.length}
                  visibleCount={isFlightsLoading ? undefined : obSlice.length}
                >
                  {isFlightsLoading ? (
                    <><FlightSkeleton /><FlightSkeleton /><FlightSkeleton /></>
                  ) : results.flights.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text style={styles.emptyRowText}>Nessun volo trovato per queste date</Text>
                    </View>
                  ) : (
                    <>
                      {/* Andata */}
                      <Text style={styles.directionLabel}>Andata</Text>
                      {obSlice.map((g) => (
                        <FlightSegmentCard
                          key={g.key}
                          group={g}
                          selected={selectedOutboundKey === g.key}
                          onSelect={() => {
                            const newKey = g.key === selectedOutboundKey ? null : g.key;
                            setSelectedOutboundKey(newKey);
                            if (newKey) {
                              const offer = results?.flights.find((f) => g.offerIds.includes(f.id)) ?? null;
                              replaceFlightByDirection('outbound', flightGroupToBookingItem('outbound', g, offer));
                            } else {
                              removeFlightByDirection('outbound');
                            }
                          }}
                          direction="outbound"
                          offer={results?.flights.find((f) => g.offerIds.includes(f.id))}
                        />
                      ))}
                      {!showAllOutbound && outboundGroups.length > SECTION_DEFAULT && (
                        <ShowMoreButton hiddenCount={outboundGroups.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllOutbound, true)} />
                      )}
                      {showAllOutbound && outboundGroups.length > SECTION_DEFAULT && (
                        <ShowLessButton onPress={() => toggleShowMore(setShowAllOutbound, false)} />
                      )}

                      {/* Ritorno */}
                      {!isOneWay && (
                        <>
                          <Text style={[styles.directionLabel, { marginTop: Spacing.sm }]}>Ritorno</Text>
                          {retSlice.map((g) => (
                            <FlightSegmentCard
                              key={g.key}
                              group={g}
                              selected={selectedReturnKey === g.key}
                              onSelect={() => {
                                const newKey = g.key === selectedReturnKey ? null : g.key;
                                setSelectedReturnKey(newKey);
                                if (newKey) {
                                  const offer = results?.flights.find((f) => g.offerIds.includes(f.id)) ?? null;
                                  replaceFlightByDirection('return', flightGroupToBookingItem('return', g, offer));
                                } else {
                                  removeFlightByDirection('return');
                                }
                              }}
                              direction="return"
                              offer={results?.flights.find((f) => g.offerIds.includes(f.id))}
                            />
                          ))}
                          {!showAllReturn && returnGroups.length > SECTION_DEFAULT && (
                            <ShowMoreButton hiddenCount={returnGroups.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllReturn, true)} />
                          )}
                          {showAllReturn && returnGroups.length > SECTION_DEFAULT && (
                            <ShowLessButton onPress={() => toggleShowMore(setShowAllReturn, false)} />
                          )}
                        </>
                      )}

                      <View style={styles.poweredByRow}>
                        <Text style={styles.poweredBy}>Voli in tempo reale · Powered by Duffel</Text>
                      </View>
                    </>
                  )}
                </ResultSection>
              );
            })()}

            {/* 🏨 Hotel */}
            <ResultSection
              title="🏨 Hotel"
              totalCount={multiCityMode ? cityStops.length : (isHotelsLoading ? 0 : filteredHotels.length)}
              visibleCount={multiCityMode ? cityStops.length : (isHotelsLoading ? undefined : Math.min(SECTION_DEFAULT, filteredHotels.length))}
              rightAction={hasSearched && !isHotelsLoading ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.multiCityChip,
                    multiCityMode && styles.multiCityChipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    if (multiCityMode) { setMultiCityMode(false); setCityStops([], []); } else { setShowMultiCityPanel(true); }
                  }}
                >
                  <Text style={[styles.multiCityChipText, multiCityMode && styles.multiCityChipTextActive]}>
                    {multiCityMode ? `✓ ${cityStops.length} città` : '🗺️ Multi-città'}
                  </Text>
                </Pressable>
              ) : undefined}
            >
              {multiCityMode ? (
                <>
                  {cityStops.map((stop, idx) => (
                    <View key={stop.id}>
                      <CityPanel stop={stop} onPress={() => router.push(`/city/${stop.id}`)} />
                      {idx < cityStops.length - 1 && (() => {
                        const t = transportSuggestions.find((ts) => ts.from.toLowerCase() === stop.name.toLowerCase());
                        if (!t) return null;
                        return (
                          <View style={styles.transportBanner}>
                            <Text style={styles.transportBannerText}>🚄 {t.from} → {t.to} · {t.duration} · ~€{t.price_eur}</Text>
                          </View>
                        );
                      })()}
                    </View>
                  ))}
                  <View style={styles.poweredByRow}>
                    <Text style={styles.poweredBy}>Powered by Booking.com</Text>
                  </View>
                </>
              ) : isHotelsLoading ? (
                <><HotelSkeleton /><HotelSkeleton /></>
              ) : results.hotels.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyRowText}>Nessun hotel trovato per queste date</Text>
                </View>
              ) : (
                <>
                  <FilterBar
                    query={hotelQuery}
                    onQueryChange={setHotelQuery}
                    options={hotelFilterOptions}
                    activeFilters={hotelFilters}
                    onFiltersChange={setHotelFilters}
                    totalCount={results.hotels.length}
                    filteredCount={filteredHotels.length}
                    searchPlaceholder="Cerca per nome hotel o zona..."
                  />
                  {filteredHotels.slice(0, showAllHotels ? filteredHotels.length : SECTION_DEFAULT).map((h) => (
                    <HotelCard
                      key={h.id}
                      hotel={h}
                      nights={nights}
                      selected={selectedHotel === h.id}
                      onSelect={() => {
                        const newId = h.id === selectedHotel ? null : h.id;
                        setSelectedHotel(newId);
                        if (newId) replaceBookingByType('hotel', hotelOfferToBookingItem(h, params));
                        else removeBookingsByType('hotel');
                      }}
                    />
                  ))}
                  {!showAllHotels && filteredHotels.length > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={filteredHotels.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllHotels, true)} />
                  )}
                  {showAllHotels && filteredHotels.length > SECTION_DEFAULT && (
                    <ShowLessButton onPress={() => toggleShowMore(setShowAllHotels, false)} />
                  )}
                  <View style={styles.poweredByRow}>
                    <Text style={styles.poweredBy}>
                      {hotelCacheAgeMs != null ? `Aggiornato ${Math.round(hotelCacheAgeMs / 60000)} min fa · ` : ''}
                      Powered by Booking.com
                    </Text>
                  </View>
                </>
              )}
            </ResultSection>

            {/* 🎯 Attività — hidden in multi-city (CityPanels in Hotel section already handle both hotel + activity selection) */}
            {!multiCityMode && (
              <ResultSection
                title="🎯 Attività"
                totalCount={isActivitiesLoading ? 0 : filteredActivities.length}
                visibleCount={isActivitiesLoading ? undefined : Math.min(SECTION_DEFAULT, filteredActivities.length)}
              >
                {isActivitiesLoading ? (
                  <>
                    <View style={[skStyles.card, { padding: 0 }]}>
                      <View style={[skStyles.photoBlock, { height: 140 }]} />
                      <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
                        <View style={[skStyles.bar, { width: '70%', height: 14 }]} />
                        <View style={[skStyles.bar, { width: '40%', height: 11 }]} />
                      </View>
                    </View>
                    <View style={[skStyles.card, { padding: 0 }]}>
                      <View style={[skStyles.photoBlock, { height: 140 }]} />
                      <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
                        <View style={[skStyles.bar, { width: '60%', height: 14 }]} />
                        <View style={[skStyles.bar, { width: '35%', height: 11 }]} />
                      </View>
                    </View>
                  </>
                ) : activitiesUnavailable ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyRowText}>🔧 Attività temporaneamente non disponibili</Text>
                    <Text style={[styles.emptyRowText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>Quota API esaurita — riprova domani</Text>
                  </View>
                ) : results.activities.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyRowText}>Nessuna attività trovata</Text>
                  </View>
                ) : (
                  <>
                    <FilterBar
                      query={activityQuery}
                      onQueryChange={setActivityQuery}
                      options={activityFilterOptions}
                      activeFilters={activityFilters}
                      onFiltersChange={setActivityFilters}
                      totalCount={results.activities.length}
                      filteredCount={filteredActivities.length}
                      searchPlaceholder="Cerca attività, tour, esperienze..."
                    />
                    {filteredActivities.slice(0, showAllActivities ? filteredActivities.length : SECTION_DEFAULT).map((a) => (
                      <ActivityCard key={a.id} activity={a} selected={selectedActivities.includes(a.id)} onSelect={() => toggleActivity(a.id)} />
                    ))}
                    {!showAllActivities && filteredActivities.length > SECTION_DEFAULT && (
                      <ShowMoreButton hiddenCount={filteredActivities.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllActivities, true)} />
                    )}
                    {showAllActivities && filteredActivities.length > SECTION_DEFAULT && (
                      <ShowLessButton onPress={() => toggleShowMore(setShowAllActivities, false)} />
                    )}
                  </>
                )}
              </ResultSection>
            )}

            {/* 🚗 Auto */}
            {(() => {
              const visible = showAllCars ? filteredCars.length : Math.min(SECTION_DEFAULT, filteredCars.length);
              return (
                <ResultSection title="🚗 Auto" totalCount={filteredCars.length} visibleCount={visible}>
                  {results.cars.length > 0 && (
                    <FilterBar
                      query={carQuery}
                      onQueryChange={setCarQuery}
                      options={carFilterOptions}
                      activeFilters={carFilters}
                      onFiltersChange={setCarFilters}
                      totalCount={results.cars.length}
                      filteredCount={filteredCars.length}
                      searchPlaceholder="Cerca per marca o società..."
                    />
                  )}
                  {filteredCars.slice(0, visible).map((c) => (
                    <CarCard
                      key={c.id}
                      car={c}
                      selected={selectedCar === c.id}
                      onSelect={() => {
                        const newId = c.id === selectedCar ? null : c.id;
                        setSelectedCar(newId);
                        if (newId) replaceBookingByType('car', carOfferToBookingItem(c, params));
                        else removeBookingsByType('car');
                      }}
                    />
                  ))}
                  {filteredCars.length === 0 && results.cars.length > 0 && (
                    <View style={styles.emptyRow}>
                      <Text style={styles.emptyRowText}>Nessun risultato · prova a rimuovere i filtri</Text>
                    </View>
                  )}
                  {!showAllCars && filteredCars.length > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={filteredCars.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllCars, true)} />
                  )}
                  {showAllCars && filteredCars.length > SECTION_DEFAULT && (
                    <ShowLessButton onPress={() => toggleShowMore(setShowAllCars, false)} />
                  )}
                </ResultSection>
              );
            })()}

            {/* 🏥 Assicurazione */}
            {(() => {
              const visible = showAllInsurance ? filteredInsurance.length : Math.min(SECTION_DEFAULT, filteredInsurance.length);
              return (
                <ResultSection title="🏥 Assicurazione" totalCount={filteredInsurance.length} visibleCount={visible}>
                  {results.insurance.length > 0 && (
                    <FilterBar
                      query={insuranceQuery}
                      onQueryChange={setInsuranceQuery}
                      options={insuranceFilterOptions}
                      activeFilters={insuranceFilters}
                      onFiltersChange={setInsuranceFilters}
                      totalCount={results.insurance.length}
                      filteredCount={filteredInsurance.length}
                      searchPlaceholder="Cerca per provider o piano..."
                    />
                  )}
                  {filteredInsurance.slice(0, visible).map((ins) => (
                    <InsuranceCard
                      key={ins.id}
                      plan={ins}
                      selected={selectedInsurance === ins.id}
                      onSelect={() => {
                        const newId = ins.id === selectedInsurance ? null : ins.id;
                        setSelectedInsurance(newId);
                        if (newId) replaceBookingByType('insurance', insurancePlanToBookingItem(ins, params));
                        else removeBookingsByType('insurance');
                      }}
                    />
                  ))}
                  {filteredInsurance.length === 0 && results.insurance.length > 0 && (
                    <View style={styles.emptyRow}>
                      <Text style={styles.emptyRowText}>Nessun risultato · prova a rimuovere i filtri</Text>
                    </View>
                  )}
                  {!showAllInsurance && filteredInsurance.length > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={filteredInsurance.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllInsurance, true)} />
                  )}
                  {showAllInsurance && filteredInsurance.length > SECTION_DEFAULT && (
                    <ShowLessButton onPress={() => toggleShowMore(setShowAllInsurance, false)} />
                  )}
                </ResultSection>
              );
            })()}

            {results.visa && (
              <ResultSection title="🛂 Visto" totalCount={1}>
                <VisaCard visa={results.visa} />
              </ResultSection>
            )}
          </>
        )}
      </ScrollView>

      {hasCart && !isSearching && (
        <CartBar
          items={cartItems}
          totalPrice={totalPrice}
          currency="EUR"
          isDraftUpdate={!!editingDraft}
          draftName={editingDraft?.name}
          onSaveDraft={() => editingDraft ? handleSaveDraft() : setShowDraftModal(true)}
          onCheckout={() => {
            if (!results) return;
            initCheckout(cartItems, totalPrice, 'EUR', results.params, results);
            router.push('/checkout/summary');
          }}
        />
      )}

      <SaveDraftModal
        visible={showDraftModal}
        defaultName={params.destination.split(',')[0]}
        onSave={handleSaveDraft}
        onCancel={() => setShowDraftModal(false)}
      />

      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />

      {/* Multi-city panel — rendered outside ScrollView to avoid VirtualizedList nesting issues */}
      {showMultiCityPanel && (
        <MultiCityPanel
          visible={showMultiCityPanel}
          searchParams={params}
          profile={onboardingData}
          onClose={() => setShowMultiCityPanel(false)}
          onApply={(stops, transport) => {
            setCityStops(stops, transport);
            setMultiCityMode(true);
            setShowMultiCityPanel(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setToastMessage(`Multi-città attivo · ${stops.length} città`);
            setToastVisible(true);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxl },
  heading: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.display,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  emptyState: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl + Spacing.xl, gap: Spacing.md },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.sm },
  emptyTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.xl, color: Colors.text.primary, textAlign: 'center' },
  emptySubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.text.muted, textAlign: 'center', lineHeight: 22 },
  loadingState: { alignItems: 'center', paddingTop: Spacing.xxl + Spacing.xl, gap: Spacing.md },
  loadingText: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.text.muted },
  resultsHeader: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: 3 },
  resultsTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.text.primary },
  resultsSubtitle: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  emptyRow: { paddingVertical: Spacing.lg, alignItems: 'center' },
  emptyRowText: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  directionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingVertical: 4,
  },
  poweredByRow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  poweredBy: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  multiCityChip: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiCityChipActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  multiCityChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
  multiCityChipTextActive: {
    color: Colors.white,
  },
  transportBanner: {
    backgroundColor: Colors.navy + '11',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: Colors.navy + '22',
  },
  transportBannerText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.navy,
    textAlign: 'center',
  },
});
