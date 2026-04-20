import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../../src/stores/useAppStore';
import { mockTokyoTrip } from '../../src/data/mockTrip';
import { DocSection } from '../../src/components/docs/DocSection';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';
import type { TripItem } from '../../src/types/trip';
import type { BookingItem } from '../../src/types/booking';

// ─── QR placeholder ───────────────────────────────────────────────────────────

function QRBlock({ code }: { code: string }) {
  const cells = useMemo(
    () => Array.from({ length: 25 }, (_, i) => (code.charCodeAt(i % code.length) + i) % 3 === 0),
    [code],
  );

  return (
    <View style={qrStyles.wrapper}>
      <View style={qrStyles.grid}>
        {cells.map((filled, i) => (
          <View key={i} style={[qrStyles.cell, filled && qrStyles.cellFilled]} />
        ))}
      </View>
      <Text style={qrStyles.codeText}>{code}</Text>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 75,
    height: 75,
    gap: 2,
  },
  cell: {
    width: 13,
    height: 13,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  cellFilled: { backgroundColor: Colors.navy },
  codeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    letterSpacing: 1,
  },
});

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    flexShrink: 0,
  },
  value: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    textAlign: 'right',
    flex: 1,
  },
});

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.border }} />;
}

// ─── Ticket card (boarding pass / hotel / activity / transport) ───────────────

function TicketCard({ item }: { item: TripItem }) {
  const TICKET_EMOJI: Record<TripItem['type'], string> = {
    flight: '✈️',
    hotel: '🏨',
    activity: '🎟️',
    car: '🚗',
    insurance: '🛡️',
  };

  return (
    <View style={ticketStyles.card}>
      <View style={ticketStyles.header}>
        <Text style={ticketStyles.emoji}>{TICKET_EMOJI[item.type]}</Text>
        <View style={ticketStyles.headerInfo}>
          <Text style={ticketStyles.title}>{item.title}</Text>
          <Text style={ticketStyles.subtitle}>{item.dateLabel}</Text>
        </View>
      </View>

      <Divider />

      <View style={ticketStyles.body}>
        <View style={ticketStyles.metaBlock}>
          {item.iata && (
            <>
              <InfoRow label="Rotta" value={`${item.iata.origin} → ${item.iata.destination}`} />
              {item.departureAt && (
                <InfoRow
                  label="Partenza"
                  value={new Date(item.departureAt).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              )}
              {item.arrivalAt && (
                <InfoRow
                  label="Arrivo"
                  value={new Date(item.arrivalAt).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              )}
              <InfoRow label="Gate" value="Da confermare" />
              <InfoRow label="Seat" value="Da assegnare" />
            </>
          )}
          {!item.iata && <InfoRow label="Dettaglio" value={item.subtitle} />}
          <InfoRow label="Codice conferma" value={item.confirmCode} />
        </View>

        <QRBlock code={item.confirmCode} />
      </View>
    </View>
  );
}

const ticketStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.navy + '06',
  },
  emoji: { fontSize: 22 },
  headerInfo: { gap: 2 },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  metaBlock: {
    flex: 1,
    gap: Spacing.sm,
  },
});

// ─── Refund row ───────────────────────────────────────────────────────────────

const REFUND_CONFIG = {
  flexible: {
    emoji: '🟢',
    label: 'Rimborsabile',
    color: '#22a06b',
    detail: 'Cancellazione gratuita. Rimborso totale entro i termini.',
    deadline: 'Fino a 48h prima della partenza',
  },
  moderate: {
    emoji: '🟡',
    label: 'Rimborso parziale',
    color: '#d97706',
    detail: 'Penale del 30–50% applicata dopo la scadenza.',
    deadline: 'Fino a 7 giorni prima',
  },
  strict: {
    emoji: '🔴',
    label: 'Non rimborsabile',
    color: '#dc2626',
    detail: 'Nessun rimborso. Possibile credito in caso di forza maggiore.',
    deadline: 'Nessuna eccezione',
  },
};

