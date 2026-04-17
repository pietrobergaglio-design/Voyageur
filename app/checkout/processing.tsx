import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { Colors, FontFamily, FontSize, Spacing } from '../../src/constants/theme';

const BASE_STEPS = [
  { key: 'flight', label: 'Confermando il volo…', duration: 1500 },
  { key: 'hotel', label: 'Confermando l\'hotel…', duration: 1500 },
  { key: 'transport', label: 'Confermando il trasporto…', duration: 1000 },
  { key: 'insurance', label: 'Attivando l\'assicurazione…', duration: 1000 },
  { key: 'done', label: 'Quasi fatto…', duration: 900 },
];

function buildSteps(types: string[]) {
  return BASE_STEPS.filter(
    (s) => s.key === 'done' || types.includes(s.key),
  );
}

export default function ProcessingScreen() {
  const { snapshot, setBookingRef } = useCheckoutStore();
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  const steps = snapshot
    ? buildSteps(snapshot.cartItems.map((i) => i.type))
    : BASE_STEPS;

  const totalDuration = steps.reduce((s, st) => s + st.duration, 0);

  useEffect(() => {
    if (!snapshot) {
      router.replace('/(tabs)/search');
      return;
    }

    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
    );

    let elapsed = 0;
    let idx = 0;

    const advance = () => {
      if (idx >= steps.length) {
        const ref = `VYG-${Date.now().toString(36).toUpperCase()}`;
        setBookingRef(ref);
        router.replace('/checkout/success');
        return;
      }
      setStepIndex(idx);
      const stepDuration = steps[idx].duration;
      const nextProgress = (elapsed + stepDuration) / totalDuration;
      progress.value = withTiming(nextProgress, { duration: stepDuration - 100, easing: Easing.out(Easing.ease) });
      elapsed += stepDuration;
      idx++;
      timerRef.current = setTimeout(advance, stepDuration);
    };

    advance();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const currentLabel = steps[stepIndex]?.label ?? 'Elaborazione in corso…';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.Text style={[styles.spinner, spinStyle]}>✈️</Animated.Text>

        <Text style={styles.title}>Stiamo prenotando</Text>
        <Text style={styles.subtitle}>Non chiudere l'app</Text>

        <View style={styles.stepBox}>
          <Text style={styles.stepLabel}>{currentLabel}</Text>
        </View>

        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>

        <Text style={styles.progressNote}>
          {stepIndex + 1} di {steps.length} passaggi completati
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  spinner: { fontSize: 64, marginBottom: Spacing.sm },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.muted,
    marginTop: -Spacing.sm,
  },
  stepBox: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 240,
    alignItems: 'center',
  },
  stepLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  progressBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  progressNote: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});
