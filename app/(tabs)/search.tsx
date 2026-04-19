import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Modal, TextInput, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { useAppStore } from '../../src/stores/useAppStore';
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

import { getMockResults, DEFAULT_SEARCH_PARAMS } from '../../src/data/mockSearch';
import { searchFlights, DuffelError } from '../../src/services/duffel';
import { searchHotels, BookingError } from '../../src/services/booking';
import { searchActivities } from '../../src/services/activities';
import { generateMockCars } from '../../src/services/cars';
import { getVisaInfo } from '../../src/services/visa';
import type { SearchParams, SearchResults, CartItem, FlightSegment } from '../../src/types/booking';
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const initCheckout = useCheckoutStore((s) => s.initCheckout);
  const pendingDraftRestore = useCheckoutStore((s) => s.pendingDraftRestore);
  const setPendingDraftRestore = useCheckoutStore((s) => s.setPendingDraftRestore);
  const multiCityMode = useCheckoutStore((s) => s.multiCityMode);
  const cityStops = useCheckoutStore((s) => s.cityStops);
  const transportSuggestions = useCheckoutStore((s) => s.transportSuggestions);
  const setMultiCityMode = useCheckoutStore((s) => s.setMultiCityMode);
  const setCityStops = useCheckoutStore((s) => s.setCityStops);
  const clearMultiCity = useCheckoutStore((s) => s.clearMultiCity);
  const addTrip = useAppStore((s) => s.addTrip);
  const onboardingData = useAppStore((s) => s.onboardingData);

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

      for (const { type, offerId } of restore.itemIds) {
        if (type === 'flight') setSelectedFlight(offerId);
        else if (type === 'hotel') setSelectedHotel(offerId);
        else if (type === 'car') setSelectedCar(offerId);
        else if (type === 'activity') setSelectedActivities((prev) => [...prev, offerId]);
        else if (type === 'insurance') setSelectedInsurance(offerId);
      }
    }, [pendingDraftRestore]),
  );

  const handleSearch = async () => {
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
    setShowAllOutbound(false);
    setShowAllReturn(false);
    setShowAllFlights(false);
    setShowAllHotels(false);
    setShowAllCars(false);
    setShowAllActivities(false);
    setShowAllInsurance(false);

    // Generate cars + visa immediately (sync/near-sync)
    const mockBase = getMockResults(params);
    const cars = generateMockCars(params, onboardingData);
    const visa = getVisaInfo(params.destination, onboardingData.nationality || 'IT');

    setResults({ ...mockBase, flights: [], hotels: [], cars, activities: [], visa });
    setHasSearched(true);
    setIsSearching(false);

    // Fetch flights, hotels, activities independently
    const flightPromise = searchFlights(params, onboardingData)
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

  const toggleActivity = (id: string) =>
    setSelectedActivities((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const cartItems = useMemo<CartItem[]>(() => {
    if (!results) return [];
    const items: CartItem[] = [];
    if (selectedFlight) {
      const f = results.flights.find((x) => x.id === selectedFlight);
      if (f) items.push({ type: 'flight', offerId: f.id, name: `${f.airline} ${f.segments[0].origin}→${f.segments[f.segments.length - 1].destination}`, price: f.price, currency: f.currency });
    }
    if (selectedHotel) {
      const h = results.hotels.find((x) => x.id === selectedHotel);
      if (h) items.push({ type: 'hotel', offerId: h.id, name: h.name, price: h.totalPrice, currency: h.currency });
    }
    if (selectedCar) {
      const c = results.cars.find((x) => x.id === selectedCar);
      if (c) items.push({ type: 'car', offerId: c.id, name: `${c.company} · ${c.name}`, price: c.totalPrice, currency: c.currency });
    }
    selectedActivities.forEach((aid) => {
      const a = results.activities.find((x) => x.id === aid);
      if (a) items.push({ type: 'activity', offerId: a.id, name: a.name, price: a.price * params.travelers, currency: a.currency });
    });
    if (selectedInsurance) {
      const ins = results.insurance.find((x) => x.id === selectedInsurance);
      if (ins) items.push({ type: 'insurance', offerId: ins.id, name: ins.name, price: ins.price * params.travelers, currency: ins.currency });
    }
    return items;
  }, [results, selectedFlight, selectedHotel, selectedCar, selectedActivities, selectedInsurance, params.travelers]);

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

  const nights = nightsBetween(params.checkIn, params.checkOut);
  const hasCart = cartItems.length > 0;

  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleSaveDraft = (name: string) => {
    if (!results) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const draftItems = cartItems.map((ci) => ({
      id: `${ci.type}-${ci.offerId}`,
      type: ci.type,
      title: ci.name,
      subtitle: ci.name,
      dateLabel: `${fmt(params.checkIn)} – ${fmt(params.checkOut)}`,
      confirmCode: '',
      price: ci.price,
    })) as Trip['items'];

    const draft: Trip = {
      id: `draft-${Date.now()}`,
      name,
      destination: params.destination,
      destinationCode: params.destinationCode ?? '',
      coverEmoji: '📋',
      dateRange: `${fmt(params.checkIn)} – ${fmt(params.checkOut)}`,
      checkIn: params.checkIn.toISOString(),
      checkOut: params.checkOut.toISOString(),
      status: 'draft',
      travelers: params.travelers,
      totalPrice,
      currency: 'EUR',
      items: draftItems,
      bookingRef: '',
      createdAt: new Date().toISOString(),
      isMultiCity: multiCityMode || undefined,
      cityStops: multiCityMode ? cityStops : undefined,
      transportSuggestions: multiCityMode ? transportSuggestions : undefined,
    };

    addTrip(draft);
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
                          onSelect={() => setSelectedOutboundKey(g.key === selectedOutboundKey ? null : g.key)}
                          direction="outbound"
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
                              onSelect={() => setSelectedReturnKey(g.key === selectedReturnKey ? null : g.key)}
                              direction="return"
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
              totalCount={multiCityMode ? cityStops.length : (isHotelsLoading ? 0 : results.hotels.length)}
              visibleCount={multiCityMode ? cityStops.length : (isHotelsLoading ? undefined : Math.min(SECTION_DEFAULT, results.hotels.length))}
              rightAction={hasSearched && !isHotelsLoading ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.multiCityChip,
                    multiCityMode && styles.multiCityChipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    if (multiCityMode) {
                      clearMultiCity();
                    } else {
                      setShowMultiCityPanel(true);
                    }
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
                      <CityPanel
                        stop={stop}
                        onPress={() => router.push(`/city/${stop.id}`)}
                      />
                      {/* Transport banner between cities */}
                      {idx < cityStops.length - 1 && (() => {
                        const t = transportSuggestions.find(
                          (ts) => ts.from.toLowerCase() === stop.name.toLowerCase(),
                        );
                        if (!t) return null;
                        return (
                          <View style={styles.transportBanner}>
                            <Text style={styles.transportBannerText}>
                              🚄 {t.from} → {t.to} · {t.duration} · ~€{t.price_eur}
                            </Text>
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
                  {results.hotels.slice(0, showAllHotels ? results.hotels.length : SECTION_DEFAULT).map((h) => (
                    <HotelCard key={h.id} hotel={h} nights={nights} selected={selectedHotel === h.id} onSelect={() => setSelectedHotel(h.id === selectedHotel ? null : h.id)} />
                  ))}
                  {!showAllHotels && results.hotels.length > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={results.hotels.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllHotels, true)} />
                  )}
                  {showAllHotels && results.hotels.length > SECTION_DEFAULT && (
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

            {/* 🚗 Auto */}
            {(() => {
              const total = results.cars.length;
              const visible = showAllCars ? total : Math.min(SECTION_DEFAULT, total);
              const slice = results.cars.slice(0, visible);
              return (
                <ResultSection
                  title="🚗 Auto"
                  totalCount={total}
                  visibleCount={visible}
                >
                  {slice.map((c) => (
                    <CarCard key={c.id} car={c} selected={selectedCar === c.id} onSelect={() => setSelectedCar(c.id === selectedCar ? null : c.id)} />
                  ))}
                  {!showAllCars && total > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={total - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllCars, true)} />
                  )}
                  {showAllCars && total > SECTION_DEFAULT && (
                    <ShowLessButton onPress={() => toggleShowMore(setShowAllCars, false)} />
                  )}
                </ResultSection>
              );
            })()}

            {/* 🎯 Attività */}
            <ResultSection
              title="🎯 Attività"
              totalCount={multiCityMode ? cityStops.length : (isActivitiesLoading ? 0 : results.activities.length)}
              visibleCount={multiCityMode ? cityStops.length : (isActivitiesLoading ? undefined : Math.min(SECTION_DEFAULT, results.activities.length))}
            >
              {multiCityMode ? (
                cityStops.map((stop) => (
                  <CityPanel
                    key={stop.id}
                    stop={stop}
                    onPress={() => router.push(`/city/${stop.id}`)}
                  />
                ))
              ) : isActivitiesLoading ? (
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
                  {results.activities.slice(0, showAllActivities ? results.activities.length : SECTION_DEFAULT).map((a) => (
                    <ActivityCard key={a.id} activity={a} selected={selectedActivities.includes(a.id)} onSelect={() => toggleActivity(a.id)} />
                  ))}
                  {!showAllActivities && results.activities.length > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={results.activities.length - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllActivities, true)} />
                  )}
                  {showAllActivities && results.activities.length > SECTION_DEFAULT && (
                    <ShowLessButton onPress={() => toggleShowMore(setShowAllActivities, false)} />
                  )}
                </>
              )}
            </ResultSection>

            {/* 🏥 Assicurazione */}
            {(() => {
              const total = results.insurance.length;
              const visible = showAllInsurance ? total : Math.min(SECTION_DEFAULT, total);
              const slice = results.insurance.slice(0, visible);
              return (
                <ResultSection
                  title="🏥 Assicurazione"
                  totalCount={total}
                  visibleCount={visible}
                >
                  {slice.map((ins) => (
                    <InsuranceCard key={ins.id} plan={ins} selected={selectedInsurance === ins.id} onSelect={() => setSelectedInsurance(ins.id === selectedInsurance ? null : ins.id)} />
                  ))}
                  {!showAllInsurance && total > SECTION_DEFAULT && (
                    <ShowMoreButton hiddenCount={total - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllInsurance, true)} />
                  )}
                  {showAllInsurance && total > SECTION_DEFAULT && (
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
          onSaveDraft={() => setShowDraftModal(true)}
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