function RefundRow({ item }: { item: TripItem }) {
  if (!item.refundPolicy) return null;
  const rc = REFUND_CONFIG[item.refundPolicy];
  return (
    <View style={refundStyles.row}>
      <Text style={refundStyles.emoji}>{rc.emoji}</Text>
      <View style={refundStyles.info}>
        <View style={refundStyles.titleRow}>
          <Text style={refundStyles.itemTitle}>{item.title}</Text>
          <Text style={[refundStyles.policyLabel, { color: rc.color }]}>{rc.label}</Text>
        </View>
        <Text style={refundStyles.detail}>{rc.detail}</Text>
        <Text style={refundStyles.deadline}>⏰ {rc.deadline}</Text>
      </View>
    </View>
  );
}

const refundStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emoji: { fontSize: 18, marginTop: 2 },
  info: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemTitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    flex: 1,
  },
  policyLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
  },
  detail: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  deadline: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});

// ─── BookingItem ticket card (new format) ────────────────────────────────────

const BOOKING_EMOJI_MAP: Record<string, string> = {
  flight: '✈️', hotel: '🏨', activity: '🎯', car: '🚗',
  insurance: '🏥', visa: '🛂', transfer: '🚉',
};

function TicketCardBooking({ item, tripId }: { item: BookingItem; tripId: string }) {
  const confirmCode = item.confirmation?.code ?? '—';
  const canNavigate = item.type !== 'visa' && item.type !== 'insurance';

  return (
    <Pressable
      style={({ pressed }) => [ticketStyles.card, pressed && canNavigate && { opacity: 0.85 }]}
      onPress={() => canNavigate && router.push(`/trip/booking-detail?tripId=${tripId}&bookingKey=${item.id}`)}
      accessibilityRole={canNavigate ? 'button' : undefined}
    >
      <View style={ticketStyles.header}>
        <Text style={ticketStyles.emoji}>{BOOKING_EMOJI_MAP[item.type] ?? '📋'}</Text>
        <View style={ticketStyles.headerInfo}>
          <Text style={ticketStyles.title}>{item.title}</Text>
          <Text style={ticketStyles.subtitle}>{item.provider}</Text>
        </View>
      </View>
      <Divider />
      <View style={ticketStyles.body}>
        <View style={ticketStyles.metaBlock}>
          {item.type === 'flight' && item.flight && (
            <InfoRow label="Rotta" value={`${item.flight.origin} → ${item.flight.destination}`} />
          )}
          {item.timing.startDate && (
            <InfoRow
              label="Data"
              value={`${new Date(item.timing.startDate + 'T00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}${item.timing.startTime ? ` · ${item.timing.startTime}` : ''}`}
            />
          )}
          <InfoRow label="Codice conferma" value={confirmCode} />
          {canNavigate && <Text style={[ticketStyles.subtitle, { color: Colors.teal, marginTop: 2 }]}>Tocca per dettagli →</Text>}
        </View>
        <QRBlock code={confirmCode} />
      </View>
    </Pressable>
  );
}

// ─── Refund row for BookingItem (with deadline semaphore) ─────────────────────

