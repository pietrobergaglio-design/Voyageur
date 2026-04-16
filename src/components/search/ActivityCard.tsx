import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ActivityOffer } from '../../types/booking';
import { MatchTagBadge } from './FlightCard';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  activity: ActivityOffer;
  selected: boolean;
  onSelect: () => void;
}

export function ActivityCard({ activity, selected, onSelect }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{activity.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{activity.name}</Text>
          <Text style={styles.meta}>
            {activity.suggestedDay} · {activity.durationHours}h
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{activity.price} €</Text>
          <Text style={styles.perPerson}>/ persona</Text>
        </View>
      </View>

      {activity.tags.length > 0 && (
        <View style={styles.tagRow}>
          {activity.tags.map((t) => <MatchTagBadge key={t} tag={t} />)}
          <Text style={styles.matchScore}>{activity.matchScore}% match</Text>
        </View>
      )}

      <View style={styles.highlights}>
        {activity.highlights.map((h) => (
          <Text key={h} style={styles.highlight}>✓ {h}</Text>
        ))}
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
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  perPerson: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  matchScore: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.teal,
    marginLeft: 'auto',
  },
  highlights: {
    gap: 2,
  },
  highlight: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
