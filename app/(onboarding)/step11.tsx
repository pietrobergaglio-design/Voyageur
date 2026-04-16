import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const ADVENTURE_STOPS = ['Spa e spiaggia', 'Natura e passeggiate', 'Snorkeling e bici', 'Trekking e rafting', 'Bungee e paracadute'];
const FOOD_STOPS = ['Street food e mercati', 'Trattoria locale', 'Ristorante tipico', 'Bistrot ricercato', 'Stellato e omakase'];
const PACE_STOPS = ['Giornata libera', '1-2 cose con calma', '2-3 cose e pause', '4 attività al giorno', 'Ogni minuto schedulato'];
const BUDGET_STOPS = ['Ostello e ramen', 'Budget smart', 'Qualità-prezzo', 'Mi concedo il meglio', 'Senza limiti'];

const stopLabel = (stops: string[], value: number) => stops[Math.min(4, Math.round(value / 25))];

const COMPANION_LABELS: Record<string, string> = {
  solo: '🧑 Solo',
  couple: '💑 Coppia',
  friends_small: '👫 Amici 2-4',
  friends_large: '👥 Amici 5+',
  family: '👨‍👩‍👧‍👦 Famiglia',
};

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
});

export default function Step11() {
  const data = useAppStore((s) => s.onboardingData);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const initial = (data.firstName.charAt(0) + data.lastName.charAt(0)).toUpperCase() || '?';

  const handleStart = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)/search');
  };

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.name}>
              {data.firstName} {data.lastName}
            </Text>
            {data.nationality ? (
              <Text style={styles.nationality}>{data.nationality}</Text>
            ) : null}
          </View>

          {/* Sliders card */}
          <SummaryCard title="I TUOI CURSORI">
            <SummaryRow label="🧘 Avventura" value={stopLabel(ADVENTURE_STOPS, data.adventure)} />
            <SummaryRow label="🌮 Cucina"    value={stopLabel(FOOD_STOPS, data.food)} />
            <SummaryRow label="🐌 Ritmo"     value={stopLabel(PACE_STOPS, data.pace)} />
            <SummaryRow label="🎒 Budget"    value={stopLabel(BUDGET_STOPS, data.budget)} />
          </SummaryCard>

          {/* Choices card */}
          <SummaryCard title="LE TUE SCELTE">
            {data.accommodation.length > 0 && (
              <SummaryRow label="🏨 Alloggio" value={data.accommodation.length === 1
                ? data.accommodation[0]
                : `${data.accommodation.length} tipologie`}
              />
            )}
            {data.transport.length > 0 && (
              <SummaryRow label="🚌 Trasporto" value={`${data.transport.length} opzioni`} />
            )}
            {data.companion && (
              <SummaryRow label="👥 Con chi" value={COMPANION_LABELS[data.companion] ?? data.companion} />
            )}
          </SummaryCard>

          {/* Interests card */}
          {data.interests.length > 0 && (
            <SummaryCard title="I TUOI INTERESSI">
              <View style={styles.tagsRow}>
                {data.interests.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </SummaryCard>
          )}

          <TouchableOpacity style={styles.editBtn} onPress={() => router.back()} activeOpacity={0.6}>
            <Text style={styles.editText}>Modifica risposte</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Inizia a viaggiare →</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </OnboardingBackground>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.onDark.secondary,
  },
  value: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.onDark.primary,
    textAlign: 'right',
    flex: 1,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.white,
  },
  name: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.onDark.primary,
  },
  nationality: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.onDark.muted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: 'rgba(196,89,59,0.2)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(196,89,59,0.4)',
  },
  tagText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
  editBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  editText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.onDark.muted,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  startBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  startBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
});
