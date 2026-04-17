import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const PASSPORT_KEY = 'voyageur_passport';

const NATIONALITIES = [
  'Italia', 'USA', 'UK', 'Francia', 'Germania', 'Spagna',
  'Brasile', 'Giappone', 'Australia', 'Canada', 'Messico',
  'India', 'Cina', 'Corea', 'Argentina', 'Portogallo', 'Olanda', 'Altro',
] as const;

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={[styles.stepDot, i < current && styles.stepDotDone, i === current - 1 && styles.stepDotActive]} />
      ))}
    </View>
  );
}

function CheckoutHeader({ title, onBack, stepN }: { title: string; onBack: () => void; stepN: number }) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12} accessibilityLabel="Indietro">
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <StepDots current={stepN} />
      </View>
    </View>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {optional && <Text style={styles.optional}>Opzionale</Text>}
    </View>
  );
}

function InputField({
  value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'characters';
  secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.text.muted}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize ?? 'words'}
      secureTextEntry={secureTextEntry}
      returnKeyType="next"
    />
  );
}

function TravelerForm({ index, isFirst }: { index: number; isFirst: boolean }) {
  const { travelers, setTraveler } = useCheckoutStore();
  const t = travelers[index] ?? { firstName: '', lastName: '', birthDate: '', nationality: '', passport: '' };
  const [showNationalities, setShowNationalities] = useState(false);

  return (
    <View style={styles.travelerCard}>
      <Text style={styles.travelerTitle}>
        {isFirst ? '👤 Viaggiatore principale' : `👤 Viaggiatore ${index + 1}`}
      </Text>

      <View style={styles.nameRow}>
        <View style={styles.nameField}>
          <FieldLabel label="Nome" />
          <InputField
            value={t.firstName}
            onChangeText={(v) => setTraveler(index, { firstName: v })}
            placeholder="Marco"
          />
        </View>
        <View style={styles.nameField}>
          <FieldLabel label="Cognome" />
          <InputField
            value={t.lastName}
            onChangeText={(v) => setTraveler(index, { lastName: v })}
            placeholder="Rossi"
          />
        </View>
      </View>

      <FieldLabel label="Data di nascita" />
      <InputField
        value={t.birthDate}
        onChangeText={(v) => setTraveler(index, { birthDate: v })}
        placeholder="gg/mm/aaaa"
        keyboardType="numeric"
        autoCapitalize="none"
      />

      <FieldLabel label="Nazionalità" />
      <Pressable
        style={styles.selectBtn}
        onPress={() => setShowNationalities((v) => !v)}
        accessibilityLabel="Seleziona nazionalità"
      >
        <Text style={[styles.selectBtnText, !t.nationality && styles.selectBtnPlaceholder]}>
          {t.nationality || 'Seleziona…'}
        </Text>
        <Text style={styles.selectArrow}>{showNationalities ? '∧' : '∨'}</Text>
      </Pressable>

      {showNationalities && (
        <View style={styles.nationalityGrid}>
          {NATIONALITIES.map((n) => (
            <Pressable
              key={n}
              style={[styles.nationalityPill, t.nationality === n && styles.nationalityPillActive]}
              onPress={() => { setTraveler(index, { nationality: n }); setShowNationalities(false); }}
            >
              <Text style={[styles.nationalityPillText, t.nationality === n && styles.nationalityPillTextActive]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FieldLabel label="Numero passaporto" optional />
      <InputField
        value={t.passport}
        onChangeText={(v) => setTraveler(index, { passport: v })}
        placeholder="AB1234567"
        autoCapitalize="characters"
      />
    </View>
  );
}

export default function TravelersScreen() {
  const { snapshot, travelers, setTraveler } = useCheckoutStore();
  const profile = useAppStore((s) => s.onboardingData);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;

    if (profile.firstName || profile.lastName) {
      setTraveler(0, {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        nationality: profile.nationality || '',
      });
    }

    SecureStore.getItemAsync(PASSPORT_KEY).then((passport) => {
      if (passport) setTraveler(0, { passport });
    }).catch(() => {});
  }, []);

  if (!snapshot) {
    router.replace('/(tabs)/search');
    return null;
  }

  const canContinue = travelers.every(
    (t) => t.firstName.trim() && t.lastName.trim() && t.birthDate.trim() && t.nationality,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CheckoutHeader
        title="Dati viaggiatori"
        stepN={2}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {travelers.map((_, i) => (
            <TravelerForm key={i} index={i} isFirst={i === 0} />
          ))}

          <View style={styles.secureNote}>
            <Text style={styles.secureNoteText}>
              🔒 I dati del passaporto restano sul tuo dispositivo e non vengono mai inviati a server esterni
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, !canContinue && styles.ctaDisabled, pressed && styles.ctaPressed]}
          onPress={() => canContinue && router.push('/checkout/payment')}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel="Continua al pagamento"
        >
          <Text style={styles.ctaText}>
            {canContinue ? 'Continua →' : 'Compila tutti i campi obbligatori'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  headerWrap: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stepDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  stepDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border },
  stepDotDone: { backgroundColor: Colors.accent + '60' },
  stepDotActive: { width: 18, backgroundColor: Colors.accent },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.text.secondary },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  stepLabel: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  travelerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  travelerTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  nameField: { flex: 1, gap: 4 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  optional: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    minHeight: 44,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    minHeight: 44,
  },
  selectBtnText: { flex: 1, fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.text.primary },
  selectBtnPlaceholder: { color: Colors.text.muted },
  selectArrow: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  nationalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  nationalityPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  nationalityPillActive: { backgroundColor: Colors.accent + '15', borderColor: Colors.accent },
  nationalityPillText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.secondary },
  nationalityPillTextActive: { color: Colors.accent },
  secureNote: {
    backgroundColor: Colors.teal + '10',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.teal + '25',
  },
  secureNoteText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.teal,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cta: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: Colors.accent + '55' },
  ctaPressed: { opacity: 0.88 },
  ctaText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },
});
