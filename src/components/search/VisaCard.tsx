import { View, Text, StyleSheet } from 'react-native';
import type { VisaInfo, VisaStatus } from '../../types/booking';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const STATUS_CONFIG: Record<VisaStatus, { emoji: string; label: string; color: string }> = {
  not_required: { emoji: '✅', label: 'Non richiesto',      color: '#22a06b' },
  evisa:        { emoji: '⚠️', label: 'eVisa necessario',   color: '#d97706' },
  on_arrival:   { emoji: '🟡', label: 'Visto all\'arrivo',  color: '#d97706' },
  required:     { emoji: '🔴', label: 'Visto richiesto',    color: '#dc2626' },
};

interface Props {
  visa: VisaInfo;
}

export function VisaCard({ visa }: Props) {
  const config = STATUS_CONFIG[visa.status];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.destination}>🛂 {visa.destination}</Text>
        <View style={[styles.statusBadge, { borderColor: config.color + '40' }]}>
          <Text style={styles.statusEmoji}>{config.emoji}</Text>
          <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      <Text style={styles.details}>{visa.details}</Text>

      {visa.processingDays && (
        <Text style={styles.meta}>
          ⏱ Processamento: {visa.processingDays} giorni lavorativi
        </Text>
      )}
      {visa.fee && (
        <Text style={styles.meta}>
          💳 Costo: {visa.fee} {visa.feeCurrency ?? 'EUR'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  destination: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  statusEmoji: { fontSize: 12 },
  statusLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
  },
  details: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
});
