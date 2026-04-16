import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
}

export function OnboardingBackground({ children }: Props) {
  return (
    <LinearGradient
      colors={[Colors.navy, Colors.navyMid]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
