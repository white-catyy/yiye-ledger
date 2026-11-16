import { BottomSheet, RNHostView } from '@expo/ui';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { LedgerPalette } from '@/constants/theme';

import { AccountIcon } from './account-icon';
import { AppIcon } from './app-icon';
import { useLedger } from './ledger-provider';
import {
  createTransferId,
  formatEntryDate,
  formatMoney,
  getCurrentTime,
  getDateKey,
  isValidTime,
  normalizeAmountInput,
  normalizeTimeInput,
  type LedgerAccountId,
  type LedgerTransfer,
} from './model';

type TransferDraft = {
  fromAccountId: LedgerAccountId;
  toAccountId: LedgerAccountId;
  amount: string;
  note: string;
  date: string;
  time: string;
};

type TransferEditorProps = {
  visible: boolean;
  transfer: LedgerTransfer | null;
  initialDate?: string;
  onDismiss: () => void;
  onSave: (transfer: LedgerTransfer) => void;
  onDelete: (id: string) => void;
};

function isValidDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

export function TransferEditor({
  visible,
  transfer,
  initialDate,
  onDismiss,
  onSave,
  onDelete,
}: TransferEditorProps) {
  const { accountBalances, colors, ledger } = useLedger();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState<TransferDraft>(() => ({
    fromAccountId: ledger.defaultAccountId,
    toAccountId:
      ledger.accounts.find(
        (account) => account.id !== ledger.defaultAccountId
      )?.id ?? ledger.accounts[0].id,
    amount: '',
    note: '',
    date: initialDate ?? getDateKey(),
    time: getCurrentTime(),
  }));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const fromAccountId =
      ledger.accounts.find(
        (account) => account.id === transfer?.fromAccountId
      )?.id ??
      ledger.accounts.find(
        (account) => account.id === ledger.defaultAccountId
      )?.id ??
      ledger.accounts[0].id;
    const toAccountId =
      ledger.accounts.find(
        (account) => account.id === transfer?.toAccountId
      )?.id ??
      ledger.accounts.find((account) => account.id !== fromAccountId)?.id ??
      ledger.accounts[0].id;
    setDraft({
      fromAccountId,
      toAccountId,
      amount: transfer ? String(transfer.amount) : '',
      note: transfer?.note ?? '',
      date: transfer?.date ?? initialDate ?? getDateKey(),
      time: transfer?.time ?? getCurrentTime(),
    });
    setError('');
    setConfirmDelete(false);
  }, [
    initialDate,
    ledger.accounts,
    ledger.defaultAccountId,
    transfer,
    visible,
  ]);

  function updateDraft<Key extends keyof TransferDraft>(
    key: Key,
    value: TransferDraft[Key]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function save() {
    const amount = Number(draft.amount);
    if (draft.fromAccountId === draft.toAccountId) {
      setError('转出和转入账户不能相同');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('转账金额需要大于 0');
      return;
    }
    if (!isValidTime(draft.time)) {
      setError('时间格式应为 08:30');
      return;
    }
    if (!isValidDateKey(draft.date) || draft.date > getDateKey()) {
      setError('日期格式应为 2026-10-24，且不能晚于今天');
      return;
    }
    onSave({
      id: transfer?.id ?? createTransferId(),
      fromAccountId: draft.fromAccountId,
      toAccountId: draft.toAccountId,
      amount: Math.round(amount * 100) / 100,
      note: draft.note.trim(),
      date: draft.date,
      time: draft.time,
    });
  }

  return (
    <BottomSheet
      isPresented={visible}
      onDismiss={onDismiss}
      snapPoints={['full']}
      contentPadding={0}
      containerColor={colors.card}
      showDragIndicator>
      <RNHostView>
        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text selectable style={styles.title}>
                  {transfer ? '编辑账户转账' : '账户转账'}
                </Text>
                <Text selectable style={styles.subtitle}>
                  {formatEntryDate(draft.date)} · 转账不计入收入、支出或预算
                </Text>
              </View>
              <Pressable
                accessibilityLabel="关闭转账编辑"
                accessibilityRole="button"
                hitSlop={10}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}>
                <AppIcon name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.amountField}>
              <Text style={styles.amountCurrency}>¥</Text>
              <TextInput
                accessibilityLabel="转账金额"
                autoFocus={!transfer}
                keyboardType="decimal-pad"
                maxLength={9}
                onChangeText={(value) =>
                  updateDraft('amount', normalizeAmountInput(value))
                }
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                selectTextOnFocus
                style={styles.amountInput}
                value={draft.amount}
              />
            </View>

            <Text style={styles.sectionLabel}>从账户转出</Text>
            <AccountOptions
              accountBalances={accountBalances}
              accounts={ledger.accounts}
              colors={colors}
              disabledId={draft.toAccountId}
              onSelect={(id) => updateDraft('fromAccountId', id)}
              purpose="转出账户"
              selectedId={draft.fromAccountId}
            />

            <View style={styles.transferDirection}>
              <View style={styles.directionLine} />
              <View style={styles.directionIcon}>
                <AppIcon name="chevron-down" size={17} color={colors.aqua} />
              </View>
              <View style={styles.directionLine} />
            </View>

            <Text style={styles.sectionLabel}>转入账户</Text>
            <AccountOptions
              accountBalances={accountBalances}
              accounts={ledger.accounts}
              colors={colors}
              disabledId={draft.fromAccountId}
              onSelect={(id) => updateDraft('toAccountId', id)}
              purpose="转入账户"
              selectedId={draft.toAccountId}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>日期</Text>
              <TextInput
                accessibilityLabel="转账日期"
                maxLength={10}
                onChangeText={(value) => updateDraft('date', value)}
                placeholder="2026-10-24"
                placeholderTextColor={colors.muted}
                style={[styles.textInput, styles.numberInput]}
                value={draft.date}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>时间</Text>
              <TextInput
                accessibilityLabel="转账时间"
                keyboardType="number-pad"
                maxLength={5}
                onChangeText={(value) =>
                  updateDraft('time', normalizeTimeInput(value))
                }
                placeholder="08:30"
                placeholderTextColor={colors.muted}
                style={[styles.textInput, styles.numberInput]}
                value={draft.time}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>备注</Text>
              <TextInput
                accessibilityLabel="转账备注"
                maxLength={60}
                onChangeText={(value) => updateDraft('note', value)}
                placeholder="例如：转到支付宝日常使用"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                style={styles.textInput}
                value={draft.note}
              />
            </View>

            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                selectable
                style={styles.error}>
                {error}
              </Text>
            ) : null}

            {transfer && confirmDelete ? (
              <View style={styles.confirmDelete}>
                <Text selectable style={styles.confirmText}>
                  确定删除这笔转账？账户余额会随之恢复。
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setConfirmDelete(false)}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.cancelText}>取消</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onDelete(transfer.id)}
                    style={({ pressed }) => [
                      styles.deleteConfirmButton,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.deleteConfirmText}>确认删除</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              {transfer && !confirmDelete ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmDelete(true)}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}>
                  <AppIcon name="trash" size={18} color={colors.danger} />
                  <Text style={styles.deleteText}>删除</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                accessibilityRole="button"
                onPress={save}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.saveText}>确认转账</Text>
                <AppIcon name="check" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </RNHostView>
    </BottomSheet>
  );
}

