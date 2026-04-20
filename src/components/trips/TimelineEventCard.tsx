import { Pressable, View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { TimelineEvent } from '../../utils/itinerary-builder';
import type { BookingType } from '../../types/booking';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

// ─── Dot color per booking type ────────────────────────────────────────────────

const DOT_COLOR: Record<BookingType, string> = {
  flight: Colors.navy,
  hotel: Colors.teal,
  activity: Colors.accent,
  car: '#7c3aed',
  transfer: '#d97706',
  insurance: Colors.text.muted,
  visa: Colors.text.muted,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  event: TimelineEvent;
  isLast: boolean;
  tripId: string;
}

export function TimelineEventCard({ event, isLast, tripId }: Props) {
  const dotColor = DOT_COLOR[event.bookingType] ?? Colors.text.muted;
  const timeDisplay = event.isApprox ? `~${event.time}` : event.time;
  const isBooked = event.status === 'booked';

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/trip/booking-detail?tripId=${tripId}&bookingKey=${event.bookingId}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={event.title}
    >
      {/* 52px time column, right-aligned */}
      <View style={styles.timeCol}>
        {/* Fraunces (display serif) for times; tabular-nums keeps HH:MM aligned */}
        <Text style={[styles.time, event.isApprox && styles.timeApprox]}>{timeDisplay}</Text>
      </View>

      {/* Dot + vertical connector line */}
      <View style={styles.track}>
        <View style={[styles.dot, { backgroundColor: dotColor }]}>
          <Text style={styles.dotIcon}>{event.icon}</Text>
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: dotColor + '30' }]} />}
      </View>

      {/* Content */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          {isBooked ? (
            <View style={styles.bookedBadge}>
              <Text style={styles.bookedBadgeText}>✓ Prenotato</Text>
            </View>
          ) : (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>Da prenotare</Text>
            </View>
          )}
        </View>

        {event.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{event.subtitle}</Text>
        ) : null}

        {(event.duration || event.arrivesNextDay) ? (
          <View style={styles.metaRow}>
            {event.duration ? <Text style={styles.meta}>{event.duration}</Text> : null}
            {event.arrivesNextDay ? (
              <Text style={styles.arrivesNextDay}>{event.arrivesNextDay}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 56 },
  rowPressed: { opacity: 0.82 },

  timeCol: { width: 52, alignItems: 'flex-end', paddingRight: Spacing.sm, paddingTop: 7 },
  time: {
    fontFamily: FontFamily.display, // Fraunces — chosen over OutfitSemiBold per spec; tabular-nums for HH:MM alignment
    fontSize: FontSize.sm,
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  timeApprox: { color: Colors.text.muted },

  track: { alignItems: 'center', width: 32 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotIcon: { fontSize: 15 },
  line: { width: 2, flex: 1, minHeight: 16, marginTop: 2 },

  card: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.md, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 20,
  },

  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.secondary },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, alignItems: 'center' },
  meta: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  arrivesNextDay: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },

  bookedBadge: {
    backgroundColor: Colors.teal + '18',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  bookedBadgeText: { fontFamily: FontFamily.bodyMedium, fontSize: 10, color: Colors.teal },

  draftBadge: {
    backgroundColor: Colors.navy + '14',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  draftBadgeText: { fontFamily: FontFamily.bodyMedium, fontSize: 10, color: Colors.navy },
});
