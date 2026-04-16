import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  phrase: string;
}

export function DescriptionCard({ phrase }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevPhrase = useRef(phrase);

  useEffect(() => {
    if (prevPhrase.current !== phrase) {
      prevPhrase.current = phrase;
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [phrase, opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <Text style={styles.phrase}>"{phrase}"</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  phrase: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.md,
    color: Colors.onDark.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
