import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

interface Props {
  label: string;
  value: number; // 0–100
  leftLabel: string;
  rightLabel: string;
  color?: string;
}

export function SliderBar({ label, value, leftLabel, rightLabel, color = Colors.accent }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{value}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%` as `${number}%`, backgroundColor: color }]} />
        <View
          style={[
            styles.thumb,
            { left: `${value}%` as `${number}%`, backgroundColor: color },
          ]}
        />
      </View>

      <View style={styles.endLabels}>
        <Text style={styles.endLabel}>{leftLabel}</Text>
        <Text style={styles.endLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  value: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    top: -4,
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  endLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
