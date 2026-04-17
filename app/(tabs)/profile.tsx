import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/stores/useAppStore';
import { SliderBar } from '../../src/components/profile/SliderBar';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

const SLIDER_COLORS = {
  budget: '#7c3aed',
  experience: '#d97706',
} as const;

const COMPANION_LABELS: Record<string, string> = {
  solo: 'Solo',
  couple: 'Coppia',
  friends: 'Amici',
  family: 'Famiglia',
};

const ACCOMMODATION_LABELS: Record<string, string> = {
  hotel: '🏨 Hotel',
  airbnb: '🏠 Airbnb',
  hostel: '🛏 Hostel',
  resort: '🌴 Resort',
  camping: '⛺ Camping',
  boutique: '✨ Boutique',
};

const TRANSPORT_LABELS: Record<string, string> = {
  flight: '✈️ Volo',
  train: '🚆 Treno',
  car: '🚗 Auto',
  bus: '🚌 Bus',
  ferry: '⛴ Traghetto',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { gap: Spacing.sm },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  body: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
});

function Chip({ label }: { label: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.accent + '18',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const data = useAppStore((s) => s.onboardingData);

  const initials = [data.firstName?.[0], data.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'V';
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Viaggiatore';
  const nationality = data.nationality || 'Non specificata';

  function handleEdit() {
    Alert.alert('Modifica profilo', 'La modifica del profilo sarà disponibile nella prossima versione.');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Profilo</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
          <Text style={styles.editBtnText}>Modifica</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.nationality}>{nationality}</Text>
        </View>

        {/* Travel style sliders */}
        <Section title="Stile di viaggio">
          <SliderBar
            label="Avventura"
            value={data.adventure}
            leftLabel="Relax"
            rightLabel="Avventura"
            color={Colors.accent}
          />
          <SliderBar
            label="Gastronomia"
            value={data.food}
            leftLabel="Semplice"
            rightLabel="Gourmet"
            color={Colors.teal}
          />
          <SliderBar
            label="Ritmo"
            value={data.pace}
            leftLabel="Lento"
            rightLabel="Intenso"
            color={Colors.navy}
          />
          <SliderBar
            label="Budget"
            value={data.budget}
            leftLabel="Economico"
            rightLabel="Lusso"
            color={SLIDER_COLORS.budget}
          />
          <SliderBar
            label="Esperienza"
            value={data.experience}
            leftLabel="📸 Iconici"
            rightLabel="🔑 Nascosti"
            color={SLIDER_COLORS.experience}
          />
        </Section>

        {/* Companion */}
        <Section title="Compagnia">
          <View style={styles.row}>
            <Text style={styles.metaLabel}>Viaggio</Text>
            <Chip label={COMPANION_LABELS[data.companion] ?? data.companion ?? 'Non specificato'} />
          </View>
          {data.childAges.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.metaLabel}>Bambini</Text>
              <View style={styles.chipRow}>
                {data.childAges.map((a, i) => (
                  <Chip key={i} label={`${a} anni`} />
                ))}
              </View>
            </View>
          )}
        </Section>

        {/* Preferences */}
        <Section title="Preferenze">
          {data.accommodation.length > 0 && (
            <View style={styles.prefBlock}>
              <Text style={styles.prefLabel}>Alloggio</Text>
              <View style={styles.chipRow}>
                {data.accommodation.map((a) => (
                  <Chip key={a} label={ACCOMMODATION_LABELS[a] ?? a} />
                ))}
              </View>
            </View>
          )}
          {data.transport.length > 0 && (
            <View style={styles.prefBlock}>
              <Text style={styles.prefLabel}>Trasporti</Text>
              <View style={styles.chipRow}>
                {data.transport.map((t) => (
                  <Chip key={t} label={TRANSPORT_LABELS[t] ?? t} />
                ))}
              </View>
            </View>
          )}
        </Section>

        {/* Interests */}
        {data.interests.length > 0 && (
          <Section title="Interessi">
            <View style={styles.chipRow}>
              {data.interests.map((interest) => (
                <Chip key={interest} label={interest} />
              ))}
            </View>
          </Section>
        )}

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Voyageur · v1.0.0</Text>
          <TouchableOpacity onPress={handleEdit}>
            <Text style={styles.appInfoLink}>Privacy & Termini</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.text.primary,
  },
  editBtn: {
    backgroundColor: Colors.accent + '18',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  editBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xxl,
    color: Colors.white,
  },
  fullName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
  nationality: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  metaLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  prefBlock: {
    gap: Spacing.xs,
  },
  prefLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  appInfo: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  appInfoText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  appInfoLink: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
});
