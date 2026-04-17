import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  emoji: string;
  label: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

export function ListOption({ emoji, label, subtitle, selected, onPress }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.97, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${subtitle}`}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.row, selected && styles.rowSelected, animStyle]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.text}>
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </Animated.View>
    </Pressable>
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
    minHeight: 64,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
});
