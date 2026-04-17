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
import { Toast } from '../../src/components/common/Toast';

import { SearchBar } from '../../src/components/search/SearchBar';
import { ResultSection } from '../../src/components/search/ResultSection';
import { FlightCard } from '../../src/components/search/FlightCard';
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
import type { SearchParams, SearchResults, CartItem } from '../../src/types/booking';
import type { Trip } from '../../src/types/trip';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

const CART_BAR_HEIGHT = 88;

function nightsBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
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
  const addTrip = useAppStore((s) => s.addTrip);
  const onboardingData = useAppStore((s) => s.onboardingData);

  const [params, setParams] = useState<SearchParams>(DEFAULT_SEARCH_PARAMS);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFlightsLoading, setIsFlightsLoading] = useState(false);
  const [isHotelsLoading, setIsHotelsLoading] = useState(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
  const [hotelCacheAgeMs, setHotelCacheAgeMs] = useState<number | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
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
    setHotelCacheAgeMs(null);
    setResults(null);
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedCar(null);
    setSelectedActivities([]);
    setSelectedInsurance(null);
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
        if (__DEV__) console.warn('[search] Activities error:', err);
        setResults((prev) => prev ? { ...prev, activities: mockBase.activities } : prev);
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
    };

    addTrip(draft);
    setShowDraftModal(false);
    setToastMessage('Bozza salvata!');
    setToastVisible(true);
    setTimeout(() => {
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
              const total = results.flights.length;
              const visible = showAllFlights ? total : Math.min(SECTION_DEFAULT, total);
              const slice = results.flights.slice(0, visible);
              return (
                <ResultSection
                  title="✈️ Voli"
                  totalCount={isFlightsLoading ? 0 : total}
                  visibleCount={isFlightsLoading ? undefined : visible}
                >
                  {isFlightsLoading ? (
                    <><FlightSkeleton /><FlightSkeleton /><FlightSkeleton /></>
                  ) : total === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text style={styles.emptyRowText}>Nessun volo trovato per queste date</Text>
                    </View>
                  ) : (
                    <>
                      {slice.map((f) => (
                        <FlightCard key={f.id} flight={f} selected={selectedFlight === f.id} onSelect={() => setSelectedFlight(f.id === selectedFlight ? null : f.id)} />
                      ))}
                      {!showAllFlights && total > SECTION_DEFAULT && (
                        <ShowMoreButton hiddenCount={total - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllFlights, true)} />
                      )}
                      {showAllFlights && total > SECTION_DEFAULT && (
                        <ShowLessButton onPress={() => toggleShowMore(setShowAllFlights, false)} />
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
            {(() => {
              const total = results.hotels.length;
              const visible = showAllHotels ? total : Math.min(SECTION_DEFAULT, total);
              const slice = results.hotels.slice(0, visible);
              return (
                <ResultSection
                  title="🏨 Hotel"
                  totalCount={isHotelsLoading ? 0 : total}
                  visibleCount={isHotelsLoading ? undefined : visible}
                >
                  {isHotelsLoading ? (
                    <><HotelSkeleton /><HotelSkeleton /></>
                  ) : total === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text style={styles.emptyRowText}>Nessun hotel trovato per queste date</Text>
                    </View>
                  ) : (
                    <>
                      {slice.map((h) => (
                        <HotelCard key={h.id} hotel={h} nights={nights} selected={selectedHotel === h.id} onSelect={() => setSelectedHotel(h.id === selectedHotel ? null : h.id)} />
                      ))}
                      {!showAllHotels && total > SECTION_DEFAULT && (
                        <ShowMoreButton hiddenCount={total - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllHotels, true)} />
                      )}
                      {showAllHotels && total > SECTION_DEFAULT && (
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
              );
            })()}

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
            {(() => {
              const total = results.activities.length;
              const visible = showAllActivities ? total : Math.min(SECTION_DEFAULT, total);
              const slice = results.activities.slice(0, visible);
              return (
                <ResultSection
                  title="🎯 Attività"
                  totalCount={isActivitiesLoading ? 0 : total}
                  visibleCount={isActivitiesLoading ? undefined : visible}
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
                  ) : total === 0 ? (
                    <View style={styles.emptyRow}>
                      <Text style={styles.emptyRowText}>Nessuna attività trovata</Text>
                    </View>
                  ) : (
                    <>
                      {slice.map((a) => (
                        <ActivityCard key={a.id} activity={a} selected={selectedActivities.includes(a.id)} onSelect={() => toggleActivity(a.id)} />
                      ))}
                      {!showAllActivities && total > SECTION_DEFAULT && (
                        <ShowMoreButton hiddenCount={total - SECTION_DEFAULT} onPress={() => toggleShowMore(setShowAllActivities, true)} />
                      )}
                      {showAllActivities && total > SECTION_DEFAULT && (
                        <ShowLessButton onPress={() => toggleShowMore(setShowAllActivities, false)} />
                      )}
                    </>
                  )}
                </ResultSection>
              );
            })()}

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
  poweredByRow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  poweredBy: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
