import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  emoji: string;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

export function SelectCard({ emoji, label, description, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <Text style={styles.description} numberOfLines={2}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.md,
    gap: 4,
    minHeight: 100,
  },
  cardSelected: {
    backgroundColor: 'rgba(196,89,59,0.18)',
    borderColor: Colors.accent,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.onDark.primary,
    marginTop: 2,
  },
  labelSelected: {
    color: Colors.accent,
  },
  description: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.onDark.muted,
    lineHeight: 15,
  },
});
