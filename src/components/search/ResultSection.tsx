import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

interface Props {
  title: string;
  /** Total items available (controls badge). Pass 0 while loading. */
  totalCount: number;
  /** Items currently shown — displayed as "X di Y" when < totalCount. */
  visibleCount?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function ResultSection({
  title,
  totalCount,
  visibleCount,
  children,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotation = useSharedValue(defaultExpanded ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    rotation.value = withTiming(next ? 1 : 0, { duration: 220 });
  };

  const showCount = visibleCount !== undefined && totalCount > 0 && visibleCount < totalCount;
  const countLabel = showCount ? `${visibleCount} di ${totalCount}` : totalCount > 0 ? String(totalCount) : null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggle}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {countLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{countLabel}</Text>
            </View>
          )}
        </View>
        <Animated.Text style={[styles.chevron, chevronStyle]}>∨</Animated.Text>
      </Pressable>

      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: 4,
    minHeight: 44,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  badgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.white,
  },
  chevron: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text.muted,
  },
  content: {
    gap: Spacing.sm,
  },
});
