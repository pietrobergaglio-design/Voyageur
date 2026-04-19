import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CityStop } from '../../types/multi-city';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  stop: CityStop;
  totalNights: number;
  remainingNights: number;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
  onChangeNights: (delta: number) => void;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function CityStopCard({
  stop,
  remainingNights,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onChangeNights,
}: Props) {
  const canRemoveNight = stop.nights > 1;
  const canAddNight = remainingNights > 0;

  return (
    <View style={styles.card}>
      {/* Color bar */}
      <LinearGradient
        colors={stop.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.colorBar}
      />

      <View style={styles.content}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={styles.flag}>{stop.flagEmoji}</Text>
            <Text style={styles.cityName}>{stop.name}</Text>
            {stop.isBase && (
              <View style={styles.baseBadge}>
                <Text style={styles.baseBadgeText}>Base</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {!stop.isBase && (
              <>
                {!isFirst && (
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    onPress={onMoveUp}
                  >
                    <Text style={styles.iconBtnText}>↑</Text>
                  </Pressable>
                )}
                {!isLast && (
                  <Pressable
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    onPress={onMoveDown}
                  >
                    <Text style={styles.iconBtnText}>↓</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.iconBtn, styles.iconBtnRemove, pressed && styles.iconBtnPressed]}
                  onPress={onRemove}
                >
                  <Text style={[styles.iconBtnText, { color: Colors.accent }]}>✕</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Date + nights row */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {formatShortDate(stop.startDate)} – {formatShortDate(stop.endDate)}
          </Text>
          <Text style={styles.sep}>·</Text>

          {/* Nights stepper */}
          <View style={styles.stepper}>
            <Pressable
              style={({ pressed }) => [styles.stepBtn, !canRemoveNight && styles.stepBtnDisabled, pressed && styles.stepBtnPressed]}
              onPress={() => canRemoveNight && onChangeNights(-1)}
              disabled={!canRemoveNight}
            >
              <Text style={[styles.stepBtnText, !canRemoveNight && styles.stepBtnTextDisabled]}>−</Text>
            </Pressable>
            <Text style={styles.nightsCount}>{stop.nights}</Text>
            <Pressable
              style={({ pressed }) => [styles.stepBtn, !canAddNight && styles.stepBtnDisabled, pressed && styles.stepBtnPressed]}
              onPress={() => canAddNight && onChangeNights(+1)}
              disabled={!canAddNight}
            >
              <Text style={[styles.stepBtnText, !canAddNight && styles.stepBtnTextDisabled]}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.nightsLabel}>{stop.nights === 1 ? 'notte' : 'notti'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  colorBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  flag: {
    fontSize: 18,
  },
  cityName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  baseBadge: {
    backgroundColor: Colors.teal + '22',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  baseBadgeText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.teal,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnRemove: {
    borderColor: Colors.accent + '44',
    backgroundColor: Colors.accent + '11',
  },
  iconBtnPressed: {
    opacity: 0.7,
  },
  iconBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  sep: {
    color: Colors.border,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: Colors.border,
  },
  stepBtnPressed: {
    opacity: 0.75,
  },
  stepBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.white,
    lineHeight: 18,
  },
  stepBtnTextDisabled: {
    color: Colors.text.muted,
  },
  nightsCount: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  nightsLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
});
