import { View, Text, StyleSheet } from 'react-native';
import type { TimelineDay } from '../../utils/itinerary-builder';
import { TimelineEventCard } from './TimelineEventCard';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  day: TimelineDay;
  tripId: string;
}

export function TimelineDaySection({ day, tripId }: Props) {
  const hasEvents = day.events.length > 0;

  return (
    <>
      {/* Day header */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{day.dayLabel}</Text>
        <Text style={styles.dateLabel}>{day.dateLabel}</Text>
      </View>

      {hasEvents ? (
        <View style={styles.planBlock}>
          <Text style={styles.sectionTitle}>Il tuo piano</Text>
          {day.events.map((event, idx) => (
            <TimelineEventCard
              key={event.id}
              event={event}
              isLast={idx === day.events.length - 1}
              tripId={tripId}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyPlan}>Nessun evento pianificato</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  dayLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  dateLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  planBlock: { gap: 0 },
  // Fraunces 16pt navy per spec
  sectionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: Colors.navy,
    marginBottom: Spacing.xs,
  },
  emptyPlan: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    paddingVertical: Spacing.xs,
  },
});
