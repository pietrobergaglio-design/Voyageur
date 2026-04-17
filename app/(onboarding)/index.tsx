import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

export default function OnboardingIntro() {
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    btnOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
  }));

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(onboarding)/step2');
  };

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.globe}>🌍</Text>
          <Text style={styles.title}>Costruiamo il tuo{'\n'}profilo viaggiatore</Text>
          <Text style={styles.subtitle}>
            Qualche domanda per trovare esattamente quello che cerchi
          </Text>
        </Animated.View>

        <Animated.View style={[styles.footer, btnStyle]}>
          <SafeAreaView edges={['bottom']}>
            <Pressable
              style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
              onPress={handleStart}
            >
              <Text style={styles.startBtnText}>Iniziamo →</Text>
            </Pressable>
            <Text style={styles.note}>Meno di 1 minuto · Puoi cambiare tutto dopo</Text>
          </SafeAreaView>
        </Animated.View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  globe: {
    fontSize: 72,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.display,
    color: Colors.onDark.primary,
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.lg,
    color: Colors.onDark.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  startBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  startBtnPressed: {
    opacity: 0.85,
  },
  startBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
  note: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
    textAlign: 'center',
    paddingBottom: Spacing.lg,
  },
});
