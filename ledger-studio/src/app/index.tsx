import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LedgerPalette } from '@/constants/theme';
import { AppIcon } from '@/features/ledger/app-icon';
import { EntryEditor } from '@/features/ledger/entry-editor';
import { LedgerEntryRow } from '@/features/ledger/entry-row';
import { useLedger } from '@/features/ledger/ledger-provider';
import {
  formatMoney,
  formatToday,
  getDateKey,
  getYesterdayKey,
  isSameMonth,
  summarizeEntries,
  type LedgerEntry,
} from '@/features/ledger/model';

type HomeStyles = ReturnType<typeof createHomeStyles>;

type HomeHeaderProps = {
  dateLabel: string;
  expense: number;
  income: number;
  count: number;
  comparison: number;
  colors: LedgerPalette;
  styles: HomeStyles;
};

const HomeHeader = memo(function HomeHeader({
  dateLabel,
  expense,
  income,
  count,
  comparison,
  colors,
  styles,
}: HomeHeaderProps) {
  const comparisonText =
    comparison >= 0
      ? `比昨天少 ¥${formatMoney(comparison)}`
      : `比昨天多 ¥${formatMoney(Math.abs(comparison))}`;

  return (
    <View>
      <View style={styles.topbar}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <View style={styles.brandPage} />
            <View style={styles.brandDot} />
          </View>
          <View style={styles.brandCopy}>
            <Text selectable style={styles.brandName}>
              一页账
            </Text>
            <Text selectable style={styles.brandSubtitle}>
              把日子记得轻一点
            </Text>
          </View>
        </View>
        <Text selectable style={styles.date}>
          {dateLabel}
        </Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroKickerRow}>
          <View style={styles.accentRule} />
          <Text style={styles.heroKicker}>今天花了</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>¥</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.62}
            numberOfLines={1}
            selectable
            style={styles.amount}>
            {formatMoney(expense)}
          </Text>
          <View pointerEvents="none" style={styles.highlighter} />
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <AppIcon name="document" size={13} color={colors.inkSoft} />
            <Text selectable style={styles.metaText}>
              {count} 笔流水
            </Text>
          </View>
          <View style={[styles.metaBadge, styles.metaGood]}>
            <AppIcon name="trend" size={13} color={colors.ink} />
            <Text selectable style={styles.metaText}>
              {comparisonText}
            </Text>
          </View>
          <View style={[styles.metaBadge, styles.metaIncome]}>
            <AppIcon name="wallet" size={13} color={colors.ink} />
            <Text selectable style={styles.metaText}>
              收入 +¥{formatMoney(income)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ledgerTop}>
        <View pointerEvents="none" style={styles.topHole} />
        <View style={styles.ledgerHeaderCopy}>
          <View style={styles.ledgerTitleRow}>
            <Text selectable style={styles.ledgerTitle}>
              今日流水
            </Text>
            <Text style={styles.ledgerCount}>已记 {count} 笔</Text>
          </View>
          <View style={styles.editableHint}>
            <AppIcon name="edit" size={11} color={colors.aqua} />
            <Text style={styles.editableHintText}>轻点可修改</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const EmptyLedger = memo(function EmptyLedger({
  colors,
  styles,
}: {
  colors: LedgerPalette;
  styles: HomeStyles;
}) {
  return (
    <View style={styles.emptyLedger}>
      <View style={styles.emptyIcon}>
        <AppIcon name="document" size={22} color={colors.aqua} />
      </View>
      <View style={styles.emptyCopy}>
        <Text selectable style={styles.emptyTitle}>
          今天还没有流水
        </Text>
        <Text selectable style={styles.emptyText}>
          点右下角“记一笔”，从第一笔开始。
        </Text>
      </View>
    </View>
  );
});

type BudgetFooterProps = {
  spent: number;
  budget: number;
  colors: LedgerPalette;
  styles: HomeStyles;
  onOpenSettings: () => void;
};

const BudgetFooter = memo(function BudgetFooter({
  spent,
  budget,
  colors,
  styles,
  onOpenSettings,
}: BudgetFooterProps) {
  const progress = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const remaining = Math.max(budget - spent, 0);
  const currentMonth = new Date().getMonth() + 1;

  if (budget <= 0) {
    return (
      <View style={styles.budget}>
        <View style={styles.budgetHead}>
          <Text style={styles.budgetTitle}>{currentMonth} 月预算</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.setBudgetButton, pressed && styles.pressed]}>
            <Text style={[styles.setBudgetText, { color: colors.aqua }]}>设置预算</Text>
          </Pressable>
        </View>
        <Text selectable style={styles.budgetEmptyText}>
          在“我的”里设置本月预算后，这里会显示使用进度。
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.budget}>
      <View style={styles.budgetHead}>
        <Text style={styles.budgetTitle}>{currentMonth} 月预算</Text>
        <Text selectable style={styles.budgetRemaining}>
          还剩 ¥{formatMoney(remaining)}
        </Text>
      </View>
      <View style={styles.budgetValues}>
        <Text selectable style={styles.budgetSpent}>
          ¥{formatMoney(spent)}{' '}
          <Text style={styles.budgetTotal}>/ ¥{formatMoney(budget)}</Text>
        </Text>
        <Text selectable style={styles.budgetPercent}>
          已用 {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.progressKnob, { left: `${progress * 100}%` }]} />
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const { ledger, colors, upsertEntry, removeEntry } = useLedger();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const dateLabel = useMemo(() => formatToday(), []);
  const todayKey = getDateKey();
  const todayEntries = useMemo(
    () => ledger.entries.filter((entry) => entry.date === todayKey),
    [ledger.entries, todayKey]
  );
  const todaySummary = useMemo(
    () => summarizeEntries(todayEntries),
    [todayEntries]
  );
  const yesterdayTotal = useMemo(() => {
    const calculated = summarizeEntries(
      ledger.entries.filter((entry) => entry.date === getYesterdayKey())
    ).expense;
    return calculated || ledger.yesterdayTotal;
  }, [ledger.entries, ledger.yesterdayTotal]);
  const monthlySpent =
    ledger.monthlySpentBeforeToday +
    summarizeEntries(
      ledger.entries.filter((entry) => isSameMonth(entry.date))
    ).expense;
  const comparison = yesterdayTotal - todaySummary.expense;
  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      process.env.EXPO_OS === 'android' && { paddingTop: insets.top + 8 },
    ],
    [insets.top, styles.listContent]
  );

  const openNewEntry = useCallback(() => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditingEntry(null);
    setEditorVisible(true);
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      const target = ledger.entries.find((entry) => entry.id === id) ?? null;
      setEditingEntry(target);
      setEditorVisible(Boolean(target));
    },
    [ledger.entries]
  );

  const handleSave = useCallback(
    (entry: LedgerEntry) => {
      upsertEntry(entry);
      setEditorVisible(false);
    },
    [upsertEntry]
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeEntry(id);
      setEditorVisible(false);
    },
    [removeEntry]
  );

  const renderEntry = useCallback(
    ({ item, index }: ListRenderItemInfo<LedgerEntry>) => (
      <LedgerEntryRow
        amount={item.amount}
        categoryId={item.categoryId}
        entryType={item.type}
        id={item.id}
        isLast={index === todayEntries.length - 1}
        name={item.name}
        note={item.note}
        onEdit={handleEdit}
        time={item.time}
      />
    ),
    [handleEdit, todayEntries.length]
  );

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.decorativeRing} />
      <View pointerEvents="none" style={styles.decorativeRingInner} />

      <FlatList
        contentContainerStyle={listContentStyle}
        contentInsetAdjustmentBehavior="automatic"
        data={todayEntries}
        initialNumToRender={8}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyLedger colors={colors} styles={styles} />}
        ListFooterComponent={
          <BudgetFooter
            budget={ledger.monthlyBudget}
            colors={colors}
            onOpenSettings={() => router.push('/profile')}
            spent={monthlySpent}
            styles={styles}
          />
        }
        ListHeaderComponent={
          <HomeHeader
            comparison={comparison}
            colors={colors}
            count={todayEntries.length}
            dateLabel={dateLabel}
            expense={todaySummary.expense}
            income={todaySummary.income}
            styles={styles}
          />
        }
        removeClippedSubviews
        renderItem={renderEntry}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />

      <Pressable
        accessibilityHint="打开表单，新增一笔今日流水"
        accessibilityLabel="记一笔"
        accessibilityRole="button"
        android_ripple={{ color: '#BFE7F7' }}
        onPress={openNewEntry}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <View style={styles.fabIcon}>
          <AppIcon name="plus" size={19} color={colors.ink} />
        </View>
        <Text style={styles.fabText}>记一笔</Text>
      </Pressable>

      <EntryEditor
        entry={editingEntry}
        initialDate={todayKey}
        onDelete={handleDelete}
        onDismiss={() => setEditorVisible(false)}
        onSave={handleSave}
        visible={editorVisible}
      />
    </View>
  );
}

