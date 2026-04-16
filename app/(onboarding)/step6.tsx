import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { SelectCard } from '../../src/components/onboarding/SelectCard';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const OPTIONS = [
  { id: 'camping',   emoji: '⛺', label: 'Tenda e campeggio', description: 'Camping, glamping, van life' },
  { id: 'hostel',    emoji: '🛏️', label: 'Ostello',           description: 'Dormitori, sociale, economico' },
  { id: 'hotel',     emoji: '🏨', label: 'Hotel semplice',    description: '2-3 stelle, pulito e comodo' },
  { id: 'apartment', emoji: '🏠', label: 'Appartamento',      description: 'Airbnb, casa intera, cucina' },
  { id: 'boutique',  emoji: '🪞', label: 'Boutique hotel',    description: 'Design, atmosfera, 4 stelle' },
  { id: 'luxury',    emoji: '✨', label: 'Hotel di lusso',    description: '5 stelle, concierge, spa' },
  { id: 'resort',    emoji: '🌴', label: 'Resort all-inclusive', description: 'Tutto incluso, piscina, spiaggia' },
  { id: 'unique',    emoji: '🏕️', label: 'Esperienza unica',  description: 'Treehouse, barca, ryokan, igloo' },
] as const;

export default function Step6() {
  const accommodation = useAppStore((s) => s.onboardingData.accommodation);
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);

  const toggle = (id: string) => {
    const current = accommodation;
    const updated = current.includes(id)
      ? current.filter((x) => x !== id)
      : current.length < 3 ? [...current, id] : current;
    setOnboardingData({ accommodation: updated });
  };

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <OnboardingHeader step={6} total={10} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Dove ti addormenti meglio?</Text>
          <Text style={styles.subtitle}>Scegli 1-3 opzioni</Text>

          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <View key={opt.id} style={styles.gridItem}>
                <SelectCard
                  emoji={opt.emoji}
                  label={opt.label}
                  description={opt.description}
                  selected={accommodation.includes(opt.id)}
                  onPress={() => toggle(opt.id)}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={[styles.nextBtn, accommodation.length === 0 && styles.nextBtnDisabled]}
              onPress={() => router.push('/(onboarding)/step7')}
              activeOpacity={0.85}
              disabled={accommodation.length === 0}
            >
              <Text style={styles.nextBtnText}>
                {accommodation.length === 0 ? 'Scegli almeno 1 opzione' : `Avanti →`}
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
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.onDark.muted,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridItem: {
    width: '48%',
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
