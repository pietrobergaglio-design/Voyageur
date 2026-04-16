import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function TagPill({ label, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: 4,
  },
  pillSelected: {
    backgroundColor: 'rgba(196,89,59,0.22)',
    borderColor: Colors.accent,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.onDark.secondary,
  },
  labelSelected: {
    color: Colors.accent,
  },
});
