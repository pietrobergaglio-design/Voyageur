import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import type { VisaInfo, VisaStatus } from '../../types/booking';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const STATUS_CONFIG: Record<VisaStatus, { emoji: string; label: string; color: string; bg: string }> = {
  not_required: { emoji: '✅', label: 'Non richiesto',      color: '#22a06b', bg: '#f0fdf4' },
  evisa:        { emoji: '🟡', label: 'eVisa necessario',   color: '#d97706', bg: '#fffbeb' },
  on_arrival:   { emoji: '🟡', label: "Visto all'arrivo",   color: '#d97706', bg: '#fffbeb' },
  required:     { emoji: '🔴', label: 'Visto richiesto',    color: '#dc2626', bg: '#fef2f2' },
};

interface Props {
  visa: VisaInfo;
}

export function VisaCard({ visa }: Props) {
  const config = STATUS_CONFIG[visa.status];

  return (
    <View style={[styles.card, { borderLeftColor: config.color, backgroundColor: config.bg }]}>
      <View style={styles.headerRow}>
        <View style={styles.destBlock}>
          {visa.destinationFlag && (
            <Text style={styles.flag}>{visa.destinationFlag}</Text>
          )}
          <Text style={styles.destination}>{visa.destination}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: config.color + '40', backgroundColor: Colors.white }]}>
          <Text style={styles.statusEmoji}>{config.emoji}</Text>
          <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      <Text style={styles.details}>{visa.details}</Text>

      {visa.requirements && visa.requirements.length > 0 && (
        <View style={styles.requirementsBlock}>
          {visa.requirements.map((req) => (
            <Text key={req} style={styles.requirement}>• {req}</Text>
          ))}
        </View>
      )}

      <View style={styles.metaRow}>
        {visa.processingDays !== undefined && (
          <Text style={styles.meta}>⏱ {visa.processingDays} gg lavorativi</Text>
        )}
        {visa.fee !== undefined && (
          <Text style={styles.meta}>💳 {visa.fee} {visa.feeCurrency ?? 'USD'}</Text>
        )}
      </View>

      {visa.applyLink && (
        <TouchableOpacity onPress={() => Linking.openURL(visa.applyLink!)} style={[styles.applyBtn, { borderColor: config.color }]}>
          <Text style={[styles.applyBtnText, { color: config.color }]}>Richiedi eVisa →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderLeftWidth: 4,
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
  destBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 22,
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
  requirementsBlock: {
    gap: 3,
  },
  requirement: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  applyBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
});
