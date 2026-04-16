import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const DAYS_IT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

const SHORT_MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

function formatShort(date: Date) {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isInRange(date: Date, from: Date, to: Date) {
  return date > from && date < to;
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const monStart = (firstDay + 6) % 7; // shift so Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((monStart + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const day = i - monStart + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

interface CalendarModalProps {
  visible: boolean;
  mode: 'in' | 'out';
  checkIn: Date;
  checkOut: Date;
  onSelectCheckIn: (d: Date) => void;
  onSelectCheckOut: (d: Date) => void;
  onClose: () => void;
}

function CalendarModal({
  visible, mode, checkIn, checkOut,
  onSelectCheckIn, onSelectCheckOut, onClose,
}: CalendarModalProps) {
  const initial = mode === 'in' ? checkIn : checkOut;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const cells = buildCalendarGrid(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    if (mode === 'in') {
      onSelectCheckIn(selected);
      if (selected >= checkOut) {
        const newOut = new Date(selected);
        newOut.setDate(newOut.getDate() + 1);
        onSelectCheckOut(newOut);
      }
    } else {
      if (selected <= checkIn) return;
      onSelectCheckOut(selected);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>
          {mode === 'in' ? 'Data di partenza' : 'Data di ritorno'}
        </Text>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTHS_IT[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.weekRow}>
          {DAYS_IT.map((d, i) => (
            <Text key={i} style={styles.weekLabel}>{d}</Text>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const date = new Date(viewYear, viewMonth, day);
            const isCheckIn = isSameDay(date, checkIn);
            const isCheckOut = isSameDay(date, checkOut);
            const inRange = isInRange(date, checkIn, checkOut);
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
            const isSelected = mode === 'in' ? isCheckIn : isCheckOut;
            const isOtherSelected = mode === 'in' ? isCheckOut : isCheckIn;

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.cell,
                  inRange && styles.cellRange,
                  isCheckIn && styles.cellCheckIn,
                  isCheckOut && styles.cellCheckOut,
                  isSelected && styles.cellSelected,
                  isOtherSelected && styles.cellOther,
                  isPast && styles.cellPast,
                ]}
                onPress={() => !isPast && handleDay(day)}
                disabled={isPast || (mode === 'out' && date <= checkIn)}
              >
                <Text style={[
                  styles.cellText,
                  (isSelected || isCheckIn || isCheckOut) && styles.cellTextSelected,
                  inRange && styles.cellTextRange,
                  isPast && styles.cellTextPast,
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

interface Props {
  checkIn: Date;
  checkOut: Date;
  onChangeCheckIn: (d: Date) => void;
  onChangeCheckOut: (d: Date) => void;
}

export function DateRangePicker({ checkIn, checkOut, onChangeCheckIn, onChangeCheckOut }: Props) {
  const [modalMode, setModalMode] = useState<'in' | 'out' | null>(null);

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setModalMode('in')}
          activeOpacity={0.7}
        >
          <Text style={styles.dateBtnLabel}>Da</Text>
          <Text style={styles.dateBtnValue}>{formatShort(checkIn)}</Text>
        </TouchableOpacity>

        <View style={styles.dateSeparator} />

        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setModalMode('out')}
          activeOpacity={0.7}
        >
          <Text style={styles.dateBtnLabel}>A</Text>
          <Text style={styles.dateBtnValue}>{formatShort(checkOut)}</Text>
        </TouchableOpacity>
      </View>

      {modalMode !== null && (
        <CalendarModal
          visible
          mode={modalMode}
          checkIn={checkIn}
          checkOut={checkOut}
          onSelectCheckIn={onChangeCheckIn}
          onSelectCheckOut={onChangeCheckOut}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  dateBtnLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    marginBottom: 2,
  },
  dateBtnValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text.primary,
  },
  dateSeparator: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  // ─── Modal ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  navArrow: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 28,
    color: Colors.text.primary,
    lineHeight: 32,
  },
  monthLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text.primary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRange: {
    backgroundColor: `${Colors.accent}18`,
  },
  cellCheckIn: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    backgroundColor: `${Colors.accent}18`,
  },
  cellCheckOut: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: `${Colors.accent}18`,
  },
  cellSelected: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
  },
  cellOther: {
    backgroundColor: `${Colors.accent}40`,
    borderRadius: 20,
  },
  cellPast: {
    opacity: 0.3,
  },
  cellText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  cellTextSelected: {
    color: Colors.white,
    fontFamily: FontFamily.bodySemiBold,
  },
  cellTextRange: {
    color: Colors.accent,
  },
  cellTextPast: {
    color: Colors.text.muted,
  },
});
