import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily } from '../../src/constants/theme';
import { useAppStore } from '../../src/stores/useAppStore';

export default function OnboardingScreen() {
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Voyageur</Text>
        <Text style={styles.subtitle}>Onboarding — placeholder</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    color: Colors.navy,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    color: Colors.text.muted,
  },
});
