import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { DateRangePicker } from './DateRangePicker';
import { TravelerSelector } from './TravelerSelector';
import type { SearchParams } from '../../types/booking';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props {
  params: SearchParams;
  onChange: (params: SearchParams) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export function SearchBar({ params, onChange, onSearch, isLoading }: Props) {
  const update = (partial: Partial<SearchParams>) => onChange({ ...params, ...partial });

  return (
    <View style={styles.container}>
      {/* Origin */}
      <View style={styles.inputRow}>
        <Text style={styles.inputIcon}>🛫</Text>
        <TextInput
          style={styles.input}
          placeholder="Da dove parti?"
          placeholderTextColor={Colors.text.muted}
          value={params.origin}
          onChangeText={(v) => update({ origin: v, originCode: '' })}
          returnKeyType="next"
          autoCapitalize="words"
        />
        {params.origin.length > 0 && (
          <TouchableOpacity onPress={() => update({ origin: '', originCode: '' })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Cancella partenza">
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Destination */}
      <View style={styles.inputRow}>
        <Text style={styles.inputIcon}>📍</Text>
        <TextInput
          style={styles.input}
          placeholder="Dove vuoi andare?"
          placeholderTextColor={Colors.text.muted}
          value={params.destination}
          onChangeText={(v) => update({ destination: v, destinationCode: '' })}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          autoCapitalize="words"
        />
        {params.destination.length > 0 && (
          <TouchableOpacity onPress={() => update({ destination: '', destinationCode: '' })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Cancella destinazione">
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dates */}
      <DateRangePicker
        checkIn={params.checkIn}
        checkOut={params.checkOut}
        onChangeCheckIn={(d) => update({ checkIn: d })}
        onChangeCheckOut={(d) => update({ checkOut: d })}
      />

      {/* Travelers */}
      <TravelerSelector
        value={params.travelers}
        onChange={(v) => update({ travelers: v })}
      />

      {/* Search button */}
      <TouchableOpacity
        style={[styles.searchBtn, isLoading && styles.searchBtnLoading]}
        onPress={onSearch}
        activeOpacity={0.85}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={isLoading ? 'Ricerca in corso' : 'Cerca tutto'}
        accessibilityState={{ disabled: !!isLoading }}
      >
        {isLoading ? (
          <View style={styles.searchBtnInner}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.searchBtnText}>Ricerca in corso…</Text>
          </View>
        ) : (
          <Text style={styles.searchBtnText}>Cerca tutto 🔍</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.text.primary,
    paddingVertical: 11,
  },
  clear: {
    fontSize: 14,
    color: Colors.text.muted,
    paddingHorizontal: 4,
  },
  searchBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  searchBtnLoading: {
    opacity: 0.75,
  },
  searchBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});
