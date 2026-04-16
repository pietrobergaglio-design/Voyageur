import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TransportOffer } from '../../types/booking';
import { RefundBadge, MatchTagBadge } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const TYPE_EMOJI: Record<string, string> = {
  car_rental: '🚙',
  rail_pass:  '🚄',
  shuttle:    '🚌',
  ferry:      '⛴️',
};

interface Props {
  transport: TransportOffer;
  selected: boolean;
  onSelect: () => void;
}

export function TransportCard({ transport, selected, onSelect }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.emoji}>{TYPE_EMOJI[transport.type] ?? '🚗'}</Text>
            <Text style={styles.name}>{transport.name}</Text>
          </View>
          <Text style={styles.description}>{transport.description}</Text>
        </View>
        <View style={styles.badgeCol}>
          {transport.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
          <RefundBadge policy={transport.refundPolicy} />
        </View>
      </View>

      <View style={styles.highlights}>
        {transport.highlights.map((h) => (
          <Text key={h} style={styles.highlight}>✓ {h}</Text>
        ))}
      </View>

      <View style={styles.priceRow}>
        {transport.pricePerDay && (
          <Text style={styles.perDay}>{transport.pricePerDay} € / giorno</Text>
        )}
        <Text style={styles.total}>{transport.totalPrice.toLocaleString('it-IT')} € totale</Text>
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
  cardSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emoji: { fontSize: 16 },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    flex: 1,
  },
  description: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  highlights: {
    gap: 2,
  },
  highlight: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  perDay: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  total: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
});
