import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../../constants/theme';

interface Props {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function ResultSection({ title, count, children, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '∧' : '∨'}</Text>
      </TouchableOpacity>

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
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
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
