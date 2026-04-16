import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { OnboardingHeader } from '../../src/components/onboarding/OnboardingHeader';
import { TagPill } from '../../src/components/onboarding/TagPill';
import { useAppStore } from '../../src/stores/useAppStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

const NATIONALITIES = [
  'Italia', 'USA', 'UK', 'Francia', 'Germania', 'Spagna',
  'Brasile', 'Giappone', 'Australia', 'Canada', 'Messico',
  'India', 'Cina', 'Corea', 'Argentina', 'Portogallo',
  'Olanda', 'Altro',
] as const;

const PASSPORT_KEY = 'voyageur_passport';

export default function Step10() {
  const { firstName, lastName, nationality } = useAppStore((s) => s.onboardingData);
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);

  const [passport, setPassport] = useState('');

  const canProceed = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleNext = async () => {
    if (passport.trim()) {
      await SecureStore.setItemAsync(PASSPORT_KEY, passport.trim());
    }
    router.push('/(onboarding)/step11');
  };

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <OnboardingHeader step={9} total={9} onBack={() => router.back()} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Quasi fatto!</Text>
            <Text style={styles.subtitle}>
              Ci serve per compilare le prenotazioni al posto tuo
            </Text>

            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.fieldLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Marco"
                  placeholderTextColor={Colors.onDark.muted}
                  value={firstName}
                  onChangeText={(v) => setOnboardingData({ firstName: v })}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              <View style={styles.nameField}>
                <Text style={styles.fieldLabel}>Cognome</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rossi"
                  placeholderTextColor={Colors.onDark.muted}
                  value={lastName}
                  onChangeText={(v) => setOnboardingData({ lastName: v })}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Nationality */}
            <Text style={[styles.fieldLabel, styles.sectionLabel]}>Nazionalità</Text>
            <View style={styles.pillRow}>
              {NATIONALITIES.map((n) => (
                <TagPill
                  key={n}
                  label={n}
                  selected={nationality === n}
                  onPress={() => setOnboardingData({ nationality: n })}
                />
              ))}
            </View>

            {/* Passport (optional) */}
            <View style={styles.passportSection}>
              <View style={styles.passportHeader}>
                <Text style={styles.fieldLabel}>Numero passaporto</Text>
                <Text style={styles.optional}>Opzionale</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="AB1234567"
                placeholderTextColor={Colors.onDark.muted}
                value={passport}
                onChangeText={setPassport}
                autoCapitalize="characters"
                secureTextEntry={false}
              />
              <Text style={styles.passportNote}>
                🔒 Salvato solo sul tuo dispositivo, mai inviato a server esterni
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
              onPress={handleNext}
              activeOpacity={0.85}
              disabled={!canProceed}
            >
              <Text style={styles.nextBtnText}>
                {canProceed ? 'Scopri il tuo profilo →' : 'Inserisci nome e cognome'}
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
  flex: { flex: 1 },
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
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.onDark.muted,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  nameField: {
    flex: 1,
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.onDark.secondary,
    marginBottom: Spacing.xs,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.onDark.primary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: Spacing.xl,
  },
  passportSection: {
    gap: Spacing.sm,
  },
  passportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optional: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.onDark.muted,
  },
  passportNote: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.onDark.muted,
    lineHeight: 16,
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
