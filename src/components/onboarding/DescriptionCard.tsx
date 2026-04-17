import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  phrase: string;
}

export function DescriptionCard({ phrase }: Props) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const prevPhrase = useRef(phrase);

  useEffect(() => {
    if (prevPhrase.current !== phrase) {
      prevPhrase.current = phrase;
      opacity.value = withSequence(
        withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) }),
      );
      scale.value = withSequence(
        withTiming(0.96, { duration: 120 }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.5)) }),
      );
    }
  }, [phrase, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <Text style={styles.phrase}>"{phrase}"</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  phrase: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.md,
    color: Colors.onDark.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
