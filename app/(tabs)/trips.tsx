import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../../src/stores/useAppStore';
import { TripCard } from '../../src/components/trips/TripCard';
import { mockTokyoTrip } from '../../src/data/mockTrip';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';
import type { Trip } from '../../src/types/trip';

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );
}

function TripSection({ title, trips }: { title: string; trips: Trip[] }) {
  if (trips.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} count={trips.length} />
      {trips.map((trip) => (
        <TripCard
          key={trip.id}
          trip={trip}
          onPress={() => router.push(`/trip/${trip.id}`)}
        />
      ))}
    </View>
  );
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const storeTrips = useAppStore((s) => s.trips);

  const isEmpty = storeTrips.length === 0;
  const allTrips = isEmpty ? [mockTokyoTrip] : storeTrips;

  const drafts = allTrips.filter((t) => t.status === 'draft');
  const booked = allTrips.filter((t) => t.status === 'booked' || t.status === 'active');
  const past = allTrips.filter((t) => t.status === 'past');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.heading}>Viaggi</Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>✈️</Text>
          <Text style={styles.emptyTitle}>Nessun viaggio ancora</Text>
          <Text style={styles.emptySubtitle}>
            Cerca la tua prossima destinazione e salva una bozza o prenota subito.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <TripSection title="Bozze" trips={drafts} />
          <TripSection title="Prenotati" trips={booked} />
          <TripSection title="Passati" trips={past} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  heading: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.display,
    color: Colors.text.primary,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.xl,
  },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  sectionBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 56 },
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
});
