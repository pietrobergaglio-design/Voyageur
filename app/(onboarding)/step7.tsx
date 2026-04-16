import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { SelectCard } from '../../src/components/onboarding/SelectCard';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const OPTIONS = [
  { id: 'walking', emoji: '🚶', label: 'A piedi',              description: 'Cammini e trekking urbano' },
  { id: 'bike',    emoji: '🚲', label: 'Bici / monopattino',   description: 'Noleggio bici, e-scooter' },
  { id: 'transit', emoji: '🚌', label: 'Mezzi pubblici',       description: 'Bus, metro, tram' },
  { id: 'train',   emoji: '🚄', label: 'Treni',                description: 'Alta velocità, scenic, notturni' },
  { id: 'car',     emoji: '🚙', label: 'Auto a noleggio',      description: 'Libertà totale, road trip' },
  { id: 'taxi',    emoji: '🚕', label: 'Taxi / autista',       description: 'Comodo, porta a porta' },
] as const;

export default function Step7() {
  const transport = useAppStore((s) => s.onboardingData.transport);
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);

  const toggle = (id: string) => {
    const updated = transport.includes(id)
      ? transport.filter((x) => x !== id)
      : [...transport, id];
    setOnboardingData({ transport: updated });
  };

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <OnboardingHeader step={6} total={9} onBack={() => router.back()} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Come ti muovi?</Text>
          <Text style={styles.subtitle}>Scegli tutto quello che ti va</Text>

          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <View key={opt.id} style={styles.gridItem}>
                <SelectCard
                  emoji={opt.emoji}
                  label={opt.label}
                  description={opt.description}
                  selected={transport.includes(opt.id)}
                  onPress={() => toggle(opt.id)}
                />
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={[styles.nextBtn, transport.length === 0 && styles.nextBtnDisabled]}
              onPress={() => router.push('/(onboarding)/step8')}
              activeOpacity={0.85}
              disabled={transport.length === 0}
            >
              <Text style={styles.nextBtnText}>
                {transport.length === 0 ? 'Scegli almeno 1 opzione' : 'Avanti →'}
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
