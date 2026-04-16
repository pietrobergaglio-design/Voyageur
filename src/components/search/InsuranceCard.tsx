import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { InsurancePlan } from '../../types/booking';
import { MatchTagBadge } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  plan: InsurancePlan;
  selected: boolean;
  onSelect: () => void;
}

export function InsuranceCard({ plan, selected, onSelect }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.provider}>Qover</Text>
        </View>
        <View style={styles.badgeCol}>
          {plan.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
        </View>
      </View>

      <View style={styles.coverage}>
        {plan.coverageItems.map((item) => (
          <Text key={item} style={styles.coverageItem}>✓ {item}</Text>
        ))}
      </View>

      <View style={styles.footer}>
        <View>
          {plan.highlights.map((h) => (
            <Text key={h} style={styles.highlight}>{h}</Text>
          ))}
        </View>
        <Text style={styles.price}>{plan.price} €</Text>
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
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  provider: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  coverage: {
    gap: 3,
  },
  coverageItem: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  highlight: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.teal,
  },
  price: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
});
