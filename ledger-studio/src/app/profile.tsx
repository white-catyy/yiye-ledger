import { useMemo, useState } from 'react';
import {
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
import { useLedger } from '@/features/ledger/ledger-provider';
import {
  formatMoney,
  isSameMonth,
  normalizeAmountInput,
  sumEntries,
} from '@/features/ledger/model';

export default function ProfileScreen() {
  const {
    ledger,
    colors,
    resetLedger,
    setMonthlyBudget,
    setThemeColor,
  } = useLedger();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [budgetDraft, setBudgetDraft] = useState(
    ledger.monthlyBudget > 0 ? String(ledger.monthlyBudget) : ''
  );
  const [themeDraft, setThemeDraft] = useState(ledger.themeColor);
  const [themeError, setThemeError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const monthSpent = useMemo(
    () =>
      ledger.monthlySpentBeforeToday +
      sumEntries(ledger.entries.filter((entry) => isSameMonth(entry.date))),
    [ledger.entries, ledger.monthlySpentBeforeToday]
  );
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
            预算、主题和数据都在这里
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
          本月已花
        </Text>
        <Text selectable style={styles.summaryAmount}>
          ¥{formatMoney(monthSpent)}
        </Text>
        <Text selectable style={styles.summaryHint}>
          预算 {ledger.monthlyBudget > 0 ? `¥${formatMoney(ledger.monthlyBudget)}` : '未设置'}
        </Text>
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
            accessibilityRole="button"
            onPress={saveBudget}
            style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
            <Text style={styles.applyButtonText}>保存</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>主题颜色</Text>
      <View style={styles.settingCard}>
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
            style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
            <Text style={styles.applyButtonText}>应用</Text>
          </Pressable>
        </View>
        {themeError ? (
          <Text accessibilityLiveRegion="polite" selectable style={styles.error}>
            {themeError}
          </Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>数据设置</Text>
      <View style={styles.settingCard}>
        <View style={styles.statusRow}>
          <View style={styles.settingCopy}>
            <Text selectable style={styles.settingLabel}>
              本地保存
            </Text>
            <Text selectable style={styles.settingDescription}>
              流水、预算和主题会自动保存在当前设备
            </Text>
          </View>
          <View style={styles.statusDot} />
        </View>
        <View style={styles.divider} />
        {confirmReset ? (
          <View style={styles.confirmBox}>
            <Text selectable style={styles.confirmTitle}>
              清空全部账本数据？
            </Text>
            <Text selectable style={styles.confirmText}>
              流水、预算和主题都会恢复为初始状态。
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
                onPress={() => {
                  resetLedger();
                  setBudgetDraft('');
                  setThemeDraft('#4C9FC4');
                  setThemeError('');
                  setConfirmReset(false);
                }}
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

      <Text selectable style={styles.version}>
        一页账 1.1.0
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
    summaryHint: {
      marginTop: 5,
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
    error: {
      color: colors.danger,
      fontSize: 10.5,
      fontWeight: '600',
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
    divider: {
      height: 1,
      backgroundColor: colors.line,
    },
    resetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    confirmBox: {
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
      backgroundColor: colors.input,
    },
    cancelText: {
      color: colors.inkSoft,
      fontSize: 12,
      fontWeight: '700',
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
