import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { FilterOption } from '../../utils/filter-helpers';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  options: FilterOption[];
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  totalCount: number;
  filteredCount: number;
  searchPlaceholder?: string;
}

export function FilterBar({
  query,
  onQueryChange,
  options,
  activeFilters,
  onFiltersChange,
  totalCount,
  filteredCount,
  searchPlaceholder = 'Cerca…',
}: Props) {
  const hasActive = query.trim().length > 0 || activeFilters.length > 0;
  const isFiltered = filteredCount < totalCount;

  const toggleFilter = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeFilters.includes(key)) {
      onFiltersChange(activeFilters.filter((k) => k !== key));
    } else {
      onFiltersChange([...activeFilters, key]);
    }
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQueryChange('');
    onFiltersChange([]);
  };

  return (
    <View style={styles.container}>
      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder={searchPlaceholder}
            placeholderTextColor={Colors.text.muted}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel={searchPlaceholder}
          />
        </View>
        {hasActive && (
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
            onPress={reset}
            accessibilityLabel="Rimuovi filtri"
            accessibilityRole="button"
          >
            <Text style={styles.resetText}>✕ Reset</Text>
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      {options.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {options.slice(0, 6).map((opt) => {
            const isActive = activeFilters.includes(opt.key);
            return (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.chip,
                  isActive && styles.chipActive,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => toggleFilter(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${opt.label} (${opt.count})`}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.chipCount, isActive && styles.chipCountActive]}>
                  {opt.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Result count — only when actively filtered */}
      {isFiltered && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredCount} {filteredCount === 1 ? 'risultato' : 'risultati'}
          </Text>
          {filteredCount === 0 && (
            <Pressable onPress={reset} accessibilityRole="button">
              <Text style={styles.removeFilters}>Rimuovi filtri</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    height: 40,
    gap: 6,
  },
  searchIcon: { fontSize: 14 },
  input: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    height: 40,
  },
  resetBtn: {
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    minHeight: 30,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipPressed: { opacity: 0.8 },
  chipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  chipTextActive: { color: Colors.white },
  chipCount: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: Colors.text.muted,
    backgroundColor: Colors.border,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    textAlign: 'center',
    lineHeight: 16,
  },
  chipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    color: Colors.white,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 2,
  },
  countText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
  removeFilters: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
});