function AccountOptions({
  accounts,
  accountBalances,
  colors,
  selectedId,
  disabledId,
  onSelect,
  purpose,
}: {
  accounts: ReturnType<typeof useLedger>['ledger']['accounts'];
  accountBalances: Record<string, number>;
  colors: LedgerPalette;
  selectedId: LedgerAccountId;
  disabledId: LedgerAccountId;
  onSelect: (id: LedgerAccountId) => void;
  purpose: string;
}) {
  const optionStyles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={optionStyles.accountGrid}>
      {accounts.map((account) => {
        const active = selectedId === account.id;
        const disabled = disabledId === account.id;
        return (
          <Pressable
            accessibilityLabel={`选择${account.name}作为${purpose}`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: active }}
            disabled={disabled}
            key={account.id}
            onPress={() => onSelect(account.id)}
            style={({ pressed }) => [
              optionStyles.accountOption,
              active && optionStyles.accountOptionActive,
              disabled && optionStyles.accountOptionDisabled,
              pressed && optionStyles.pressed,
            ]}>
            <View
              style={[
                optionStyles.accountIcon,
                { backgroundColor: `${account.color}18` },
              ]}>
              <AccountIcon
                color={account.color}
                kind={account.kind}
                size={17}
              />
            </View>
            <View style={optionStyles.accountCopy}>
              <Text
                numberOfLines={1}
                style={[
                  optionStyles.accountName,
                  active && optionStyles.accountNameActive,
                ]}>
                {account.name}
              </Text>
              <Text numberOfLines={1} style={optionStyles.accountBalance}>
                ¥{formatMoney(accountBalances[account.id] ?? 0)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: LedgerPalette) {
  return StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    content: {
      gap: 18,
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 44,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    headerCopy: {
      flex: 1,
      gap: 5,
    },
    title: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: colors.inkSoft,
      fontSize: 12,
      lineHeight: 18,
    },
    closeButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.input,
    },
    amountField: {
      minHeight: 90,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#D8EAF3',
      borderRadius: 22,
      backgroundColor: '#F5FBFE',
      paddingHorizontal: 20,
    },
    amountCurrency: {
      color: colors.ink,
      fontSize: 26,
      fontWeight: '700',
    },
    amountInput: {
      minWidth: 0,
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 16,
      color: colors.ink,
      fontSize: 42,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      letterSpacing: -1.5,
    },
    sectionLabel: {
      marginBottom: -8,
      color: colors.inkSoft,
      fontSize: 12,
      fontWeight: '700',
    },
    accountGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    accountOption: {
      minWidth: '46%',
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      backgroundColor: colors.input,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    accountOptionActive: {
      borderColor: colors.skyDeep,
      backgroundColor: colors.frost,
    },
    accountOptionDisabled: {
      opacity: 0.35,
    },
    accountIcon: {
      width: 32,
      height: 32,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    accountCopy: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    accountName: {
      color: colors.inkSoft,
      fontSize: 11,
      fontWeight: '700',
    },
    accountNameActive: {
      color: colors.ink,
      fontWeight: '800',
    },
    accountBalance: {
      color: colors.muted,
      fontSize: 9,
      fontVariant: ['tabular-nums'],
    },
    transferDirection: {
      height: 26,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 22,
    },
    directionLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.line,
    },
    directionIcon: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      backgroundColor: colors.frost,
    },
    fieldGroup: {
      gap: 7,
    },
    fieldLabel: {
      color: colors.inkSoft,
      fontSize: 12,
      fontWeight: '700',
    },
    textInput: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.ink,
      fontSize: 15,
    },
    numberInput: {
      fontVariant: ['tabular-nums'],
    },
    error: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
    },
    confirmDelete: {
      gap: 12,
      borderWidth: 1,
      borderColor: '#E7C8CA',
      borderRadius: 18,
      backgroundColor: '#FFF7F7',
      padding: 16,
    },
    confirmText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
    },
    confirmActions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.white,
    },
    cancelText: {
      color: colors.inkSoft,
      fontSize: 13,
      fontWeight: '700',
    },
    deleteConfirmButton: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.danger,
    },
    deleteConfirmText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    deleteButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
    },
    deleteText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
    },
    saveButton: {
      minWidth: 154,
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 17,
      backgroundColor: colors.ink,
    },
    saveText: {
      color: colors.card,
      fontSize: 14,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.68,
    },
  });
}
