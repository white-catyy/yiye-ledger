import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LedgerPalette } from '@/constants/theme';
import { AppIcon } from '@/features/ledger/app-icon';
import { EntryEditor } from '@/features/ledger/entry-editor';
import { LedgerEntryRow } from '@/features/ledger/entry-row';
import { useLedger } from '@/features/ledger/ledger-provider';
import {
  formatEntryDate,
  formatMoney,
  getDateKey,
  sumEntries,
  type LedgerEntry,
} from '@/features/ledger/model';
import { MonthCalendar } from '@/features/ledger/month-calendar';

export default function DetailScreen() {
  const { ledger, colors, upsertEntry, removeEntry } = useLedger();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedDate, setSelectedDate] = useState(getDateKey);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  const entryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ledger.entries.forEach((entry) => {
      counts[entry.date] = (counts[entry.date] ?? 0) + 1;
    });
    return counts;
  }, [ledger.entries]);

  const selectedEntries = useMemo(
    () =>
      ledger.entries
        .filter((entry) => entry.date === selectedDate)
        .sort((left, right) => left.time.localeCompare(right.time)),
    [ledger.entries, selectedDate]
  );
  const selectedTotal = useMemo(() => sumEntries(selectedEntries), [selectedEntries]);

  const handleEdit = useCallback(
    (id: string) => {
      const target = ledger.entries.find((entry) => entry.id === id) ?? null;
      setEditingEntry(target);
      setEditorVisible(Boolean(target));
    },
    [ledger.entries]
  );

  const openNewEntry = useCallback(() => {
    setEditingEntry(null);
    setEditorVisible(true);
  }, []);

  const contentStyle = useMemo(
    () => [
      styles.content,
      process.env.EXPO_OS === 'android' && { paddingTop: insets.top + 8 },
    ],
    [insets.top, styles.content]
  );

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior="automatic"
        data={selectedEntries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyDay colors={colors} styles={styles} />}
        ListFooterComponent={
          <Text selectable style={styles.footerHint}>
            轻点流水可修改，使用“补记这一天”添加遗漏记录
          </Text>
        }
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text selectable style={styles.title}>
                  明细
                </Text>
                <Text selectable style={styles.subtitle}>
                  按月选择日期，补记历史流水
                </Text>
              </View>
              <View style={styles.headerIcon}>
                <AppIcon name="calendar" size={21} color={colors.ink} />
              </View>
            </View>

            <MonthCalendar
              colors={colors}
              entryCounts={entryCounts}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />

            <View style={styles.daySummary}>
              <View style={styles.daySummaryCopy}>
                <Text selectable style={styles.dayLabel}>
                  {formatEntryDate(selectedDate)}
                </Text>
                <Text selectable style={styles.dayAmount}>
                  ¥{formatMoney(selectedTotal)}
                </Text>
                <Text selectable style={styles.dayCount}>
                  {selectedEntries.length} 笔流水
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`补记${formatEntryDate(selectedDate)}的流水`}
                accessibilityRole="button"
                onPress={openNewEntry}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <AppIcon name="plus" size={17} color={colors.ink} />
                <Text style={styles.addButtonText}>补记这一天</Text>
              </Pressable>
            </View>

            {selectedEntries.length > 0 ? (
              <View style={styles.listLabelRow}>
                <Text style={styles.listLabel}>当天流水</Text>
                <Text style={styles.listHint}>轻点可改</Text>
              </View>
            ) : null}
          </View>
        }
        removeClippedSubviews
        renderItem={({ item, index }) => (
          <LedgerEntryRow
            amount={item.amount}
            categoryId={item.categoryId}
            id={item.id}
            isLast={index === selectedEntries.length - 1}
            name={item.name}
            note={item.note}
            onEdit={handleEdit}
            time={item.time}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <EntryEditor
        entry={editingEntry}
        initialDate={selectedDate}
        onDelete={(id) => {
          removeEntry(id);
          setEditorVisible(false);
        }}
        onDismiss={() => setEditorVisible(false)}
        onSave={(entry) => {
          upsertEntry(entry);
          setSelectedDate(entry.date);
          setEditorVisible(false);
        }}
        visible={editorVisible}
      />
    </View>
  );
}

function EmptyDay({
  colors,
  styles,
}: {
  colors: LedgerPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon name="calendar" size={23} color={colors.aqua} />
      </View>
      <Text selectable style={styles.emptyTitle}>
        这一天还没有流水
      </Text>
      <Text selectable style={styles.emptyText}>
        可以使用上方“补记这一天”添加历史记录。
      </Text>
    </View>
  );
}

function createStyles(colors: LedgerPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    content: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: process.env.EXPO_OS === 'web' ? 112 : 28,
    },
    headerStack: {
      gap: 14,
    },
    header: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCopy: {
      gap: 3,
    },
    title: {
      color: colors.ink,
      fontSize: 25,
      fontWeight: '800',
      letterSpacing: -0.7,
    },
    subtitle: {
      color: colors.inkSoft,
      fontSize: 11,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      backgroundColor: colors.frost,
    },
    daySummary: {
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      borderRadius: 22,
      backgroundColor: colors.card,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    daySummaryCopy: {
      gap: 1,
    },
    dayLabel: {
      color: colors.inkSoft,
      fontSize: 11,
      fontWeight: '700',
    },
    dayAmount: {
      color: colors.ink,
      fontSize: 27,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    dayCount: {
      color: colors.muted,
      fontSize: 10,
    },
    addButton: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 15,
      backgroundColor: colors.frost,
      paddingHorizontal: 13,
    },
    addButtonText: {
      color: colors.ink,
      fontSize: 11.5,
      fontWeight: '800',
    },
    listLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 3,
    },
    listLabel: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    listHint: {
      color: colors.aqua,
      fontSize: 10,
      fontWeight: '700',
    },
    empty: {
      minHeight: 185,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 12,
      borderRadius: 22,
      backgroundColor: colors.card,
      paddingHorizontal: 28,
    },
    emptyIcon: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
      borderRadius: 16,
      backgroundColor: colors.frost,
    },
    emptyTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    emptyText: {
      color: colors.inkSoft,
      fontSize: 10.5,
      lineHeight: 17,
      textAlign: 'center',
    },
    footerHint: {
      paddingTop: 16,
      color: colors.muted,
      fontSize: 9.5,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.68,
    },
  });
}
