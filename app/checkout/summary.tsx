import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';
import type { CartItem } from '../../src/types/booking';

const ITEM_EMOJI: Record<CartItem['type'], string> = {
  flight: '✈️',
  hotel: '🏨',
  transport: '🚗',
  activity: '🎯',
  insurance: '🏥',
};

const ITEM_LABEL: Record<CartItem['type'], string> = {
  flight: 'Volo',
  hotel: 'Hotel',
  transport: 'Trasporto',
  activity: 'Attività',
  insurance: 'Assicurazione',
};

function fmt(n: number, currency = 'EUR') {
  return `${n.toLocaleString('it-IT')} ${currency}`;
}

function ItemRow({ item, detail }: { item: CartItem; detail?: string }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <View style={styles.itemIconWrap}>
          <Text style={styles.itemIcon}>{ITEM_EMOJI[item.type]}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemType}>{ITEM_LABEL[item.type]}</Text>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          {detail ? <Text style={styles.itemDetail}>{detail}</Text> : null}
        </View>
      </View>
      <Text style={styles.itemPrice}>{fmt(item.price, item.currency)}</Text>
    </View>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.stepDot, i < current && styles.stepDotDone, i === current - 1 && styles.stepDotActive]}
        />
      ))}
    </View>
  );
}

function CheckoutHeader({ title, onClose, step, stepN }: { title: string; onClose: () => void; step: string; stepN: number }) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12} accessibilityLabel="Chiudi checkout">
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <StepDots current={stepN} total={4} />
      </View>
    </View>
  );
}

export default function SummaryScreen() {
  const { snapshot } = useCheckoutStore();

  if (!snapshot) {
    router.replace('/(tabs)/search');
    return null;
  }

  const { cartItems, subtotal, taxAmount, finalTotal, currency, results } = snapshot;

  const itemDetail = (item: CartItem): string | undefined => {
    if (item.type === 'flight') {
      const f = results.flights.find((x) => x.id === item.offerId);
      if (f) {
        const seg = f.segments[0];
        const dep = new Date(seg.departureAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        return `${f.airline} · ${seg.origin} → ${seg.destination} · ${dep}`;
      }
    }
    if (item.type === 'hotel') {
      const h = results.hotels.find((x) => x.id === item.offerId);
      const p = snapshot.searchParams;
      const nights = Math.round((p.checkOut.getTime() - p.checkIn.getTime()) / 86_400_000);
      if (h) return `${h.zone} · ${nights} notti · ★${'★'.repeat(h.stars - 1)}`;
    }
    if (item.type === 'transport') {
      const t = results.transports.find((x) => x.id === item.offerId);
      if (t) return t.description;
    }
    if (item.type === 'activity') {
      const a = results.activities.find((x) => x.id === item.offerId);
      if (a) return `${a.suggestedDay} · ${a.durationHours}h`;
    }
    if (item.type === 'insurance') {
      const ins = results.insurance.find((x) => x.id === item.offerId);
      if (ins) return ins.coverageItems.slice(0, 2).join(' · ');
    }
    return undefined;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CheckoutHeader
        title="Conferma prenotazione"
        step="1 di 4"
        stepN={1}
        onClose={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Il tuo ordine</Text>

        <View style={styles.card}>
          {cartItems.map((item, i) => (
            <View key={item.offerId}>
              {i > 0 && <View style={styles.divider} />}
              <ItemRow item={item} detail={itemDetail(item)} />
            </View>
          ))}
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotale</Text>
            <Text style={styles.totalValue}>{fmt(subtotal, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tasse e commissioni (8%)</Text>
            <Text style={styles.totalValue}>{fmt(taxAmount, currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Totale</Text>
            <Text style={styles.grandValue}>{fmt(finalTotal, currency)}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          🔒 Pagamento sicuro con crittografia end-to-end. Puoi cancellare entro 24h dalla prenotazione.
        </Text>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push('/checkout/travelers')}
          accessibilityRole="button"
          accessibilityLabel={`Paga ${fmt(finalTotal, currency)}`}
        >
          <Text style={styles.ctaText}>Paga {fmt(finalTotal, currency)} →</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  stepLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  sectionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, flex: 1 },
  itemIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemIcon: { fontSize: 18 },
  itemInfo: { flex: 1, gap: 2 },
  itemType: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    lineHeight: 19,
  },
  itemDetail: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  itemPrice: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    flexShrink: 0,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  totalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  totalValue: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  grandLabel: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: Colors.text.primary },
  grandValue: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.accent,
  },
  note: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  cta: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
});
