import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';
import type { Trip, TripItem } from '../../src/types/trip';

const pad = (n: number) => String(n).padStart(2, '0');

function buildTrip(snapshot: NonNullable<ReturnType<typeof useCheckoutStore.getState>['snapshot']>, bookingRef: string): Trip {
  const { cartItems, finalTotal, currency, searchParams, results } = snapshot;
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

  const items: TripItem[] = cartItems.map((ci, idx) => {
    const base: TripItem = {
      id: `${ci.type}-${ci.offerId}`,
      type: ci.type,
      title: ci.name,
      subtitle: ci.name,
      dateLabel: `${fmt(searchParams.checkIn)} – ${fmt(searchParams.checkOut)}`,
      confirmCode: `${bookingRef}-${idx.toString(36).toUpperCase()}`,
      price: ci.price,
    };

    if (ci.type === 'flight') {
      const f = results.flights.find((x) => x.id === ci.offerId);
      if (f) {
        const seg = f.segments[0];
        const last = f.segments[f.segments.length - 1];
        return {
          ...base,
          subtitle: `${f.airline} · ${seg.origin}→${last.destination}`,
          refundPolicy: f.refundPolicy,
          iata: { origin: seg.origin, destination: last.destination },
          departureAt: seg.departureAt,
          arrivalAt: last.arrivalAt,
        };
      }
    }
    if (ci.type === 'hotel') {
      const h = results.hotels.find((x) => x.id === ci.offerId);
      if (h) return { ...base, subtitle: `${h.name} · ${h.zone}`, refundPolicy: h.refundPolicy };
    }
    if (ci.type === 'transport') {
      const t = results.transports.find((x) => x.id === ci.offerId);
      if (t) return { ...base, subtitle: t.description, refundPolicy: t.refundPolicy };
    }
    if (ci.type === 'activity') {
      const a = results.activities.find((x) => x.id === ci.offerId);
      if (a) return { ...base, subtitle: `${a.suggestedDay} · ${a.durationHours}h` };
    }
    if (ci.type === 'insurance') {
      const ins = results.insurance.find((x) => x.id === ci.offerId);
      if (ins) return { ...base, subtitle: ins.name, insuranceProvider: 'Qover', coverageItems: ins.coverageItems };
    }
    return base;
  });

  return {
    id: `trip-${Date.now()}`,
    name: searchParams.destination.split(',')[0],
    destination: searchParams.destination,
    destinationCode: searchParams.destinationCode ?? '',
    coverEmoji: '✈️',
    dateRange: `${fmt(searchParams.checkIn)} – ${fmt(searchParams.checkOut)}`,
    checkIn: searchParams.checkIn.toISOString(),
    checkOut: searchParams.checkOut.toISOString(),
    status: 'booked',
    travelers: searchParams.travelers,
    totalPrice: finalTotal,
    currency,
    bookingRef,
    items,
    createdAt: new Date().toISOString(),
    bookedAt: new Date().toISOString(),
  };
}

export default function SuccessScreen() {
  const { snapshot, bookingRef, draftTripId, reset } = useCheckoutStore();
  const addTrip = useAppStore((s) => s.addTrip);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const existingDraft = useAppStore((s) => draftTripId ? s.trips.find((t) => t.id === draftTripId) : null);

  const checkScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const btnsOpacity = useSharedValue(0);
  const tripAdded = useRef(false);

  useEffect(() => {
    if (!snapshot || !bookingRef) {
      router.replace('/(tabs)/search');
      return;
    }

    if (!tripAdded.current) {
      tripAdded.current = true;
      const trip = buildTrip(snapshot, bookingRef);
      if (draftTripId) {
        updateTrip(draftTripId, {
          ...trip,
          id: draftTripId,
          name: existingDraft?.name ?? trip.name,
          status: 'booked',
          bookedAt: new Date().toISOString(),
        });
      } else {
        addTrip(trip);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    checkScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    contentOpacity.value = withDelay(400, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
    btnsOpacity.value = withDelay(700, withTiming(1, { duration: 350 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const btnsStyle = useAnimatedStyle(() => ({ opacity: btnsOpacity.value }));

  if (!snapshot || !bookingRef) return null;

  const { searchParams, finalTotal, currency } = snapshot;
  const fmt = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

  const navigateTrips = () => {
    reset();
    router.replace('/(tabs)/trips');
  };

  const navigateDocs = () => {
    reset();
    router.replace('/(tabs)/docs');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>

        <Animated.View style={[styles.textBlock, contentStyle]}>
          <Text style={styles.title}>Viaggio confermato! 🎉</Text>
          <Text style={styles.subtitle}>
            Ti aspettiamo a {searchParams.destination.split(',')[0]}{'\n'}
            il {fmt(searchParams.checkIn)}
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Destinazione</Text>
              <Text style={styles.summaryValue}>{searchParams.destination}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {fmt(searchParams.checkIn)} – {fmt(searchParams.checkOut)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Totale pagato</Text>
              <Text style={styles.summaryTotal}>{finalTotal.toLocaleString('it-IT')} {currency}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Codice conferma</Text>
              <Text style={styles.confirmCode}>{bookingRef}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.btns, btnsStyle]}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={navigateTrips}
            accessibilityRole="button"
          >
            <Text style={styles.btnPrimaryText}>Vedi il mio viaggio →</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
            onPress={navigateDocs}
            accessibilityRole="button"
          >
            <Text style={styles.btnSecondaryText}>Vai ai documenti</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkIcon: { fontSize: 42, color: Colors.white, fontFamily: FontFamily.bodyBold },
  textBlock: { alignItems: 'center', gap: Spacing.md, width: '100%' },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  summaryLabel: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted, flexShrink: 0 },
  summaryValue: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary, textAlign: 'right', flex: 1 },
  summaryTotal: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.md, color: Colors.accent },
  confirmCode: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.navy,
    letterSpacing: 1,
    textAlign: 'right',
    flex: 1,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  btns: { width: '100%', gap: Spacing.sm },
  btnPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPressed: { opacity: 0.88 },
  btnPrimaryText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },
  btnSecondary: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 50,
    justifyContent: 'center',
  },
  btnSecondaryPressed: { backgroundColor: Colors.border + '30' },
  btnSecondaryText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.text.secondary },
});
