import { Pressable, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../constants/theme';

interface Props {
  hiddenCount: number;
  onPress: () => void;
}

export function ShowMoreButton({ hiddenCount, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={styles.label}>Mostra altre {hiddenCount} opzioni →</Text>
    </Pressable>
  );
}

export function ShowLessButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={styles.label}>Mostra meno ↑</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
});
