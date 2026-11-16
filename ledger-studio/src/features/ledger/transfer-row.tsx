import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LedgerPalette } from '@/constants/theme';

import { AccountIcon } from './account-icon';
import { AppIcon } from './app-icon';
import { useLedger } from './ledger-provider';
import { formatMoney, getAccountKindDefinition, type LedgerTransfer } from './model';

type TransferRowProps = {
  transfer: LedgerTransfer;
  isLast: boolean;
  onEdit: (id: string) => void;
};

export const TransferRow = memo(function TransferRow({
  transfer,
  isLast,
  onEdit,
}: TransferRowProps) {
  const { colors, ledger } = useLedger();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fromAccount = ledger.accounts.find(
    (account) => account.id === transfer.fromAccountId
  );
  const toAccount = ledger.accounts.find(
    (account) => account.id === transfer.toAccountId
  );
  const handlePress = useCallback(
    () => onEdit(transfer.id),
    [onEdit, transfer.id]
  );
  const kind = getAccountKindDefinition('other');

  return (
    <Pressable
      accessibilityHint="轻点编辑这笔账户转账"
      accessibilityLabel={`${fromAccount?.name ?? '账户'}转账到${toAccount?.name ?? '账户'}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        isLast && styles.lastRow,
        pressed && styles.pressed,
      ]}>
      <View pointerEvents="none" style={styles.ledgerRail} />
      <View pointerEvents="none" style={styles.bindingHole} />

      <View style={[styles.categoryIcon, { backgroundColor: kind.tint }]}>
        <AppIcon name="trend" size={20} color={colors.aqua} />
      </View>

      <View style={styles.main}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} selectable style={styles.name}>
            账户转账
          </Text>
          <Text selectable style={styles.time}>
            {transfer.time}
          </Text>
        </View>
        <View style={styles.accountLine}>
          <AccountIcon
            color={fromAccount?.color ?? colors.inkSoft}
            kind={fromAccount?.kind ?? 'other'}
            size={12}
          />
          <Text numberOfLines={1} style={styles.accountName}>
            {fromAccount?.name ?? '未知账户'}
          </Text>
          <Text style={styles.arrow}>→</Text>
          <AccountIcon
            color={toAccount?.color ?? colors.inkSoft}
            kind={toAccount?.kind ?? 'other'}
            size={12}
          />
          <Text numberOfLines={1} style={styles.accountName}>
            {toAccount?.name ?? '未知账户'}
          </Text>
        </View>
      </View>

      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        numberOfLines={1}
        selectable
        style={styles.amount}>
        ¥{formatMoney(transfer.amount)}
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
      gap: 4,
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
      color: colors.muted,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
      fontWeight: '600',
    },
    accountLine: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    accountName: {
      maxWidth: '35%',
      color: colors.inkSoft,
      fontSize: 10,
    },
    arrow: {
      color: colors.aqua,
      fontSize: 11,
      fontWeight: '800',
    },
    amount: {
      maxWidth: 83,
      flexShrink: 0,
      color: colors.inkSoft,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'right',
    },
  });
}
