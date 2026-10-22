import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LedgerPalette } from '@/constants/theme';

import { AppIcon } from './app-icon';
import { getDateKey } from './model';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const monthFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
});

type MonthCalendarProps = {
  colors: LedgerPalette;
  selectedDate: string;
  entryCounts: Record<string, number>;
  onSelectDate: (date: string) => void;
};

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function getMonthStart(dateKey: string) {
  const date = fromDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function getCalendarCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: offset }, () => null);

  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(getDateKey(new Date(year, monthIndex, day, 12)));
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push(null);
  }
  return cells;
}

export function MonthCalendar({
  colors,
  selectedDate,
  entryCounts,
  onSelectDate,
}: MonthCalendarProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(selectedDate));
  const today = getDateKey();
  const todayMonthKey = today.slice(0, 7);
  const visibleMonthKey = getDateKey(visibleMonth).slice(0, 7);
  const cells = useMemo(() => getCalendarCells(visibleMonth), [visibleMonth]);

  useEffect(() => {
    const selectedMonth = getMonthStart(selectedDate);
    if (
      selectedMonth.getFullYear() !== visibleMonth.getFullYear() ||
      selectedMonth.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(selectedMonth);
    }
  }, [selectedDate, visibleMonth]);

  function moveMonth(delta: number) {
    const target = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + delta,
      1,
      12
    );
    if (delta > 0 && getDateKey(target).slice(0, 7) > todayMonthKey) {
      return;
    }
    const selectedDay = fromDateKey(selectedDate).getDate();
    const targetDayCount = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    const candidate = getDateKey(
      new Date(
        target.getFullYear(),
        target.getMonth(),
        Math.min(selectedDay, targetDayCount),
        12
      )
    );
    const nextDate = candidate > today ? today : candidate;
    setVisibleMonth(target);
    onSelectDate(nextDate);
  }

  return (
    <View style={styles.card}>
      <View style={styles.monthHeader}>
        <Pressable
          accessibilityLabel="查看上个月"
          accessibilityRole="button"
          onPress={() => moveMonth(-1)}
          style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
          <AppIcon name="back" size={17} color={colors.ink} />
        </Pressable>
        <Text selectable style={styles.monthTitle}>
          {monthFormatter.format(visibleMonth)}
        </Text>
        <Pressable
          accessibilityLabel="查看下个月"
          accessibilityRole="button"
          accessibilityState={{ disabled: visibleMonthKey >= todayMonthKey }}
          disabled={visibleMonthKey >= todayMonthKey}
          onPress={() => moveMonth(1)}
          style={({ pressed }) => [
            styles.monthButton,
            visibleMonthKey >= todayMonthKey && styles.monthButtonDisabled,
            pressed && styles.pressed,
          ]}>
          <AppIcon
            name="chevron-right"
            size={17}
            color={visibleMonthKey >= todayMonthKey ? colors.muted : colors.ink}
          />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday, index) => (
          <Text
            key={weekday}
            style={[
              styles.weekday,
              index >= 5 && styles.weekend,
            ]}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {cells.map((dateKey, index) => {
          if (!dateKey) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }
          const day = fromDateKey(dateKey).getDate();
          const selected = dateKey === selectedDate;
          const isToday = dateKey === today;
          const disabled = dateKey > today;
          const count = entryCounts[dateKey] ?? 0;

          return (
            <Pressable
              accessibilityLabel={`${day}日${count > 0 ? `，${count}笔流水` : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={dateKey}
              onPress={() => onSelectDate(dateKey)}
              style={({ pressed }) => [
                styles.dayCell,
                isToday && styles.todayCell,
                selected && styles.selectedCell,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  selected && styles.selectedText,
                  disabled && styles.disabledText,
                ]}>
                {day}
              </Text>
              {count > 0 ? (
                <View style={[styles.dot, selected && styles.selectedDot]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: LedgerPalette) {
  return StyleSheet.create({
    card: {
      gap: 10,
      borderRadius: 24,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 10,
      boxShadow: '0px 12px 26px rgba(50, 82, 100, 0.07)',
    },
    monthHeader: {
      height: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 3,
    },
    monthButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.input,
    },
    monthButtonDisabled: {
      opacity: 0.45,
    },
    monthTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '800',
    },
    weekRow: {
      flexDirection: 'row',
    },
    weekday: {
      width: '14.2857%',
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
    },
    weekend: {
      color: colors.aqua,
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.2857%',
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      borderRadius: 14,
    },
    todayCell: {
      borderWidth: 1,
      borderColor: colors.skyDeep,
    },
    selectedCell: {
      borderWidth: 1,
      borderColor: colors.ink,
      backgroundColor: colors.ink,
    },
    dayText: {
      color: colors.ink,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    todayText: {
      fontWeight: '800',
    },
    selectedText: {
      color: colors.card,
      fontWeight: '800',
    },
    disabledText: {
      color: colors.muted,
      opacity: 0.38,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.aqua,
    },
    selectedDot: {
      backgroundColor: colors.frost,
    },
    pressed: {
      opacity: 0.68,
    },
  });
}
