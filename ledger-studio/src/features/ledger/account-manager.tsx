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
  ACCOUNT_COLORS,
  ACCOUNT_KINDS,
  ACCOUNT_LIMIT,
  ACCOUNT_NAME_LIMIT,
  formatMoney,
  getAccountKindDefinition,
  normalizeAmountInput,
  type LedgerAccount,
  type LedgerAccountKind,
} from './model';

export function AccountManager() {
  const {
    accountBalances,
    colors,
    deleteAccount,
    ledger,
    setDefaultAccount,
  } = useLedger();
  const styles = useMemo(() => createManagerStyles(colors), [colors]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const limitReached = ledger.accounts.length >= ACCOUNT_LIMIT;

  function openCreate() {
    setEditingAccount(null);
    setConfirmDeleteId(null);
    setMessage('');
    setEditorVisible(true);
  }

  function openEdit(account: LedgerAccount) {
    setEditingAccount(account);
    setConfirmDeleteId(null);
    setMessage('');
    setEditorVisible(true);
  }

  function requestDelete(account: LedgerAccount) {
    const result = deleteAccount(account.id);
    if (result.ok) {
      setConfirmDeleteId(null);
      setMessage('资金账户已删除');
      return;
    }
    const messages = {
      default: '请先把其他账户设为默认，再删除这个账户。',
      'in-use': `这个账户与 ${result.usageCount ?? 0} 笔流水或转账关联，暂时不能删除。`,
      'last-account': '至少需要保留一个资金账户。',
      'not-found': '账户不存在，请刷新后重试。',
    };
    setConfirmDeleteId(null);
    setMessage(messages[result.reason]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text selectable style={styles.heading}>
            资金账户
          </Text>
          <Text selectable style={styles.description}>
            管理现金、银行卡和电子钱包，账户余额随流水实时更新 ·{' '}
            {ledger.accounts.length}/{ACCOUNT_LIMIT}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="新增资金账户"
          accessibilityRole="button"
          accessibilityState={{ disabled: limitReached }}
          disabled={limitReached}
          onPress={openCreate}
          style={({ pressed }) => [
            styles.addButton,
            limitReached && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <AppIcon name="plus" size={16} color={colors.ink} />
          <Text style={styles.addButtonText}>新增</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {ledger.accounts.map((account, index) => {
          const kind = getAccountKindDefinition(account.kind);
          const isDefault = ledger.defaultAccountId === account.id;
          const confirming = confirmDeleteId === account.id;
          return (
            <View
              key={account.id}
              style={[
                styles.accountRow,
                index === ledger.accounts.length - 1 && styles.lastRow,
              ]}>
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: `${account.color}18` },
                ]}>
                <AccountIcon
                  color={account.color}
                  kind={account.kind}
                  size={19}
                />
              </View>
              <View style={styles.accountCopy}>
                <View style={styles.accountNameRow}>
                  <Text numberOfLines={1} selectable style={styles.accountName}>
                    {account.name}
                  </Text>
                  {isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>默认</Text>
                    </View>
                  ) : null}
                </View>
                <Text selectable style={styles.accountMeta}>
                  {kind.label} · ¥
                  {formatMoney(accountBalances[account.id] ?? 0)}
                </Text>
              </View>
              {confirming ? (
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setConfirmDeleteId(null)}
                    style={({ pressed }) => [
                      styles.rowAction,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.rowActionText}>取消</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`确认删除${account.name}账户`}
                    accessibilityRole="button"
                    onPress={() => requestDelete(account)}
                    style={({ pressed }) => [
                      styles.dangerAction,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.dangerActionText}>删除</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.rowActions}>
                  {!isDefault ? (
                    <Pressable
                      accessibilityLabel={`将${account.name}设为默认账户`}
                      accessibilityRole="button"
                      onPress={() => {
                        setDefaultAccount(account.id);
                        setMessage(`${account.name}已设为默认账户`);
                      }}
                      style={({ pressed }) => [
                        styles.rowAction,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.rowActionText}>设为默认</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityLabel={`编辑${account.name}账户`}
                    accessibilityRole="button"
                    onPress={() => openEdit(account)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.pressed,
                    ]}>
                    <AppIcon name="edit" size={17} color={colors.inkSoft} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`删除${account.name}账户`}
                    accessibilityRole="button"
                    onPress={() => setConfirmDeleteId(account.id)}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && styles.pressed,
                    ]}>
                    <AppIcon name="trash" size={17} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {limitReached ? (
        <Text selectable style={styles.helper}>
          已达到 {ACCOUNT_LIMIT} 个资金账户上限。
        </Text>
      ) : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={[
            styles.message,
            message.includes('已') && styles.successMessage,
          ]}>
          {message}
        </Text>
      ) : null}

      <AccountForm
        account={editingAccount}
        onDismiss={() => setEditorVisible(false)}
        visible={editorVisible}
      />
    </View>
  );
}

function AccountForm({
  account,
  visible,
  onDismiss,
}: {
  account: LedgerAccount | null;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { accountBalances, colors, saveAccount } = useLedger();
  const styles = useMemo(() => createFormStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LedgerAccountKind>('cash');
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]);
  const [openingBalance, setOpeningBalance] = useState('');
  const [error, setError] = useState('');
  const editing = Boolean(account);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setName(account?.name ?? '');
    setKind(account?.kind ?? 'cash');
    setColor(account?.color ?? ACCOUNT_COLORS[0]);
    setOpeningBalance(account ? String(account.openingBalance) : '');
    setError('');
  }, [account, visible]);

  function save() {
    const balance = Number(openingBalance || 0);
    const result = saveAccount({
      id: account?.id,
      name,
      kind,
      color,
      openingBalance: balance,
    });
    if (result.ok) {
      onDismiss();
      return;
    }
    const messages = {
      invalid: '请检查账户名称、类型、颜色和初始余额',
      duplicate: '已有同名资金账户',
      limit: `最多只能创建 ${ACCOUNT_LIMIT} 个资金账户`,
      'not-found': '账户不存在，请刷新后重试',
    };
    setError(messages[result.reason]);
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
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text selectable style={styles.title}>
                  {editing ? '编辑资金账户' : '新增资金账户'}
                </Text>
                <Text selectable style={styles.subtitle}>
                  当前余额由初始余额、流水和转账自动计算
                </Text>
              </View>
              <Pressable
                accessibilityLabel="关闭账户编辑"
                accessibilityRole="button"
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}>
                <AppIcon name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            {editing ? (
              <View style={styles.balancePreview}>
                <Text selectable style={styles.balanceLabel}>
                  当前账户余额
                </Text>
                <Text selectable style={styles.balanceValue}>
                  ¥{formatMoney(accountBalances[account?.id ?? ''] ?? 0)}
                </Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>账户名称</Text>
              <TextInput
                accessibilityLabel="账户名称"
                maxLength={ACCOUNT_NAME_LIMIT}
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                placeholder="例如：生活费银行卡"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
                value={name}
              />
              <Text style={styles.counter}>
                {name.length}/{ACCOUNT_NAME_LIMIT}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>账户类型</Text>
              <View style={styles.kindGrid}>
                {ACCOUNT_KINDS.map((option) => {
                  const active = option.id === kind;
                  return (
                    <Pressable
                      accessibilityLabel={`账户类型设为${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={option.id}
                      onPress={() => setKind(option.id)}
                      style={({ pressed }) => [
                        styles.kindOption,
                        active && styles.kindOptionActive,
                        pressed && styles.pressed,
                      ]}>
                      <View
                        style={[
                          styles.kindIcon,
                          {
                            backgroundColor: active
                              ? `${color}22`
                              : option.tint,
                          },
                        ]}>
                        <AccountIcon
                          color={active ? color : option.ink}
                          kind={option.id}
                          size={19}
                        />
                      </View>
                      <Text
                        style={[
                          styles.kindLabel,
                          active && styles.kindLabelActive,
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>账户颜色</Text>
              <View style={styles.colorGrid}>
                {ACCOUNT_COLORS.map((swatch) => {
                  const active = swatch === color;
                  return (
                    <Pressable
                      accessibilityLabel={`选择账户颜色${swatch}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={swatch}
                      onPress={() => setColor(swatch)}
                      style={({ pressed }) => [
                        styles.colorOption,
                        active && styles.colorOptionActive,
                        pressed && styles.pressed,
                      ]}>
                      <View
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: swatch },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>初始余额</Text>
              <View style={styles.balanceInputWrap}>
                <Text style={styles.currency}>¥</Text>
                <TextInput
                  accessibilityLabel="账户初始余额"
                  keyboardType="decimal-pad"
                  onChangeText={(value) => {
                    setOpeningBalance(normalizeAmountInput(value));
                    setError('');
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  style={styles.balanceInput}
                  value={openingBalance}
                />
              </View>
              <Text selectable style={styles.helper}>
                填写开始记账时该账户已有的金额；之后余额会自动变化。
              </Text>
            </View>

            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                selectable
                style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="保存资金账户"
              accessibilityRole="button"
              onPress={save}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.saveText}>保存账户</Text>
              <AppIcon name="check" size={18} color={colors.ink} />
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </RNHostView>
    </BottomSheet>
  );
}

function createManagerStyles(colors: LedgerPalette) {
  return StyleSheet.create({
    section: {
      gap: 12,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headingCopy: {
      minWidth: 0,
      flex: 1,
      gap: 4,
    },
    heading: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '800',
    },
    description: {
      color: colors.inkSoft,
      fontSize: 10.5,
      lineHeight: 16,
    },
    addButton: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 13,
      backgroundColor: colors.frost,
      paddingHorizontal: 11,
    },
    addButtonText: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: '800',
    },
    list: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 17,
      backgroundColor: colors.input,
    },
    accountRow: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    iconBubble: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
    },
    accountCopy: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    accountNameRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    accountName: {
      maxWidth: '72%',
      color: colors.ink,
      fontSize: 12.5,
      fontWeight: '700',
    },
    defaultBadge: {
      borderRadius: 999,
      backgroundColor: colors.frost,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    defaultText: {
      color: colors.aqua,
      fontSize: 8.5,
      fontWeight: '800',
    },
    accountMeta: {
      color: colors.muted,
      fontSize: 9.5,
      fontVariant: ['tabular-nums'],
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    rowAction: {
      minHeight: 34,
      justifyContent: 'center',
      borderRadius: 11,
      backgroundColor: colors.card,
      paddingHorizontal: 8,
    },
    rowActionText: {
      color: colors.inkSoft,
      fontSize: 9.5,
      fontWeight: '700',
    },
    iconButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.card,
    },
    dangerAction: {
      minHeight: 34,
      justifyContent: 'center',
      borderRadius: 11,
      backgroundColor: '#FCEBEC',
      paddingHorizontal: 9,
    },
    dangerActionText: {
      color: colors.danger,
      fontSize: 10,
      fontWeight: '800',
    },
    helper: {
      color: colors.muted,
      fontSize: 9.5,
      lineHeight: 15,
    },
    message: {
      color: colors.danger,
      fontSize: 10,
      lineHeight: 16,
    },
    successMessage: {
      color: '#467C66',
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.68,
    },
  });
}

function createFormStyles(colors: LedgerPalette) {
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
    balancePreview: {
      gap: 3,
      borderRadius: 18,
      backgroundColor: colors.frost,
      padding: 15,
    },
    balanceLabel: {
      color: colors.inkSoft,
      fontSize: 10.5,
      fontWeight: '600',
    },
    balanceValue: {
      color: colors.ink,
      fontSize: 28,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      color: colors.inkSoft,
      fontSize: 12,
      fontWeight: '700',
    },
    textInput: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.ink,
      fontSize: 15,
    },
    counter: {
      alignSelf: 'flex-end',
      color: colors.muted,
      fontSize: 9,
      fontVariant: ['tabular-nums'],
    },
    kindGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    kindOption: {
      width: '30%',
      flexGrow: 1,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingVertical: 9,
    },
    kindOptionActive: {
      borderColor: colors.ink,
      backgroundColor: colors.frost,
    },
    kindIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    kindLabel: {
      color: colors.inkSoft,
      fontSize: 10,
      fontWeight: '600',
    },
    kindLabelActive: {
      color: colors.ink,
      fontWeight: '800',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorOption: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      borderRadius: 15,
      backgroundColor: colors.input,
    },
    colorOptionActive: {
      borderColor: colors.ink,
    },
    colorSwatch: {
      width: 28,
      height: 28,
      borderRadius: 10,
    },
    balanceInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingLeft: 14,
    },
    currency: {
      color: colors.inkSoft,
      fontSize: 17,
      fontWeight: '700',
    },
    balanceInput: {
      minWidth: 0,
      flex: 1,
      minHeight: 50,
      paddingHorizontal: 7,
      color: colors.ink,
      fontSize: 18,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    helper: {
      color: colors.muted,
      fontSize: 9.5,
      lineHeight: 15,
    },
    error: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: '600',
    },
    saveButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      borderRadius: 17,
      backgroundColor: colors.ink,
      boxShadow: '0px 10px 22px rgba(29, 73, 98, 0.22)',
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
