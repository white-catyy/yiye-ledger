import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  normalizeThemeColor,
  THEME_PRESETS,
  type LedgerPalette,
} from '@/constants/theme';
import { AppIcon } from '@/features/ledger/app-icon';
import type { LedgerBackup } from '@/features/ledger/backup';
import { CustomCategoryManager } from '@/features/ledger/custom-category-manager';
import { exportLedgerData, importLedgerData } from '@/features/ledger/data-transfer';
import { useLedger } from '@/features/ledger/ledger-provider';
import {
  formatMoney,
  isSameMonth,
  normalizeAmountInput,
  summarizeEntries,
} from '@/features/ledger/model';

type TransferState = {
  tone: 'neutral' | 'success' | 'error';
  message: string;
};

export default function ProfileScreen() {
  const {
    ledger,
    colors,
    replaceLedger,
    resetLedger,
    setMonthlyBudget,
    setThemeColor,
  } = useLedger();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(
    ledger.monthlyBudget > 0 ? String(ledger.monthlyBudget) : ''
  );
  const [themeDraft, setThemeDraft] = useState(ledger.themeColor);
  const [themeError, setThemeError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<LedgerBackup | null>(null);
  const [transferBusy, setTransferBusy] = useState<'import' | 'export' | null>(null);
  const [transferState, setTransferState] = useState<TransferState>({
    tone: 'neutral',
    message: '',
  });
  const monthSummary = useMemo(
    () =>
      summarizeEntries(
        ledger.entries.filter((entry) => isSameMonth(entry.date))
      ),
    [ledger.entries]
  );
  const monthSpent = ledger.monthlySpentBeforeToday + monthSummary.expense;
  const contentStyle = useMemo(
    () => [
      styles.content,
      process.env.EXPO_OS === 'android' && { paddingTop: insets.top + 8 },
    ],
    [insets.top, styles.content]
  );

  function saveBudget() {
    const amount = Number(budgetDraft);
    setMonthlyBudget(Number.isFinite(amount) ? amount : 0);
    setBudgetDraft(Number.isFinite(amount) && amount > 0 ? String(amount) : '');
  }

  function applyCustomTheme() {
    const normalized = normalizeThemeColor(themeDraft);
    if (!normalized) {
      setThemeError('请输入 6 位十六进制色值，例如 #5B9A7B');
      return;
    }
    setThemeDraft(normalized);
    setThemeError('');
    setThemeColor(normalized);
  }

  async function handleExport() {
    setTransferBusy('export');
    setTransferState({ tone: 'neutral', message: '' });
    try {
      const filename = await exportLedgerData(ledger);
      setTransferState({
        tone: 'success',
        message: `已生成备份：${filename}`,
      });
    } catch (error) {
      setTransferState({
        tone: 'error',
        message: error instanceof Error ? error.message : '导出失败，请重试',
      });
    } finally {
      setTransferBusy(null);
    }
  }

  async function handleChooseImport() {
    setTransferBusy('import');
    setPendingImport(null);
    setTransferState({ tone: 'neutral', message: '' });
    try {
      const result = await importLedgerData();
      if (result.status === 'cancelled') {
        return;
      }
      if (result.status === 'error') {
        setTransferState({ tone: 'error', message: result.message });
        return;
      }
      setPendingImport(result.backup);
      setTransferState({
        tone: 'neutral',
        message: '备份校验通过，请确认是否替换当前数据。',
      });
    } catch (error) {
      setTransferState({
        tone: 'error',
        message: error instanceof Error ? error.message : '读取备份失败，请重试',
      });
    } finally {
      setTransferBusy(null);
    }
  }

  function confirmImport() {
    if (!pendingImport) {
      return;
    }
    replaceLedger(pendingImport.data);
    setBudgetDraft(
      pendingImport.data.monthlyBudget > 0 ? String(pendingImport.data.monthlyBudget) : ''
    );
    setThemeDraft(pendingImport.data.themeColor);
    setPendingImport(null);
    setTransferState({
      tone: 'success',
      message: `导入成功，共恢复 ${pendingImport.data.entries.length} 笔流水`,
    });
  }

  function confirmClear() {
    resetLedger();
    setBudgetDraft('');
    setThemeDraft('#4C9FC4');
    setThemeError('');
    setConfirmReset(false);
    setPendingImport(null);
    setTransferState({ tone: 'success', message: '本地数据已清空' });
  }

  return (
    <ScrollView
      contentContainerStyle={contentStyle}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.paper }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text selectable style={styles.title}>
            我的
          </Text>
          <Text selectable style={styles.subtitle}>
            预算、设置和本地数据
          </Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>页</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <AppIcon name="wallet" size={22} color={colors.ink} />
        </View>
        <Text selectable style={styles.summaryLabel}>
          本月支出
        </Text>
        <Text selectable style={styles.summaryAmount}>
          ¥{formatMoney(monthSpent)}
        </Text>
        <View style={styles.summaryMetrics}>
          <Text selectable style={styles.summaryIncome}>
            本月收入 +¥{formatMoney(monthSummary.income)}
          </Text>
          <Text selectable style={styles.summaryHint}>
            预算{' '}
            {ledger.monthlyBudget > 0
              ? `¥${formatMoney(ledger.monthlyBudget)}`
              : '未设置'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>每月预算</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingCopy}>
          <Text selectable style={styles.settingLabel}>
            自定义预算
          </Text>
          <Text selectable style={styles.settingDescription}>
            首页会根据这个金额显示剩余和使用进度
          </Text>
        </View>
        <View style={styles.inlineForm}>
          <View style={styles.budgetInputWrap}>
            <Text style={styles.currency}>¥</Text>
            <TextInput
              accessibilityLabel="每月预算"
              keyboardType="decimal-pad"
              onChangeText={(value) => setBudgetDraft(normalizeAmountInput(value))}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={styles.budgetInput}
              value={budgetDraft}
            />
          </View>
          <Pressable
            accessibilityLabel="保存每月预算"
            accessibilityRole="button"
            onPress={saveBudget}
            style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
            <Text style={styles.applyButtonText}>保存</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityLabel="打开设置"
        accessibilityRole="button"
        accessibilityState={{ expanded: settingsOpen }}
        onPress={() => setSettingsOpen((open) => !open)}
        style={({ pressed }) => [styles.settingsToggle, pressed && styles.pressed]}>
        <View style={styles.settingsTitleRow}>
          <View style={styles.settingsIcon}>
            <AppIcon name="settings" size={20} color={colors.ink} />
          </View>
          <View style={styles.settingCopy}>
            <Text selectable style={styles.settingsTitle}>
              设置
            </Text>
            <Text selectable style={styles.settingDescription}>
              分类、主题、数据导入导出与清空
            </Text>
          </View>
        </View>
        <AppIcon
          name={settingsOpen ? 'chevron-up' : 'chevron-down'}
          size={19}
          color={colors.muted}
        />
      </Pressable>

      {settingsOpen ? (
        <View style={styles.settingsPanel}>
          <CustomCategoryManager />

          <View style={styles.panelDivider} />
          <Text style={styles.panelTitle}>主题颜色</Text>
          <Text selectable style={styles.settingDescription}>
            选择一个预设色，或输入自定义十六进制色值。
          </Text>
          <View style={styles.swatches}>
            {THEME_PRESETS.map((preset) => {
              const active = preset.color.toUpperCase() === ledger.themeColor.toUpperCase();
              return (
                <Pressable
                  accessibilityLabel={`使用${preset.name}主题`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={preset.color}
                  onPress={() => {
                    setThemeDraft(preset.color);
                    setThemeError('');
                    setThemeColor(preset.color);
                  }}
                  style={({ pressed }) => [
                    styles.swatchButton,
                    active && styles.swatchButtonActive,
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: preset.color }]} />
                  <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]}>
                    {preset.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customThemeRow}>
            <View style={styles.themePreview}>
              <View style={[styles.themePreviewDot, { backgroundColor: colors.seed }]} />
              <Text selectable style={styles.themePreviewText}>
                {colors.seed}
              </Text>
            </View>
            <TextInput
              accessibilityLabel="自定义主题色值"
              autoCapitalize="characters"
              maxLength={7}
              onChangeText={(value) => {
                setThemeDraft(value);
                setThemeError('');
              }}
              placeholder="#4C9FC4"
              placeholderTextColor={colors.muted}
              style={styles.themeInput}
              value={themeDraft}
            />
            <Pressable
              accessibilityRole="button"
              onPress={applyCustomTheme}
              style={({ pressed }) => [styles.compactButton, pressed && styles.pressed]}>
              <Text style={styles.compactButtonText}>应用</Text>
            </Pressable>
          </View>
          {themeError ? (
            <Text accessibilityLiveRegion="polite" selectable style={styles.error}>
              {themeError}
            </Text>
          ) : null}

          <View style={styles.panelDivider} />
          <Text style={styles.panelTitle}>数据迁移</Text>
          <Text selectable style={styles.settingDescription}>
            JSON 备份包含流水、自定义分类、预算和主题。导入会完整替换当前数据。
          </Text>
          <View style={styles.transferActions}>
            <Pressable
              accessibilityRole="button"
              disabled={transferBusy !== null}
              onPress={handleExport}
              style={({ pressed }) => [styles.transferButton, pressed && styles.pressed]}>
              {transferBusy === 'export' ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <AppIcon name="download" size={18} color={colors.ink} />
              )}
              <Text style={styles.transferButtonText}>导出备份</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={transferBusy !== null}
              onPress={handleChooseImport}
              style={({ pressed }) => [styles.transferButton, pressed && styles.pressed]}>
              {transferBusy === 'import' ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <AppIcon name="upload" size={18} color={colors.ink} />
              )}
              <Text style={styles.transferButtonText}>导入备份</Text>
            </Pressable>
          </View>

          {transferState.message ? (
            <Text
              accessibilityLiveRegion="polite"
              selectable
              style={[
                styles.transferMessage,
                transferState.tone === 'error' && styles.error,
                transferState.tone === 'success' && styles.success,
              ]}>
              {transferState.message}
            </Text>
          ) : null}

          {pendingImport ? (
            <View style={styles.importConfirm}>
              <Text selectable style={styles.confirmTitle}>
                确认替换当前账本？
              </Text>
              <Text selectable style={styles.confirmText}>
                备份中有 {pendingImport.data.entries.length} 笔流水，
                导入后当前数据将被覆盖。
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPendingImport(null);
                    setTransferState({ tone: 'neutral', message: '已取消导入' });
                  }}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelText}>取消</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmImport}
                  style={({ pressed }) => [styles.primaryConfirmButton, pressed && styles.pressed]}>
                  <Text style={styles.primaryConfirmText}>确认替换</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.panelDivider} />
          <View style={styles.statusRow}>
            <View style={styles.settingCopy}>
              <Text selectable style={styles.settingLabel}>
                本地保存
              </Text>
              <Text selectable style={styles.settingDescription}>
                流水、分类、预算和主题会自动保存在当前设备
              </Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.panelDivider} />

          {confirmReset ? (
            <View style={styles.clearConfirm}>
              <Text selectable style={styles.confirmTitle}>
                清空全部账本数据？
              </Text>
              <Text selectable style={styles.confirmText}>
                流水、自定义分类、预算和主题都会恢复为初始状态。
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmReset(false)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelText}>取消</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmClear}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                  <Text style={styles.deleteButtonText}>确认清空</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmReset(true)}
              style={({ pressed }) => [styles.resetRow, pressed && styles.pressed]}>
              <View style={styles.settingCopy}>
                <Text selectable style={styles.settingLabel}>
                  清空全部数据
                </Text>
                <Text selectable style={styles.settingDescription}>
                  删除所有自定义流水和设置
                </Text>
              </View>
              <AppIcon name="trash" size={18} color={colors.danger} />
            </Pressable>
          )}
        </View>
      ) : null}

      <Text selectable style={styles.version}>
        一页账 1.3.0
      </Text>
    </ScrollView>
  );
}

