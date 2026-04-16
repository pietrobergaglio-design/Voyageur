import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Trip } from '../../types/trip';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const STATUS_CONFIG = {
  upcoming:  { label: 'In arrivo',   bg: Colors.teal + '18',   color: Colors.teal },
  ongoing:   { label: 'In corso',    bg: Colors.accent + '18', color: Colors.accent },
  past:      { label: 'Concluso',    bg: Colors.border,        color: Colors.text.muted },
  cancelled: { label: 'Cancellato', bg: '#dc262618',           color: '#dc2626' },
};

interface Props {
  trip: Trip;
  onPress: () => void;
}

export function TripCard({ trip, onPress }: Props) {
  const sc = STATUS_CONFIG[trip.status];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.top}>
        <Text style={styles.emoji}>{trip.coverEmoji}</Text>
        <View style={styles.info}>
          <Text style={styles.destination}>{trip.destination}</Text>
          <Text style={styles.dates}>{trip.dateRange}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>{trip.travelers} {trip.travelers === 1 ? 'persona' : 'persone'} · {trip.items.length} elementi</Text>
        <Text style={styles.price}>{trip.totalPrice.toLocaleString('it-IT')} {trip.currency}</Text>
      </View>
    </TouchableOpacity>
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  destination: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  dates: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
});
