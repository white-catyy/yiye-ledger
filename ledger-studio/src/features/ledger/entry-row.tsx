import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LedgerPalette } from '@/constants/theme';

import { AppIcon } from './app-icon';
import { CategoryIcon } from './category-icon';
import { useLedger } from './ledger-provider';
import { CATEGORY_BY_ID, formatMoney, type CategoryId } from './model';

type LedgerEntryRowProps = {
  id: string;
  categoryId: CategoryId;
  name: string;
  note: string;
  amount: number;
  time: string;
  isLast: boolean;
  onEdit: (id: string) => void;
};

export const LedgerEntryRow = memo(function LedgerEntryRow({
  id,
  categoryId,
  name,
  note,
  amount,
  time,
  isLast,
  onEdit,
}: LedgerEntryRowProps) {
  const { colors } = useLedger();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const category = CATEGORY_BY_ID[categoryId] ?? CATEGORY_BY_ID.other;
  const handlePress = useCallback(() => onEdit(id), [id, onEdit]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="轻点编辑这笔流水的名称、分类、金额、时间或备注"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        isLast && styles.lastRow,
        pressed && styles.pressed,
      ]}>
      <View pointerEvents="none" style={styles.ledgerRail} />
      <View pointerEvents="none" style={styles.bindingHole} />

      <View style={[styles.categoryIcon, { backgroundColor: category.tint }]}>
        <CategoryIcon categoryId={categoryId} color={category.ink} />
      </View>

      <View style={styles.main}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} selectable style={styles.name}>
            {name}
          </Text>
          <Text selectable style={styles.time}>
            {time}
          </Text>
        </View>
        <Text numberOfLines={1} selectable style={styles.note}>
          {note || category.label}
        </Text>
      </View>

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        numberOfLines={1}
        selectable
        style={styles.amount}>
        −¥{formatMoney(amount)}
      </Text>
      <AppIcon name="chevron-right" size={15} color={colors.muted} />
    </Pressable>
  );
});

function createStyles(colors: LedgerPalette) {
  return StyleSheet.create({
  row: {
    minHeight: 73,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingLeft: 47,
    paddingRight: 15,
  },
  lastRow: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 26,
  },
  pressed: {
    backgroundColor: '#F3FAFD',
  },
  ledgerRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 29,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(76, 159, 196, 0.25)',
  },
  bindingHole: {
    position: 'absolute',
    left: 25,
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#D3E5EE',
    borderRadius: 5,
    backgroundColor: colors.paperDeep,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  main: {
    minWidth: 0,
    flex: 1,
    gap: 3,
  },
  titleLine: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  name: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  time: {
    flexShrink: 0,
    color: colors.muted,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  note: {
    color: colors.inkSoft,
    fontSize: 11,
  },
  amount: {
    maxWidth: 83,
    flexShrink: 0,
    color: colors.ink,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  });
}
