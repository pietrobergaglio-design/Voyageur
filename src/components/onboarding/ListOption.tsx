import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  emoji: string;
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

export function ListOption({ emoji, label, subtitle, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.md,
  },
  rowSelected: {
    backgroundColor: 'rgba(196,89,59,0.18)',
    borderColor: Colors.accent,
  },
  emoji: {
    fontSize: 22,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.onDark.primary,
  },
  labelSelected: {
    color: Colors.accent,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
});
