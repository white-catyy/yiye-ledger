import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LedgerPalette } from '@/constants/theme';
import { AppIcon } from '@/features/ledger/app-icon';
import { EntryEditor } from '@/features/ledger/entry-editor';
import { LedgerEntryRow } from '@/features/ledger/entry-row';
import { useLedger } from '@/features/ledger/ledger-provider';
import {
  formatEntryDate,
  formatMoney,
  isSameMonth,
  sumEntries,
  type LedgerEntry,
} from '@/features/ledger/model';

type MonthSection = {
  date: string;
  total: number;
  data: LedgerEntry[];
};

export default function DetailScreen() {
  const { ledger, colors, upsertEntry, removeEntry } = useLedger();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  const monthEntries = useMemo(
    () => ledger.entries.filter((entry) => isSameMonth(entry.date)),
    [ledger.entries]
  );
  const total = useMemo(() => sumEntries(monthEntries), [monthEntries]);
  const sections = useMemo(() => {
    const grouped = new Map<string, LedgerEntry[]>();
    monthEntries.forEach((entry) => {
      const list = grouped.get(entry.date) ?? [];
      list.push(entry);
      grouped.set(entry.date, list);
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([date, data]) => ({
        date,
        total: sumEntries(data),
        data: [...data].sort((left, right) => left.time.localeCompare(right.time)),
      }));
  }, [monthEntries]);

  const handleEdit = useCallback(
    (id: string) => {
      const target = ledger.entries.find((entry) => entry.id === id) ?? null;
      setEditingEntry(target);
      setEditorVisible(Boolean(target));
    },
    [ledger.entries]
  );

  const contentStyle = useMemo(
    () => [
      styles.content,
      process.env.EXPO_OS === 'android' && { paddingTop: insets.top + 8 },
    ],
    [insets.top, styles.content]
  );

  return (
    <View style={styles.screen}>
      <SectionList
        contentContainerStyle={contentStyle}
        contentInsetAdjustmentBehavior="automatic"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyMonth colors={colors} styles={styles} />}
        ListFooterComponent={
          sections.length > 0 ? (
            <Text selectable style={styles.footerHint}>
              这里按日期展示本月全部流水
            </Text>
          ) : undefined
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text selectable style={styles.title}>
                  本月明细
                </Text>
                <Text selectable style={styles.subtitle}>
                  按日期整理，不再重复首页内容
                </Text>
              </View>
              <View style={styles.headerIcon}>
                <AppIcon name="document" size={21} color={colors.ink} />
              </View>
            </View>

            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>本月流水</Text>
                <Text selectable style={styles.summaryAmount}>
                  ¥{formatMoney(total)}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text selectable style={styles.countText}>
                  {monthEntries.length} 笔
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index, section }) => (
          <LedgerEntryRow
            amount={item.amount}
            categoryId={item.categoryId}
            id={item.id}
            isLast={index === section.data.length - 1}
            name={item.name}
            note={item.note}
            onEdit={handleEdit}
            time={item.time}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.dateHeader}>
            <Text selectable style={styles.dateTitle}>
              {formatEntryDate(section.date)}
            </Text>
            <Text selectable style={styles.dateTotal}>
              ¥{formatMoney(section.total)}
            </Text>
          </View>
        )}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <EntryEditor
        entry={editingEntry}
        onDelete={(id) => {
          removeEntry(id);
          setEditorVisible(false);
        }}
        onDismiss={() => setEditorVisible(false)}
        onSave={(entry) => {
          upsertEntry(entry);
          setEditorVisible(false);
        }}
        visible={editorVisible}
      />
    </View>
  );
}

function EmptyMonth({
  colors,
  styles,
}: {
  colors: LedgerPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon name="document" size={23} color={colors.aqua} />
      </View>
      <Text selectable style={styles.emptyTitle}>
        本月还没有流水
      </Text>
      <Text selectable style={styles.emptyText}>
        回到首页记下第一笔后，这里会按日期整理。
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
    header: {
      minHeight: 68,
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
    summary: {
      minHeight: 122,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 24,
      backgroundColor: colors.card,
      paddingHorizontal: 21,
      boxShadow: '0px 12px 26px rgba(50, 82, 100, 0.07)',
    },
    summaryLabel: {
      marginBottom: 4,
      color: colors.inkSoft,
      fontSize: 11,
      fontWeight: '600',
    },
    summaryAmount: {
      color: colors.ink,
      fontSize: 31,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      letterSpacing: -1,
    },
    countBadge: {
      borderRadius: 14,
      backgroundColor: colors.frost,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    countText: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: '800',
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingTop: 22,
      paddingBottom: 8,
    },
    dateTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    dateTotal: {
      color: colors.inkSoft,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    empty: {
      minHeight: 230,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 18,
      borderRadius: 24,
      backgroundColor: colors.card,
      paddingHorizontal: 28,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      borderRadius: 16,
      backgroundColor: colors.frost,
    },
    emptyTitle: {
      color: colors.ink,
      fontSize: 15,
      fontWeight: '800',
    },
    emptyText: {
      color: colors.inkSoft,
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
    },
    footerHint: {
      paddingTop: 18,
      color: colors.muted,
      fontSize: 10,
      textAlign: 'center',
    },
  });
}
