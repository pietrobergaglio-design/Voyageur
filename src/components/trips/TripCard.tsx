import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Trip } from '../../types/trip';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const STATUS_CONFIG = {
  draft:  { label: 'Bozza',      bg: Colors.navy + '14',    color: Colors.navy },
  booked: { label: 'Prenotato',  bg: Colors.teal + '18',    color: Colors.teal },
  active: { label: 'In corso',   bg: Colors.accent + '18',  color: Colors.accent },
  past:   { label: 'Concluso',   bg: Colors.border,         color: Colors.text.muted },
};

interface Props {
  trip: Trip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: Props) {
  const sc = STATUS_CONFIG[trip.status];
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Viaggio ${trip.name ?? trip.destination}`}
    >
      <View style={styles.top}>
        <Text style={styles.emoji}>{trip.coverEmoji}</Text>
        <View style={styles.info}>
          {trip.name ? (
            <>
              <Text style={styles.name} numberOfLines={1}>{trip.name}</Text>
              <Text style={styles.destination} numberOfLines={1}>{trip.destination}</Text>
            </>
          ) : (
            <Text style={styles.name} numberOfLines={1}>{trip.destination}</Text>
          )}
          <Text style={styles.dates}>{trip.dateRange}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>
          {trip.travelers} {trip.travelers === 1 ? 'persona' : 'persone'} · {(trip.bookings?.length ?? 0)} elementi
        </Text>
        <Text style={[styles.price, trip.status === 'draft' && styles.priceDraft]}>
          {trip.totalPrice.toLocaleString('it-IT')} {trip.currency}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardPressed: { opacity: 0.85 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: { fontSize: 32 },
  info: { flex: 1, gap: 1 },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  destination: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  dates: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  priceDraft: {
    color: Colors.text.muted,
  },
});
