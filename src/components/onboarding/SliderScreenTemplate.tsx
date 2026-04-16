import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from './OnboardingBackground';
import { OnboardingHeader } from './OnboardingHeader';
import { SliderInput } from './SliderInput';
import { StopLabels } from './StopLabels';
import { DescriptionCard } from './DescriptionCard';
import { useAppStore } from '../../stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

type SliderKey = 'adventure' | 'food' | 'pace' | 'budget';

export interface SliderConfig {
  step: number;
  storeKey: SliderKey;
  question: string;
  leftEmoji: string;
  leftLabel: string;
  rightEmoji: string;
  rightLabel: string;
  stops: readonly [string, string, string, string, string];
  phrases: readonly [string, string, string, string, string];
  nextRoute: string;
}

export function SliderScreenTemplate({ config }: { config: SliderConfig }) {
  const {
    step, storeKey, question,
    leftEmoji, leftLabel, rightEmoji, rightLabel,
    stops, phrases, nextRoute,
  } = config;

  const value = useAppStore((s) => s.onboardingData[storeKey]);
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);

  const activeIndex = Math.min(4, Math.round(value / 25));
  const phrase = phrases[activeIndex];

  const handleChange = (v: number) => setOnboardingData({ [storeKey]: v });
  const handleNext = () => router.push(nextRoute as never);
  const handleSkip = () => router.push(nextRoute as never);

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <OnboardingHeader step={step} total={9} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>{question}</Text>

          <View style={styles.extremeRow}>
            <Text style={styles.extreme}>{leftEmoji} {leftLabel}</Text>
            <Text style={[styles.extreme, styles.extremeRight]}>{rightLabel} {rightEmoji}</Text>
          </View>

          <SliderInput value={value} onChange={handleChange} />

          <StopLabels stops={stops} activeIndex={activeIndex} />

          <DescriptionCard phrase={phrase} />
        </ScrollView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>Avanti →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.6}>
              <Text style={styles.skipText}>Salta — ci penso dopo</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  question: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.onDark.primary,
    lineHeight: 30,
    marginBottom: Spacing.xl,
  },
  extremeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  extreme: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
    flex: 1,
  },
  extremeRight: {
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nextBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
  skipBtn: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  skipText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
  },
});