function createStyles(colors: LedgerPalette) {
  return StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: process.env.EXPO_OS === 'web' ? 116 : 34,
    },
    header: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    avatar: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: colors.ink,
    },
    avatarText: {
      color: colors.frost,
      fontSize: 18,
      fontWeight: '800',
    },
    summaryCard: {
      minHeight: 166,
      borderRadius: 26,
      backgroundColor: colors.card,
      padding: 20,
      boxShadow: '0px 12px 26px rgba(50, 82, 100, 0.07)',
    },
    summaryIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderRadius: 14,
      backgroundColor: colors.frost,
    },
    summaryLabel: {
      color: colors.inkSoft,
      fontSize: 11,
      fontWeight: '600',
    },
    summaryAmount: {
      color: colors.ink,
      fontSize: 32,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      letterSpacing: -1,
    },
    summaryMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 5,
    },
    summaryIncome: {
      color: '#467C66',
      fontSize: 10.5,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    summaryHint: {
      color: colors.muted,
      fontSize: 10,
    },
    sectionTitle: {
      marginTop: 4,
      paddingHorizontal: 3,
      color: colors.inkSoft,
      fontSize: 11,
      fontWeight: '700',
    },
    settingCard: {
      gap: 14,
      borderRadius: 22,
      backgroundColor: colors.card,
      padding: 17,
    },
    settingCopy: {
      flex: 1,
      gap: 4,
    },
    settingLabel: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '700',
    },
    settingDescription: {
      color: colors.inkSoft,
      fontSize: 10.5,
      lineHeight: 16,
    },
    inlineForm: {
      flexDirection: 'row',
      gap: 9,
    },
    budgetInputWrap: {
      minWidth: 0,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingLeft: 13,
    },
    currency: {
      color: colors.inkSoft,
      fontSize: 14,
      fontWeight: '700',
    },
    budgetInput: {
      flex: 1,
      minHeight: 46,
      paddingHorizontal: 6,
      color: colors.ink,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    applyButton: {
      minWidth: 68,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      backgroundColor: colors.ink,
      paddingHorizontal: 14,
    },
    applyButtonText: {
      color: colors.card,
      fontSize: 12,
      fontWeight: '800',
    },
    settingsToggle: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 22,
      backgroundColor: colors.card,
      paddingHorizontal: 17,
      paddingVertical: 13,
    },
    settingsTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingsIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.frost,
    },
    settingsTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    settingsPanel: {
      gap: 13,
      borderRadius: 22,
      backgroundColor: colors.card,
      padding: 17,
    },
    panelTitle: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '800',
    },
    panelDivider: {
      height: 1,
      backgroundColor: colors.line,
    },
    swatches: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    swatchButton: {
      width: '31%',
      flexGrow: 1,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingVertical: 9,
    },
    swatchButtonActive: {
      borderColor: colors.ink,
      backgroundColor: colors.frost,
    },
    swatch: {
      width: 26,
      height: 26,
      borderRadius: 9,
    },
    swatchLabel: {
      color: colors.inkSoft,
      fontSize: 10.5,
      fontWeight: '600',
    },
    swatchLabelActive: {
      color: colors.ink,
      fontWeight: '800',
    },
    customThemeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themePreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    themePreviewDot: {
      width: 18,
      height: 18,
      borderRadius: 6,
    },
    themePreviewText: {
      color: colors.muted,
      fontSize: 9,
    },
    themeInput: {
      minWidth: 0,
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingHorizontal: 12,
      color: colors.ink,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
    },
    compactButton: {
      minWidth: 62,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      backgroundColor: colors.ink,
      paddingHorizontal: 12,
    },
    compactButtonText: {
      color: colors.card,
      fontSize: 12,
      fontWeight: '800',
    },
    transferActions: {
      flexDirection: 'row',
      gap: 9,
    },
    transferButton: {
      minHeight: 46,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 15,
      backgroundColor: colors.frost,
    },
    transferButtonText: {
      color: colors.ink,
      fontSize: 11.5,
      fontWeight: '800',
    },
    transferMessage: {
      color: colors.inkSoft,
      fontSize: 10.5,
      lineHeight: 16,
    },
    success: {
      color: '#467C66',
    },
    importConfirm: {
      gap: 7,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 17,
      backgroundColor: colors.input,
      padding: 14,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.aqua,
    },
    resetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    clearConfirm: {
      gap: 5,
    },
    confirmTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '800',
    },
    confirmText: {
      color: colors.inkSoft,
      fontSize: 10.5,
      lineHeight: 16,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    cancelButton: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.card,
    },
    cancelText: {
      color: colors.inkSoft,
      fontSize: 12,
      fontWeight: '700',
    },
    primaryConfirmButton: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.ink,
    },
    primaryConfirmText: {
      color: colors.card,
      fontSize: 12,
      fontWeight: '800',
    },
    deleteButton: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.danger,
    },
    deleteButtonText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '800',
    },
    error: {
      color: colors.danger,
      fontSize: 10.5,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.68,
    },
    version: {
      marginTop: 12,
      color: colors.muted,
      fontSize: 9.5,
      textAlign: 'center',
    },
  });
}
