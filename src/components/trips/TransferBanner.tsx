import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { TransportSuggestion } from '../../types/multi-city';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  transfer: TransportSuggestion;
}

const MODE_ICON: Record<string, string> = {
  train: '🚄',
  shinkansen: '🚄',
  flight: '✈️',
  bus: '🚌',
  car: '🚗',
  ferry: '⛴️',
};

function modeIcon(mode: string): string {
  const key = mode.toLowerCase();
  for (const [k, v] of Object.entries(MODE_ICON)) {
    if (key.includes(k)) return v;
  }
  return '🚌';
}

export function TransferBanner({ transfer }: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Text style={styles.icon}>{modeIcon(transfer.mode)}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.route}>
            {transfer.from} → {transfer.to}
          </Text>
          <Text style={styles.meta}>
            {transfer.mode} · {transfer.duration} · ~€{transfer.price_eur}
          </Text>
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.detailBtn, pressed && { opacity: 0.7 }]}>
        <Text style={styles.detailBtnText}>Dettagli</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.navy + '0E',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.navy + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: { fontSize: 20 },
  textBlock: { gap: 2 },
  route: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.navy,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  detailBtn: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.navy + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.navy,
  },
});
