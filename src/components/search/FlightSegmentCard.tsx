import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { FlightSegment } from '../../types/booking';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

export interface FlightDirectionGroup {
  key: string;
  airline: string;
  segments: FlightSegment[];
  stops: number;
  durationMinutes: number;
  departureAt: string;
  arrivalAt: string;
  estimatedPrice: number;
  offerIds: string[];
}

interface Props {
  group: FlightDirectionGroup;
  selected: boolean;
  onSelect: () => void;
  direction: 'outbound' | 'return';
  currency?: string;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDur(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export function FlightSegmentCard({ group, selected, onSelect, currency = 'EUR' }: Props) {
  const first = group.segments[0];
  const last = group.segments[group.segments.length - 1];
  const stopsLabel = group.stops === 0 ? 'Diretto' : `${group.stops} scal${group.stops === 1 ? 'o' : 'i'}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.row}>
        {/* Airline */}
        <View style={styles.airlineBlock}>
          <Text style={styles.airline} numberOfLines={1}>{group.airline}</Text>
          <Text style={styles.stopsLabel}>{stopsLabel}</Text>
        </View>

        {/* Route */}
        <View style={styles.route}>
          <View style={styles.timeBlock}>
            <Text style={styles.time}>{fmt(group.departureAt)}</Text>
            <Text style={styles.iata}>{first.origin}</Text>
          </View>
          <View style={styles.middle}>
            <View style={styles.line} />
            <Text style={styles.duration}>{fmtDur(group.durationMinutes)}</Text>
          </View>
          <View style={[styles.timeBlock, styles.timeBlockRight]}>
            <Text style={styles.time}>{fmt(group.arrivalAt)}</Text>
            <Text style={styles.iata}>{last.destination}</Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>da</Text>
          <Text style={styles.price}>
            {Math.round(group.estimatedPrice).toLocaleString('it-IT')}
          </Text>
          <Text style={styles.priceCurrency}>{currency}</Text>
        </View>
      </View>

      {selected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>✓ Selezionato</Text>
        </View>
      )}
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
    gap: Spacing.xs,
  },
  cardSelected: {
    borderColor: Colors.teal,
    borderWidth: 2,
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.88 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  airlineBlock: {
    width: 72,
    gap: 2,
  },
  airline: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.primary,
  },
  stopsLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.muted,
  },
  route: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBlock: {
    alignItems: 'flex-start',
    minWidth: 40,
  },
  timeBlockRight: {
    alignItems: 'flex-end',
  },
  time: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  iata: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.muted,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  line: {
    width: '100%',
    height: 1.5,
    backgroundColor: Colors.border,
  },
  duration: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.secondary,
  },
  priceBlock: {
    alignItems: 'flex-end',
    minWidth: 52,
  },
  priceLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.muted,
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  priceCurrency: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.text.muted,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.teal + '18',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.teal,
  },
});