function refundSemaphore(item: BookingItem): { emoji: '🟢' | '🟡' | '🔴'; label: string; color: string } {
  if (!item.refund.refundable) return { emoji: '🔴', label: 'Non rimborsabile', color: '#dc2626' };
  const deadline = item.refund.fullRefundDeadline ?? item.refund.partialRefundDeadline ?? null;
  if (!deadline) return { emoji: '🟢', label: 'Rimborsabile', color: '#22a06b' };
  const daysLeft = Math.floor((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 7) return { emoji: '🟢', label: `Rimborsabile · ${daysLeft} giorni rimasti`, color: '#22a06b' };
  if (daysLeft >= 2) return { emoji: '🟡', label: `⚠️ Scade tra ${daysLeft} giorni`, color: '#d97706' };
  if (daysLeft >= 0) return { emoji: '🔴', label: `🚨 Scade tra ${daysLeft} ${daysLeft === 1 ? 'giorno' : 'giorni'}`, color: '#dc2626' };
  return { emoji: '🔴', label: 'Scaduto', color: '#dc2626' };
}

function RefundRowBooking({ item }: { item: BookingItem }) {
  const sem = refundSemaphore(item);
  return (
    <View style={refundStyles.row}>
      <Text style={refundStyles.emoji}>{sem.emoji}</Text>
      <View style={refundStyles.info}>
        <View style={refundStyles.titleRow}>
          <Text style={refundStyles.itemTitle}>{item.title}</Text>
          <Text style={[refundStyles.policyLabel, { color: sem.color }]}>{item.refund.refundable && sem.emoji !== '🔴' ? 'Rimborsabile' : 'Non rimborsabile'}</Text>
        </View>
        <Text style={refundStyles.detail}>{item.refund.description}</Text>
        <Text style={[refundStyles.deadline, { color: sem.color }]}>⏰ {sem.label}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DocsScreen() {
  const insets = useSafeAreaInsets();
  const storeTrips = useAppStore((s) => s.trips);
  const activeTrip = storeTrips.length > 0 ? storeTrips[0] : mockTokyoTrip;

  const bookingTickets = (activeTrip.bookings ?? []).filter((b) => b.type !== 'insurance' && b.type !== 'visa');
  const bookingRefunds = (activeTrip.bookings ?? []).filter((b) => b.type !== 'visa');
  const bookingInsurance = (activeTrip.bookings ?? []).find((b) => b.type === 'insurance');


  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Documenti</Text>
        <Text style={styles.subtitle}>{activeTrip.destination} · {activeTrip.dateRange}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 🎫 Biglietti e conferme */}
        <DocSection title="Biglietti e conferme" emoji="🎫" defaultOpen>
          {bookingTickets.length > 0
            ? bookingTickets.map((item) => <TicketCardBooking key={item.id} item={item} tripId={activeTrip.id} />)
            : <Text style={styles.emptyText}>Nessun biglietto disponibile.</Text>
          }
        </DocSection>

        {/* 💸 Refund Policy */}
        <DocSection title="Politiche di rimborso" emoji="💸">
          {bookingRefunds.length > 0
            ? bookingRefunds.map((item) => <RefundRowBooking key={item.id} item={item} />)
            : <Text style={styles.emptyText}>Nessuna politica di rimborso disponibile.</Text>
          }
        </DocSection>

        {/* 🏥 Assicurazione */}
        <DocSection title="Assicurazione" emoji="🏥">
          {bookingInsurance ? (
            <View style={styles.insuranceBlock}>
              <InfoRow label="Provider" value={bookingInsurance.provider} />
              <InfoRow label="Piano" value={bookingInsurance.insurance?.plan ?? '—'} />
              <InfoRow label="Codice" value={bookingInsurance.confirmation?.code ?? '—'} />
              <Divider />
              <Text style={styles.coverageTitle}>Coperture</Text>
              {(bookingInsurance.insurance?.coverage ?? []).map((c) => (
                <Text key={c} style={styles.coverageItem}>✓ {c}</Text>
              ))}
            </View>
          ) : <Text style={styles.emptyText}>Nessuna assicurazione aggiunta.</Text>}
        </DocSection>

        {/* 🛂 Visto */}
        <DocSection title="Visto" emoji="🛂">
          <View style={styles.visaBlock}>
            <Text style={styles.visaStatus}>🟢 Visto non richiesto</Text>
            <Text style={styles.visaDetail}>
              Cittadini italiani: ingresso libero fino a 90 giorni per turismo.
            </Text>
            <Divider />
            <InfoRow label="Passaporto" value="Valido per tutta la durata del viaggio" />
            <InfoRow label="Permanenza max" value="90 giorni" />
          </View>
        </DocSection>

        {/* 🧾 Ricevute */}
        <DocSection title="Ricevute" emoji="🧾">
          {(activeTrip.bookings ?? []).map((item) => (
            <View key={item.id} style={styles.receiptRow}>
              <View style={styles.receiptLeft}>
                <Text style={styles.receiptTitle}>{item.title}</Text>
                <Text style={styles.receiptCode}>
                  {item.confirmation?.code ?? item.type}
                </Text>
              </View>
              <Text style={styles.receiptPrice}>{item.price.toLocaleString('it-IT')} €</Text>
            </View>
          ))}
          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>Totale viaggio</Text>
            <Text style={styles.receiptTotalPrice}>
              {activeTrip.totalPrice.toLocaleString('it-IT')} {activeTrip.currency}
            </Text>
          </View>
        </DocSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xxl,
    color: Colors.text.primary,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  insuranceBlock: { gap: Spacing.sm },
  coverageTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  coverageItem: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  visaBlock: { gap: Spacing.sm },
  visaStatus: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: '#22a06b',
  },
  visaDetail: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  receiptLeft: { gap: 2 },
  receiptTitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  receiptCode: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  receiptPrice: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  receiptTotalLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  receiptTotalPrice: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.accent,
  },
});
