import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { OnboardingBackground } from '../../src/components/onboarding/OnboardingBackground';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';

export default function OnboardingIntro() {
  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.globe}>🌍</Text>
          <Text style={styles.title}>Costruiamo il tuo{'\n'}profilo viaggiatore</Text>
          <Text style={styles.subtitle}>
            Qualche domanda per trovare esattamente quello che cerchi
          </Text>
        </View>

        <View style={styles.footer}>
          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => router.push('/(onboarding)/step2')}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>Iniziamo →</Text>
            </TouchableOpacity>
            <Text style={styles.note}>Meno di 1 minuto · Puoi cambiare tutto dopo</Text>
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
