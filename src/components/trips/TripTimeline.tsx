import { View, Text, StyleSheet } from 'react-native';
import type { TripItem } from '../../types/trip';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const TYPE_CONFIG: Record<TripItem['type'], { emoji: string; color: string }> = {
  flight:    { emoji: '✈️', color: Colors.navy },
  hotel:     { emoji: '🏨', color: Colors.teal },
  car:       { emoji: '🚗', color: '#7c3aed' },
  activity:  { emoji: '🎟️', color: Colors.accent },
  insurance: { emoji: '🛡️', color: '#d97706' },
};

const REFUND_CONFIG = {
  flexible: { label: 'Rimborsabile', color: '#22a06b' },
  moderate: { label: 'Parziale',     color: '#d97706' },
  strict:   { label: 'Non rimb.',    color: '#dc2626' },
};

function QRPlaceholder({ code }: { code: string }) {
  return (
    <View style={qrStyles.container}>
      <View style={qrStyles.grid}>
        {Array.from({ length: 25 }).map((_, i) => (
          <View
            key={i}
            style={[
              qrStyles.cell,
              // deterministic "random" fill based on code + position
              (code.charCodeAt(i % code.length) + i) % 3 === 0 && qrStyles.cellFilled,
            ]}
          />
        ))}
      </View>
      <Text style={qrStyles.codeText}>{code}</Text>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
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
  cellFilled: {
    backgroundColor: Colors.navy,
  },
  codeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    letterSpacing: 1,
  },
});

interface Props {
  items: TripItem[];
}

export function TripTimeline({ items }: Props) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const tc = TYPE_CONFIG[item.type];
        return (
          <View key={item.id} style={styles.row}>
            {/* Vertical line */}
            <View style={styles.lineCol}>
              <View style={[styles.dot, { backgroundColor: tc.color }]}>
                <Text style={styles.dotEmoji}>{tc.emoji}</Text>
              </View>
              {index < items.length - 1 && <View style={styles.line} />}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitles}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    <Text style={styles.itemDate}>{item.dateLabel}</Text>
                  </View>
                  <QRPlaceholder code={item.confirmCode} />
                </View>

                <View style={styles.itemFooter}>
                  {item.refundPolicy && (
                    <View style={[styles.refundBadge, { borderColor: REFUND_CONFIG[item.refundPolicy].color + '40' }]}>
                      <Text style={[styles.refundText, { color: REFUND_CONFIG[item.refundPolicy].color }]}>
                        {REFUND_CONFIG[item.refundPolicy].label}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.itemPrice}>
                    {item.price.toLocaleString('it-IT')} €
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  lineCol: {
    alignItems: 'center',
    width: 36,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: {
    fontSize: 16,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
    minHeight: 20,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  itemTitles: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  itemSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  itemDate: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.teal,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  refundBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  refundText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
  },
  itemPrice: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
});
