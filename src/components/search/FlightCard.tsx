import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { FlightOffer, RefundPolicy, MatchTag } from '../../types/booking';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

// ─── Shared sub-components ───────────────────────────────────────────────────

function RefundBadge({ policy }: { policy: RefundPolicy }) {
  const config = {
    flexible: { emoji: '🟢', label: 'Rimborsabile', color: '#22a06b' },
    moderate:  { emoji: '🟡', label: 'Parziale',     color: '#d97706' },
    strict:    { emoji: '🔴', label: 'Non rimb.',    color: '#dc2626' },
  }[policy];

  return (
    <View style={[badgeStyles.container, { borderColor: config.color + '40' }]}>
      <Text style={badgeStyles.emoji}>{config.emoji}</Text>
      <Text style={[badgeStyles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function MatchTagBadge({ tag }: { tag: MatchTag }) {
  const config: Record<MatchTag, { label: string; bg: string; color: string }> = {
    best_match:    { label: 'Best match',    bg: Colors.teal + '20',  color: Colors.teal },
    cheapest:      { label: 'Più economico', bg: '#22a06b20',          color: '#22a06b' },
    fastest:       { label: 'Più veloce',    bg: '#0ea5e920',          color: '#0ea5e9' },
    premium:       { label: 'Premium',       bg: Colors.accent + '20', color: Colors.accent },
    most_popular:  { label: 'Più popolare',  bg: '#7c3aed20',          color: '#7c3aed' },
    high_coverage: { label: 'Alta copertura',bg: Colors.navy + '15',   color: Colors.navy },
  };
  const c = config[tag];
  return (
    <View style={[badgeStyles.container, { backgroundColor: c.bg, borderColor: 'transparent' }]}>
      <Text style={[badgeStyles.label, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  emoji: { fontSize: 10 },
  label: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.xs },
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function getMatchScoreColor(score: number): string {
  if (score >= 70) return Colors.teal;
  if (score >= 40) return '#D97706'; // amber
  return '#DC2626'; // red
}

// ─── FlightCard ───────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

interface Props {
  flight: FlightOffer;
  selected: boolean;
  onSelect: () => void;
}

function arrivalNextDayOffset(departureAt: string, arrivalAt: string): number {
  const depDate = departureAt.slice(0, 10);
  const arrDate = arrivalAt.slice(0, 10);
  if (depDate === arrDate) return 0;
  const dep = new Date(depDate);
  const arr = new Date(arrDate);
  return Math.round((arr.getTime() - dep.getTime()) / 86_400_000);
}

export function FlightCard({ flight, selected, onSelect }: Props) {
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  // Prefer slice-level duration (includes layovers); fall back to segment sum for mock data
  const totalMinutes = flight.totalDurationMinutes
    ?? flight.segments.reduce((s, seg) => s + seg.durationMinutes, 0);
  const nextDayOffset = arrivalNextDayOffset(first.departureAt, last.arrivalAt);

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {/* Header row: airline + badges */}
      <View style={styles.row}>
        <Text style={styles.airline}>{flight.airline}</Text>
        <View style={styles.badgeRow}>
          {flight.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
          <RefundBadge policy={flight.refundPolicy} />
        </View>
      </View>

      {/* Route row */}
      <View style={styles.routeRow}>
        <View style={styles.endpoint}>
          <Text style={styles.time}>{formatTime(first.departureAt)}</Text>
          <Text style={styles.iata}>{first.origin}</Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.routeLine} />
          <Text style={styles.duration}>{formatDuration(totalMinutes)}</Text>
          <Text style={styles.stops}>
            {flight.stops === 0 ? 'Diretto' : `${flight.stops} scal${flight.stops === 1 ? 'o' : 'i'}`}
          </Text>
        </View>

        <View style={[styles.endpoint, styles.endpointRight]}>
          <View style={styles.arrivalRow}>
            <Text style={styles.time}>{formatTime(last.arrivalAt)}</Text>
            {nextDayOffset > 0 && (
              <Text style={styles.nextDay}>+{nextDayOffset}</Text>
            )}
          </View>
          <Text style={styles.iata}>{last.destination}</Text>
        </View>
      </View>

      {/* Footer row: baggage + match + price */}
      <View style={styles.footer}>
        <Text style={styles.baggage}>
          {flight.baggageIncluded ? '✅ Bagaglio incluso' : '⛔ Bagaglio non incluso'}
        </Text>
        <View style={styles.priceBlock}>
          <Text style={[styles.matchScore, { color: getMatchScoreColor(flight.matchScore) }]}>{flight.matchScore}% match</Text>
          <Text style={styles.price}>
            {flight.price.toLocaleString('it-IT')} {flight.currency}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export { RefundBadge, MatchTagBadge };

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  airline: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  endpoint: {
    alignItems: 'flex-start',
    minWidth: 52,
  },
  endpointRight: {
    alignItems: 'flex-end',
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  nextDay: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.accent,
    marginTop: 2,
  },
  time: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
  iata: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  routeLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: Colors.border,
  },
  duration: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  stops: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  baggage: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  matchScore: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    // color applied dynamically via getMatchScoreColor
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
});
