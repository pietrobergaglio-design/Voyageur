import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

interface Props {
  step: number;
  total: number;
  onBack?: () => void;
}

export function OnboardingHeader({ step, total, onBack }: Props) {
  const progress = step / total;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Back button + step counter row */}
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>← Indietro</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={styles.stepText}>{step}/{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  progressBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.onDark.secondary,
  },
  stepText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
  },
});
