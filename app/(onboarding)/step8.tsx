import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { ListOption } from '../../src/components/onboarding/ListOption';
import { TagPill } from '../../src/components/onboarding/TagPill';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const COMPANIONS = [
  { id: 'solo',          emoji: '🧑', label: 'Solo',       subtitle: 'E mi va benissimo' },
  { id: 'couple',        emoji: '💑', label: 'In coppia',  subtitle: 'Viaggio romantico' },
  { id: 'friends_small', emoji: '👫', label: 'Amici 2-4',  subtitle: 'Gruppo piccolo' },
  { id: 'friends_large', emoji: '👥', label: 'Amici 5+',   subtitle: 'Gruppo grande' },
  { id: 'family',        emoji: '👨‍👩‍👧‍👦', label: 'Famiglia',  subtitle: 'Con bambini' },
] as const;

const CHILD_AGES = ['0-2', '3-5', '6-12', '13-17'] as const;

export default function Step8() {
  const companion = useAppStore((s) => s.onboardingData.companion);
  const childAges = useAppStore((s) => s.onboardingData.childAges);
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);

  const toggleAge = (age: string) => {
    const updated = childAges.includes(age)
      ? childAges.filter((x) => x !== age)
      : [...childAges, age];
    setOnboardingData({ childAges: updated });
  };

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <OnboardingHeader step={8} total={10} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Con chi parti di solito?</Text>

          <View style={styles.options}>
            {COMPANIONS.map((c) => (
              <ListOption
                key={c.id}
                emoji={c.emoji}
                label={c.label}
                subtitle={c.subtitle}
                selected={companion === c.id}
                onPress={() => setOnboardingData({ companion: c.id })}
              />
            ))}
          </View>

          {companion === 'family' && (
            <View style={styles.childSection}>
              <Text style={styles.childLabel}>Età dei bambini</Text>
              <View style={styles.chipRow}>
                {CHILD_AGES.map((age) => (
                  <TagPill
                    key={age}
                    label={`${age} anni`}
                    selected={childAges.includes(age)}
                    onPress={() => toggleAge(age)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={[styles.nextBtn, companion === '' && styles.nextBtnDisabled]}
              onPress={() => router.push('/(onboarding)/step9')}
              activeOpacity={0.85}
              disabled={companion === ''}
            >
              <Text style={styles.nextBtnText}>
                {companion === '' ? 'Seleziona un\'opzione' : 'Avanti →'}
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
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.onDark.primary,
    lineHeight: 30,
    marginBottom: Spacing.xl,
  },
  options: {
    gap: Spacing.sm,
  },
  childSection: {
    marginTop: Spacing.xl,
  },
  childLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.onDark.secondary,
    marginBottom: Spacing.sm,
  },
  chipRow: {
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
