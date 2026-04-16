import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { TagPill } from '../../src/components/onboarding/TagPill';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const CATEGORIES = [
  {
    label: 'NATURA E OUTDOOR',
    tags: ['Hiking', 'Diving', 'Surf', 'Wildlife/Safari', 'Sci/Neve', 'Campeggio'],
  },
  {
    label: 'CULTURA',
    tags: ['Musei', 'Architettura', 'Storia antica', 'Arte contemporanea', 'Templi/Spiritualità'],
  },
  {
    label: 'FOOD E SOCIAL',
    tags: ['Gastronomia locale', 'Corsi di cucina', 'Wine/Birra', 'Nightlife', 'Mercati locali'],
  },
  {
    label: 'LIFESTYLE',
    tags: ['Fotografia', 'Shopping', 'Wellness/Spa', 'Yoga', 'Sport/Fitness'],
  },
] as const;

const MIN_INTERESTS = 3;

export default function Step9() {
  const interests = useAppStore((s) => s.onboardingData.interests);
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);

  const toggle = (tag: string) => {
    const updated = interests.includes(tag)
      ? interests.filter((x) => x !== tag)
      : [...interests, tag];
    setOnboardingData({ interests: updated });
  };

  const canProceed = interests.length >= MIN_INTERESTS;

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <OnboardingHeader step={8} total={9} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>Cosa non può mancare?</Text>
            <Text style={[styles.counter, canProceed && styles.counterActive]}>
              {interests.length} selezionati
            </Text>
          </View>
          <Text style={styles.subtitle}>Scegli almeno {MIN_INTERESTS} interessi</Text>

          {CATEGORIES.map((cat) => (
            <View key={cat.label} style={styles.category}>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <View style={styles.tagRow}>
                {cat.tags.map((tag) => (
                  <TagPill
                    key={tag}
                    label={tag}
                    selected={interests.includes(tag)}
                    onPress={() => toggle(tag)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
              onPress={() => router.push('/(onboarding)/step10')}
              activeOpacity={0.85}
              disabled={!canProceed}
            >
              <Text style={styles.nextBtnText}>
                {canProceed ? 'Avanti →' : `Seleziona ancora ${MIN_INTERESTS - interests.length}`}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.onDark.primary,
    lineHeight: 30,
    flex: 1,
  },
  counter: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
    marginTop: 4,
  },
  counterActive: {
    color: Colors.accent,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.onDark.muted,
    marginBottom: Spacing.xl,
  },
  category: {
    marginBottom: Spacing.xl,
  },
  categoryLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.onDark.muted,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
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
  nextBtnDisabled: {
    backgroundColor: 'rgba(196,89,59,0.35)',
  },
  nextBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
});
