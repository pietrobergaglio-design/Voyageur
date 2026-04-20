import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CityBlockData } from '../../utils/bookings-grouping';
import { HotelRow, ActivityRow } from './BookingRows';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  block: CityBlockData;
  isDraft: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onNavigate: (bookingKey: string) => void;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function BookingsCityBlockImpl({
  block, isDraft, isCollapsed, onToggle, onNavigate,
}: Props) {
  const { stop, hotels, activities, dayRangeStart, dayRangeEnd } = block;
  const nightsLabel = `${stop.nights} ${stop.nights === 1 ? 'notte' : 'notti'}`;
  const hasAnyContent = hotels.length > 0 || activities.length > 0;
  const accessibilityLabel = `${isCollapsed ? 'Espandi' : 'Collassa'} ${stop.name}`;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: !isCollapsed }}
        style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={stop.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.headerRow}>
            <Text style={styles.flag}>{stop.flagEmoji}</Text>
            <View style={styles.headerInfo}>
              <Text style={styles.cityName}>📍 {stop.name.toUpperCase()}</Text>
              <Text style={styles.meta}>
                {fmtDate(stop.startDate)} – {fmtDate(stop.endDate)} · {nightsLabel} · Giorni {dayRangeStart}–{dayRangeEnd}
              </Text>
            </View>
            {stop.isBase && (
              <View style={styles.basePill}>
                <Text style={styles.basePillText}>Base</Text>
              </View>
            )}
            <Text style={styles.chevron}>{isCollapsed ? '▸' : '▾'}</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {!isCollapsed && (
        <View style={styles.body}>
          {!hasAnyContent && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nessuna prenotazione per questa tappa</Text>
            </View>
          )}

          {hotels.length > 0 && (
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>🏨 Hotel</Text>
              <View style={styles.rowsContainer}>
                {hotels.map((hotel) => (
                  <HotelRow
                    key={hotel.id}
                    hotel={hotel}
                    nights={stop.nights}
                    isDraft={isDraft}
                    checkIn={stop.startDate}
                    checkOut={stop.endDate}
                    onPress={() => onNavigate(`hotel_city_${stop.id}`)}
                  />
                ))}
              </View>
            </View>
          )}

          {activities.length > 0 && (
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>🎯 Attività</Text>
              <View style={styles.rowsContainer}>
                {activities.map((activity) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    isDraft={isDraft}
                    onPress={() => onNavigate(`activity_city_${stop.id}_${activity.id}`)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export const BookingsCityBlock = memo(BookingsCityBlockImpl);

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -Spacing.lg,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 64,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flag: { fontSize: 24 },
  headerInfo: { flex: 1, gap: 2 },
  cityName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  meta: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  basePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  basePillText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.white,
  },
  chevron: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: Colors.white,
    width: 18,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  subSection: { gap: 6 },
  subSectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  rowsContainer: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  emptyState: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
});
