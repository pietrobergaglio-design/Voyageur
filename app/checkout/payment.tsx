import { View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/constants/theme';
import type { PaymentTab } from '../../src/types/checkout';

const MOCK_SAVED_CARD = { last4: '4242', brand: 'Visa', expiry: '12/27' };

function StepDots({ current }: { current: number }) {
  return (
    <View style={styles.stepDots}>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={[styles.stepDot, i < current && styles.stepDotDone, i === current - 1 && styles.stepDotActive]} />
      ))}
    </View>
  );
}

function CheckoutHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12} accessibilityLabel="Indietro">
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <StepDots current={3} />
      </View>
    </View>
  );
}

function TabBar({ active, onSelect }: { active: PaymentTab; onSelect: (t: PaymentTab) => void }) {
  const tabs: { id: PaymentTab; label: string }[] = [
    { id: 'saved', label: '💳 Salvata' },
    { id: 'new', label: '➕ Nuova carta' },
    { id: 'apple_pay', label: ' Apple Pay' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => (
        <Pressable
          key={t.id}
          style={[styles.tab, active === t.id && styles.tabActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(t.id); }}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === t.id }}
        >
          <Text style={[styles.tabText, active === t.id && styles.tabTextActive]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SavedCard() {
  return (
    <View style={styles.savedCardWrap}>
      <View style={styles.savedCard}>
        <View style={styles.savedCardLeft}>
          <Text style={styles.savedCardBrand}>{MOCK_SAVED_CARD.brand}</Text>
          <Text style={styles.savedCardNumber}>•••• •••• •••• {MOCK_SAVED_CARD.last4}</Text>
          <Text style={styles.savedCardExpiry}>Scad. {MOCK_SAVED_CARD.expiry}</Text>
        </View>
        <View style={styles.savedCardBadge}>
          <Text style={styles.savedCardBadgeText}>✓ Predefinita</Text>
        </View>
      </View>
      <Text style={styles.savedCardNote}>
        Questa carta verrà addebitata al momento della conferma.
      </Text>
    </View>
  );
}

function NewCard() {
  const { newCard, setNewCard } = useCheckoutStore();

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <View style={styles.newCardWrap}>
      <Text style={styles.fieldLabel}>Numero carta</Text>
      <TextInput
        style={styles.cardInput}
        value={newCard.number}
        onChangeText={(v) => setNewCard({ number: formatCardNumber(v) })}
        placeholder="1234 5678 9012 3456"
        placeholderTextColor={Colors.text.muted}
        keyboardType="numeric"
        maxLength={19}
      />

      <View style={styles.cardRow}>
        <View style={styles.cardRowField}>
          <Text style={styles.fieldLabel}>Scadenza</Text>
          <TextInput
            style={styles.cardInput}
            value={newCard.expiry}
            onChangeText={(v) => setNewCard({ expiry: formatExpiry(v) })}
            placeholder="MM/AA"
            placeholderTextColor={Colors.text.muted}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={styles.cardRowField}>
          <Text style={styles.fieldLabel}>CVV</Text>
          <TextInput
            style={styles.cardInput}
            value={newCard.cvv}
            onChangeText={(v) => setNewCard({ cvv: v.replace(/\D/g, '').slice(0, 4) })}
            placeholder="123"
            placeholderTextColor={Colors.text.muted}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
          />
        </View>
      </View>

      <View style={styles.saveRow}>
        <Text style={styles.saveLabel}>Salva per i prossimi viaggi</Text>
        <Switch
          value={newCard.save}
          onValueChange={(v) => setNewCard({ save: v })}
          trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
          thumbColor={newCard.save ? Colors.accent : Colors.text.muted}
        />
      </View>

      <Text style={styles.stripeNote}>
        🔒 I dati carta vengono cifrati con Stripe TLS. Non vengono mai salvati sui nostri server.
      </Text>
    </View>
  );
}

function ApplePay({ onPay }: { onPay: () => void }) {
  return (
    <View style={styles.applePayWrap}>
      <Pressable
        style={({ pressed }) => [styles.applePayBtn, pressed && { opacity: 0.85 }]}
        onPress={onPay}
        accessibilityRole="button"
        accessibilityLabel="Paga con Apple Pay"
      >
        <Text style={styles.applePayText}> Paga con Apple Pay</Text>
      </Pressable>
      <Text style={styles.applePayNote}>
        Autorizza il pagamento con Face ID o Touch ID. Rapido e sicuro.
      </Text>
    </View>
  );
}

function methodLabel(tab: PaymentTab) {
  if (tab === 'saved') return `carta ••••${MOCK_SAVED_CARD.last4}`;
  if (tab === 'new') return 'nuova carta';
  return 'Apple Pay';
}

export default function PaymentScreen() {
  const { snapshot, paymentTab, setPaymentTab, newCard } = useCheckoutStore();

  if (!snapshot) {
    router.replace('/(tabs)/search');
    return null;
  }

  const { finalTotal, currency } = snapshot;

  const canPay =
    paymentTab === 'saved' ||
    paymentTab === 'apple_pay' ||
    (paymentTab === 'new' && newCard.number.replace(/\s/g, '').length === 16 && newCard.expiry.length === 5 && newCard.cvv.length >= 3);

  const handlePay = () => {
    if (!canPay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/checkout/processing');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CheckoutHeader onBack={() => router.back()} />

      <View style={styles.totalBanner}>
        <Text style={styles.totalBannerLabel}>Totale da pagare</Text>
        <Text style={styles.totalBannerValue}>
          {finalTotal.toLocaleString('it-IT')} {currency}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TabBar active={paymentTab} onSelect={setPaymentTab} />

        {paymentTab === 'saved' && <SavedCard />}
        {paymentTab === 'new' && <NewCard />}
        {paymentTab === 'apple_pay' && <ApplePay onPay={handlePay} />}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, !canPay && styles.ctaDisabled, pressed && styles.ctaPressed]}
          onPress={handlePay}
          disabled={!canPay}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>
            Paga con {methodLabel(paymentTab)} →
          </Text>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.text.secondary },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  stepLabel: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.navy,
  },
  totalBannerLabel: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)' },
  totalBannerValue: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.xl, color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radius.sm - 2,
  },
  tabActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2 },
  tabText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.muted, textAlign: 'center' },
  tabTextActive: { color: Colors.text.primary, fontFamily: FontFamily.bodySemiBold },
  savedCardWrap: { gap: Spacing.sm },
  savedCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  savedCardLeft: { gap: 4 },
  savedCardBrand: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.md, color: 'rgba(255,255,255,0.7)' },
  savedCardNumber: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.lg, color: Colors.white, letterSpacing: 2 },
  savedCardExpiry: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.55)' },
  savedCardBadge: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  savedCardBadgeText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.xs, color: Colors.white },
  savedCardNote: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted, textAlign: 'center' },
  newCardWrap: { gap: Spacing.sm },
  fieldLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    minHeight: 48,
  },
  cardRow: { flexDirection: 'row', gap: Spacing.sm },
  cardRowField: { flex: 1 },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 52,
  },
  saveLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary },
  stripeNote: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted, lineHeight: 18, textAlign: 'center' },
  applePayWrap: { gap: Spacing.md, alignItems: 'center' },
  applePayBtn: {
    backgroundColor: '#000',
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    minWidth: 220,
    minHeight: 52,
    justifyContent: 'center',
  },
  applePayText: { fontFamily: FontFamily.bodyBold, fontSize: FontSize.lg, color: '#fff' },
  applePayNote: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted, textAlign: 'center', lineHeight: 18 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
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
  ctaDisabled: { backgroundColor: Colors.accent + '55', shadowOpacity: 0 },
  ctaPressed: { opacity: 0.88 },
  ctaText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },
});
