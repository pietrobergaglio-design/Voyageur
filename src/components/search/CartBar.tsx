import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CartItem } from '../../types/booking';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  items: CartItem[];
  totalPrice: number;
  currency: string;
  onCheckout: () => void;
}

export function CartBar({ items, totalPrice, currency, onCheckout }: Props) {
  const count = items.length;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.count}>
          {count} {count === 1 ? 'elemento' : 'elementi'}
        </Text>
        <Text style={styles.total}>
          {totalPrice.toLocaleString('it-IT')} {currency}
        </Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={onCheckout} activeOpacity={0.85}>
        <Text style={styles.btnText}>Prenota tutto →</Text>
      </TouchableOpacity>
    </View>
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.white,
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
  },
  btnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});
