import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SearchBar } from '../../src/components/search/SearchBar';
import { ResultSection } from '../../src/components/search/ResultSection';
import { FlightCard } from '../../src/components/search/FlightCard';
import { HotelCard } from '../../src/components/search/HotelCard';
import { TransportCard } from '../../src/components/search/TransportCard';
import { ActivityCard } from '../../src/components/search/ActivityCard';
import { InsuranceCard } from '../../src/components/search/InsuranceCard';
import { VisaCard } from '../../src/components/search/VisaCard';
import { CartBar } from '../../src/components/search/CartBar';

import { getMockResults } from '../../src/data/mockSearch';
import { useAppStore } from '../../src/stores/useAppStore';
import type { SearchParams, SearchResults, CartItem } from '../../src/types/booking';
import type { Trip, TripItem } from '../../src/types/trip';
import { Colors, FontFamily, FontSize, Spacing } from '../../src/constants/theme';

const CART_BAR_HEIGHT = 72;

const DEFAULT_PARAMS: SearchParams = {
  destination: 'Tokyo, Giappone',
  destinationCode: 'NRT',
  checkIn: new Date(2026, 6, 15),
  checkOut: new Date(2026, 6, 22),
  travelers: 2,
};

function nightsBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

export default function SearchScreen() {
  const router = useRouter();
  const addTrip = useAppStore((s) => s.addTrip);
  const [params, setParams] = useState<SearchParams>(DEFAULT_PARAMS);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);

  // Selections
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [selectedTransports, setSelectedTransports] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);

  const handleSearch = () => {
    const r = getMockResults(params);
    setResults(r);
    setHasSearched(true);
    // Reset selections on new search
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSelectedTransports([]);
    setSelectedActivities([]);
    setSelectedInsurance(null);
  };

  const toggleTransport = (id: string) =>
    setSelectedTransports((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleActivity = (id: string) =>
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Derive cart from selections
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

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price, 0),
    [cartItems]
  );

  const nights = nightsBetween(params.checkIn, params.checkOut);
  const hasCart = cartItems.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          hasCart && { paddingBottom: CART_BAR_HEIGHT + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <Text style={styles.heading}>Cerca</Text>
        <SearchBar params={params} onChange={setParams} onSearch={handleSearch} />

        {/* Empty state */}
        {!hasSearched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>Dove vuoi andare?</Text>
            <Text style={styles.emptySubtitle}>
              Cerca voli, hotel, attività e assicurazione in un colpo solo
            </Text>
          </View>
        )}

        {/* Results */}
        {results && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Risultati per {results.params.destination}</Text>
              <Text style={styles.resultsSubtitle}>
                {nightsBetween(results.params.checkIn, results.params.checkOut)} notti · {results.params.travelers} {results.params.travelers === 1 ? 'persona' : 'persone'}
              </Text>
            </View>

            {/* ✈️ Voli */}
            <ResultSection title="✈️ Voli" count={results.flights.length}>
              {results.flights.map((f) => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  selected={selectedFlight === f.id}
                  onSelect={() => setSelectedFlight(f.id === selectedFlight ? null : f.id)}
                />
              ))}
            </ResultSection>

            {/* 🏨 Hotel */}
            <ResultSection title="🏨 Hotel" count={results.hotels.length}>
              {results.hotels.map((h) => (
                <HotelCard
                  key={h.id}
                  hotel={h}
                  nights={nights}
                  selected={selectedHotel === h.id}
                  onSelect={() => setSelectedHotel(h.id === selectedHotel ? null : h.id)}
                />
              ))}
            </ResultSection>

            {/* 🚗 Trasporti */}
            <ResultSection title="🚗 Trasporti" count={results.transports.length}>
              {results.transports.map((t) => (
                <TransportCard
                  key={t.id}
                  transport={t}
                  selected={selectedTransports.includes(t.id)}
                  onSelect={() => toggleTransport(t.id)}
                />
              ))}
            </ResultSection>

            {/* 🎯 Attività */}
            <ResultSection title="🎯 Attività" count={results.activities.length}>
              {results.activities.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  selected={selectedActivities.includes(a.id)}
                  onSelect={() => toggleActivity(a.id)}
                />
              ))}
            </ResultSection>

            {/* 🏥 Assicurazione */}
            <ResultSection title="🏥 Assicurazione" count={results.insurance.length}>
              {results.insurance.map((ins) => (
                <InsuranceCard
                  key={ins.id}
                  plan={ins}
                  selected={selectedInsurance === ins.id}
                  onSelect={() => setSelectedInsurance(ins.id === selectedInsurance ? null : ins.id)}
                />
              ))}
            </ResultSection>

            {/* 🛂 Visto */}
            {results.visa && (
              <ResultSection title="🛂 Visto" count={1}>
                <VisaCard visa={results.visa} />
              </ResultSection>
            )}
          </>
        )}
      </ScrollView>

      {/* Cart bar */}
      {hasCart && (
        <CartBar
          items={cartItems}
          totalPrice={totalPrice}
          currency="EUR"
          onCheckout={() => {
            if (!results) return;
            const tripItems: TripItem[] = cartItems.map((ci, idx) => ({
              id: `${ci.type}-${ci.offerId}`,
              type: ci.type,
              title: ci.name,
              subtitle: ci.type === 'flight' ? `${results.params.destination}` : ci.name,
              dateLabel: `${results.params.checkIn.toLocaleDateString('it-IT')} – ${results.params.checkOut.toLocaleDateString('it-IT')}`,
              confirmCode: `VYG-${Date.now().toString(36).toUpperCase()}-${idx}`,
              price: ci.price,
            }));

            const checkIn = results.params.checkIn;
            const checkOut = results.params.checkOut;
            const fmt = (d: Date) =>
              d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

            const trip: Trip = {
              id: `trip-${Date.now()}`,
              destination: results.params.destination,
              destinationCode: results.params.destinationCode ?? '',
              coverEmoji: '✈️',
              dateRange: `${fmt(checkIn)} – ${fmt(checkOut)}`,
              status: 'upcoming',
              travelers: results.params.travelers,
              totalPrice,
              currency: 'EUR',
              bookingRef: `VYG-${Date.now().toString(36).toUpperCase()}`,
              items: tripItems,
            };

            addTrip(trip);
            router.push('/(tabs)/trips');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  heading: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.display,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl + Spacing.xl,
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: 3,
  },
  resultsTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  resultsSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
});
