import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { CartItem } from '../../types/booking';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  items: CartItem[];
  totalPrice: number;
  currency: string;
  onCheckout: () => void;
  onSaveDraft: () => void;
}

export function CartBar({ items, totalPrice, currency, onCheckout, onSaveDraft }: Props) {
  const count = items.length;
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleCheckout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCheckout();
  };

  const handleSaveDraft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSaveDraft();
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.info}>
        <Text style={styles.count}>
          {count} {count === 1 ? 'elemento' : 'elementi'}
        </Text>
        <Text style={styles.total}>
          {totalPrice.toLocaleString('it-IT')} {currency}
        </Text>
      </View>
      <View style={styles.btns}>
        <Pressable
          style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
          onPress={handleSaveDraft}
          accessibilityRole="button"
          accessibilityLabel="Salva viaggio come bozza"
        >
          <Text style={styles.btnOutlineText}>💾 Salva</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnFill, pressed && styles.btnFillPressed]}
          onPress={handleCheckout}
          accessibilityRole="button"
          accessibilityLabel="Prenota ora"
        >
          <Text style={styles.btnFillText}>🎫 Prenota</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  count: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  total: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.white,
  },
  btns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btnOutline: {
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutlinePressed: {
    backgroundColor: `${Colors.accent}22`,
  },
  btnOutlineText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  btnFill: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFillPressed: {
    opacity: 0.85,
  },
  btnFillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
});
