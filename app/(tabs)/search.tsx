import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Modal, TextInput, Pressable } from 'react-native';
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
import { TransportCard } from '../../src/components/search/TransportCard';
import { ActivityCard } from '../../src/components/search/ActivityCard';
import { InsuranceCard } from '../../src/components/search/InsuranceCard';
import { VisaCard } from '../../src/components/search/VisaCard';
import { CartBar } from '../../src/components/search/CartBar';

import { getMockResults, DEFAULT_SEARCH_PARAMS } from '../../src/data/mockSearch';
import { searchFlights, DuffelError } from '../../src/services/duffel';
import type { SearchParams, SearchResults, CartItem, FlightOffer } from '../../src/types/booking';
import type { Trip } from '../../src/types/trip';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

const CART_BAR_HEIGHT = 88;

function nightsBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

// ─── FlightSkeleton ───────────────────────────────────────────────────────────

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

const skStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
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
});

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

  // Selections
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [selectedTransports, setSelectedTransports] = useState<string[]>([]);
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
        else if (type === 'transport') setSelectedTransports((prev) => [...prev, offerId]);
        else if (type === 'activity') setSelectedActivities((prev) => [...prev, offerId]);
        else if (type === 'insurance') setSelectedInsurance(offerId);
      }
    }, [pendingDraftRestore]),
  );

  const handleSearch = async () => {
    setIsSearching(true);
    setIsFlightsLoading(true);
    setResults(null);
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedTransports([]);
    setSelectedActivities([]);
    setSelectedInsurance(null);

    // Load non-flight results immediately from mock
    const mockBase = getMockResults(params);
    const partialResults: SearchResults = {
      ...mockBase,
      flights: [],
    };
    setResults(partialResults);
    setHasSearched(true);
    setIsSearching(false);

    // Fetch real flights from Duffel
    let realFlights: FlightOffer[] | null = null;
    try {
      realFlights = await searchFlights(params, onboardingData);
    } catch (err) {
      if (__DEV__) console.warn('[search] Duffel error:', err);
      const msg = err instanceof DuffelError
        ? 'Ricerca voli non disponibile, riprova'
        : 'Ricerca voli non disponibile, riprova';
      setToastMessage(msg);
      setToastVisible(true);
    } finally {
      setIsFlightsLoading(false);
    }

    setResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        flights: realFlights ?? mockBase.flights,
      };
    });
  };

  const toggleTransport = (id: string) =>
    setSelectedTransports((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

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
    selectedTransports.forEach((tid) => {
      const t = results.transports.find((x) => x.id === tid);
      if (t) items.push({ type: 'transport', offerId: t.id, name: t.name, price: t.totalPrice, currency: t.currency });
    });
    selectedActivities.forEach((aid) => {
      const a = results.activities.find((x) => x.id === aid);
      if (a) items.push({ type: 'activity', offerId: a.id, name: a.name, price: a.price * params.travelers, currency: a.currency });
    });
    if (selectedInsurance) {
      const ins = results.insurance.find((x) => x.id === selectedInsurance);
      if (ins) items.push({ type: 'insurance', offerId: ins.id, name: ins.name, price: ins.price * params.travelers, currency: ins.currency });
    }
    return items;
  }, [results, selectedFlight, selectedHotel, selectedTransports, selectedActivities, selectedInsurance, params.travelers]);

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
        <SearchBar params={params} onChange={setParams} onSearch={handleSearch} isLoading={isSearching || isFlightsLoading} />

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

            {/* ✈️ Voli — real Duffel or skeleton */}
            <ResultSection title="✈️ Voli" count={isFlightsLoading ? 0 : results.flights.length}>
              {isFlightsLoading ? (
                <>
                  <FlightSkeleton />
                  <FlightSkeleton />
                  <FlightSkeleton />
                </>
              ) : results.flights.length === 0 ? (
                <View style={styles.flightEmpty}>
                  <Text style={styles.flightEmptyText}>Nessun volo trovato per queste date</Text>
                </View>
              ) : (
                <>
                  {results.flights.map((f) => (
                    <FlightCard key={f.id} flight={f} selected={selectedFlight === f.id} onSelect={() => setSelectedFlight(f.id === selectedFlight ? null : f.id)} />
                  ))}
                  <Text style={styles.poweredBy}>Voli in tempo reale · Powered by Duffel</Text>
                </>
              )}
            </ResultSection>

            <ResultSection title="🏨 Hotel" count={results.hotels.length}>
              {results.hotels.map((h) => (
                <HotelCard key={h.id} hotel={h} nights={nights} selected={selectedHotel === h.id} onSelect={() => setSelectedHotel(h.id === selectedHotel ? null : h.id)} />
              ))}
            </ResultSection>

            <ResultSection title="🚗 Trasporti" count={results.transports.length}>
              {results.transports.map((t) => (
                <TransportCard key={t.id} transport={t} selected={selectedTransports.includes(t.id)} onSelect={() => toggleTransport(t.id)} />
              ))}
            </ResultSection>

            <ResultSection title="🎯 Attività" count={results.activities.length}>
              {results.activities.map((a) => (
                <ActivityCard key={a.id} activity={a} selected={selectedActivities.includes(a.id)} onSelect={() => toggleActivity(a.id)} />
              ))}
            </ResultSection>

            <ResultSection title="🏥 Assicurazione" count={results.insurance.length}>
              {results.insurance.map((ins) => (
                <InsuranceCard key={ins.id} plan={ins} selected={selectedInsurance === ins.id} onSelect={() => setSelectedInsurance(ins.id === selectedInsurance ? null : ins.id)} />
              ))}
            </ResultSection>

            {results.visa && (
              <ResultSection title="🛂 Visto" count={1}>
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
  flightEmpty: { paddingVertical: Spacing.lg, alignItems: 'center' },
  flightEmptyText: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  poweredBy: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
});