function createHomeStyles(colors: LedgerPalette) {
  const ledgerColors = colors;
  return StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: ledgerColors.paper,
  },
  decorativeRing: {
    position: 'absolute',
    top: 205,
    right: -82,
    width: 176,
    height: 176,
    borderWidth: 1,
    borderColor: 'rgba(29, 73, 98, 0.08)',
    borderRadius: 88,
  },
  decorativeRingInner: {
    position: 'absolute',
    top: 228,
    right: -56,
    width: 130,
    height: 130,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(29, 73, 98, 0.1)',
    borderRadius: 65,
  },
  listContent: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 130,
  },
  topbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderBottomLeftRadius: 4,
    backgroundColor: ledgerColors.ink,
    boxShadow: '0px 5px 12px rgba(29, 73, 98, 0.15)',
  },
  brandPage: {
    position: 'absolute',
    top: 8,
    left: 9,
    width: 16,
    height: 17,
    borderRadius: 4,
    borderBottomLeftRadius: 1,
    backgroundColor: ledgerColors.card,
  },
  brandDot: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ledgerColors.frost,
  },
  brandCopy: {
    gap: 1,
  },
  brandName: {
    color: ledgerColors.ink,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 21,
  },
  brandSubtitle: {
    color: ledgerColors.muted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  date: {
    color: ledgerColors.inkSoft,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  hero: {
    minHeight: 177,
    paddingTop: 22,
  },
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentRule: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: ledgerColors.aqua,
  },
  heroKicker: {
    color: ledgerColors.inkSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  amountRow: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  currency: {
    zIndex: 2,
    paddingRight: 6,
    paddingBottom: 9,
    color: ledgerColors.ink,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
  },
  amount: {
    zIndex: 2,
    flexShrink: 1,
    color: ledgerColors.ink,
    fontSize: 62,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 60,
  },
  highlighter: {
    position: 'absolute',
    zIndex: 1,
    bottom: 8,
    left: 25,
    width: 188,
    height: 15,
    borderRadius: 8,
    backgroundColor: ledgerColors.frost,
    opacity: 0.82,
    transform: [{ rotate: '-1deg' }],
  },
  metaRow: {
    minHeight: 36,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 253, 255, 0.78)',
    paddingHorizontal: 10,
  },
  metaGood: {
    backgroundColor: 'rgba(205, 234, 248, 0.72)',
  },
  metaIncome: {
    backgroundColor: 'rgba(218, 241, 228, 0.78)',
  },
  metaText: {
    color: ledgerColors.ink,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  ledgerTop: {
    minHeight: 69,
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: ledgerColors.line,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: ledgerColors.card,
    paddingHorizontal: 44,
    paddingVertical: 15,
  },
  topHole: {
    position: 'absolute',
    left: 25,
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#D3E5EE',
    borderRadius: 5,
    backgroundColor: ledgerColors.paperDeep,
  },
  ledgerHeaderCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ledgerTitleRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  ledgerTitle: {
    color: ledgerColors.ink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ledgerCount: {
    color: ledgerColors.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  editableHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editableHintText: {
    color: ledgerColors.aqua,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyLedger: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: ledgerColors.line,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 26,
    backgroundColor: ledgerColors.card,
    paddingHorizontal: 46,
    paddingVertical: 18,
  },
  emptyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: ledgerColors.frost,
  },
  emptyCopy: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    color: ledgerColors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: ledgerColors.inkSoft,
    fontSize: 11,
    lineHeight: 17,
  },
  budget: {
    gap: 6,
    paddingHorizontal: 1,
    paddingTop: 16,
  },
  budgetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetTitle: {
    color: ledgerColors.inkSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  budgetRemaining: {
    color: ledgerColors.ink,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  setBudgetButton: {
    borderRadius: 999,
    backgroundColor: colors.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setBudgetText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  budgetEmptyText: {
    color: ledgerColors.inkSoft,
    fontSize: 10.5,
    lineHeight: 17,
  },
  budgetValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  budgetSpent: {
    color: ledgerColors.ink,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  budgetTotal: {
    color: ledgerColors.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  budgetPercent: {
    color: ledgerColors.muted,
    fontSize: 9.5,
    fontWeight: '500',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DCEAF1',
  },
  progressFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: ledgerColors.ink,
  },
  progressKnob: {
    position: 'absolute',
    top: -3,
    width: 13,
    height: 13,
    borderWidth: 3,
    borderColor: ledgerColors.card,
    borderRadius: 7,
    backgroundColor: ledgerColors.skyDeep,
    transform: [{ translateX: -6 }],
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: process.env.EXPO_OS === 'web' ? 98 : 20,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    overflow: 'hidden',
    borderWidth: 0,
    borderRadius: 18,
    backgroundColor: ledgerColors.ink,
    paddingLeft: 9,
    paddingRight: 17,
    boxShadow: '0px 12px 25px rgba(29, 73, 98, 0.22)',
  },
  fabPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  fabIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: ledgerColors.frost,
  },
  fabText: {
    color: ledgerColors.card,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.68,
  },
  });
}
