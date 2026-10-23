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

import { AppIcon } from './app-icon';
import { CategoryIcon } from './category-icon';
import { useLedger } from './ledger-provider';
import {
  LEGACY_OTHER_CATEGORY,
  createEntryId,
  formatEntryDate,
  getDateKey,
  getCurrentTime,
  isValidTime,
  normalizeAmountInput,
  normalizeTimeInput,
  type CategoryId,
  type CategoryDefinition,
  type EntryType,
  type LedgerEntry,
} from './model';

type Draft = {
  type: EntryType;
  categoryId: CategoryId;
  name: string;
  note: string;
  amount: string;
  time: string;
  date: string;
};

type EntryEditorProps = {
  visible: boolean;
  entry: LedgerEntry | null;
  initialDate?: string;
  onDismiss: () => void;
  onSave: (entry: LedgerEntry) => void;
  onDelete: (id: string) => void;
};

function getDraft(
  entry: LedgerEntry | null,
  initialDate: string | undefined,
  categoriesByType: Record<EntryType, CategoryDefinition[]>
): Draft {
  const type = entry?.type ?? 'expense';
  return {
    type,
    categoryId:
      entry?.categoryId ?? (categoriesByType[type][0].id as CategoryId),
    name: entry?.name ?? '',
    note: entry?.note ?? '',
    amount: entry ? String(entry.amount) : '',
    time: entry?.time ?? getCurrentTime(),
    date: entry?.date ?? initialDate ?? getDateKey(),
  };
}

export function EntryEditor({
  visible,
  entry,
  initialDate,
  onDismiss,
  onSave,
  onDelete,
}: EntryEditorProps) {
  const { categoriesById, categoriesByType, colors } = useLedger();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState<Draft>(() =>
    getDraft(entry, initialDate, categoriesByType)
  );
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(getDraft(entry, initialDate, categoriesByType));
      setError('');
      setConfirmDelete(false);
    }
  }, [categoriesByType, entry, initialDate, visible]);

  const currentCategory =
    categoriesById[draft.categoryId] ??
    (draft.categoryId === 'other' ? LEGACY_OTHER_CATEGORY : null);
  const categoryOptions = useMemo(() => {
    const categories = categoriesByType[draft.type];
    if (
      currentCategory &&
      currentCategory.type === draft.type &&
      !categories.some((category) => category.id === currentCategory.id)
    ) {
      return [currentCategory, ...categories];
    }
    return categories;
  }, [categoriesByType, currentCategory, draft.type]);

  function updateDraft<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function handleSave() {
    const amount = Number(draft.amount);
    if (!draft.name.trim()) {
      setError('给这笔流水写个名称');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('金额需要大于 0');
      return;
    }
    if (!isValidTime(draft.time)) {
      setError('时间格式应为 08:30');
      return;
    }

    onSave({
      id: entry?.id ?? createEntryId(),
      type: draft.type,
      categoryId: draft.categoryId,
      name: draft.name.trim(),
      note: draft.note.trim(),
      amount: Math.round(amount * 100) / 100,
      time: draft.time,
      date: draft.date,
    });
  }

  function handleDelete() {
    if (!entry) {
      return;
    }
    onDelete(entry.id);
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
          <View style={styles.sheetHeader}>
            <View style={styles.headerCopy}>
              <Text selectable style={styles.title}>
                {entry ? '编辑这笔流水' : '记下一笔'}
              </Text>
              <Text selectable style={styles.subtitle}>
                {formatEntryDate(draft.date)} · 轻点保存后，账本会立即更新
              </Text>
            </View>
            <Pressable
              accessibilityLabel="关闭编辑"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onDismiss}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <AppIcon name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.amountField}>
            <Text style={styles.amountCurrency}>¥</Text>
            <TextInput
              accessibilityLabel="金额"
              autoFocus={!entry}
              keyboardType="decimal-pad"
              maxLength={9}
              onChangeText={(value) => updateDraft('amount', normalizeAmountInput(value))}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              selectTextOnFocus
              style={styles.amountInput}
              value={draft.amount}
            />
          </View>

          <Text style={styles.sectionLabel}>流水类型</Text>
          <View style={styles.typeSelector}>
            {(['expense', 'income'] as const).map((type) => {
              const active = draft.type === type;
              return (
                <Pressable
                  accessibilityLabel={`选择${type === 'income' ? '收入' : '支出'}类型`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={type}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      type,
                      categoryId: categoriesByType[type][0].id as CategoryId,
                    }))
                  }
                  style={({ pressed }) => [
                    styles.typeOption,
                    active && styles.typeOptionActive,
                    pressed && styles.pressed,
                  ]}>
                  <AppIcon
                    name={type === 'income' ? 'trend' : 'wallet'}
                    size={18}
                    color={active ? colors.ink : colors.inkSoft}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      active && styles.typeOptionTextActive,
                    ]}>
                    {type === 'income' ? '收入' : '支出'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>分类</Text>
          <View style={styles.categoryGrid}>
            {categoryOptions.map((category) => {
              const active = category.id === draft.categoryId;
              return (
                <Pressable
                  accessibilityLabel={`选择${category.label}分类`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={category.id}
                  onPress={() =>
                    updateDraft('categoryId', category.id as CategoryId)
                  }
                  style={({ pressed }) => [
                    styles.categoryOption,
                    active && styles.categoryOptionActive,
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.categoryBubble, { backgroundColor: category.tint }]}>
                    <CategoryIcon
                      category={category}
                      color={active ? colors.ink : category.ink}
                      size={20}
                    />
                  </View>
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.categoryHint}>
            {'自定义分类可在“我的 > 设置”中添加和管理'}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>名称</Text>
            <TextInput
              accessibilityLabel="流水名称"
              maxLength={30}
              onChangeText={(value) => updateDraft('name', value)}
              placeholder="例如：学校食堂"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.textInput}
              value={draft.name}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>时间</Text>
            <TextInput
              accessibilityLabel="流水时间"
              keyboardType="number-pad"
              maxLength={5}
              onChangeText={(value) => updateDraft('time', normalizeTimeInput(value))}
              placeholder="08:30"
              placeholderTextColor={colors.muted}
              style={[styles.textInput, styles.numberInput]}
              value={draft.time}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>备注</Text>
            <TextInput
              accessibilityLabel="流水备注"
              maxLength={60}
              onChangeText={(value) => updateDraft('note', value)}
              placeholder={
                draft.type === 'income'
                  ? '写一句关于这笔收入的说明'
                  : '写一句关于这笔消费的话'
              }
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={styles.textInput}
              value={draft.note}
            />
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" selectable style={styles.error}>
              {error}
            </Text>
          ) : null}

          {entry && confirmDelete ? (
            <View style={styles.confirmDelete}>
              <Text style={styles.confirmText}>确定删除这笔流水？</Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmDelete(false)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelText}>取消</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleDelete}
                  style={({ pressed }) => [styles.deleteConfirmButton, pressed && styles.pressed]}>
                  <Text style={styles.deleteConfirmText}>确认删除</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            {entry && !confirmDelete ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmDelete(true)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                <AppIcon name="trash" size={18} color={colors.danger} />
                <Text style={styles.deleteText}>删除</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}>
              <Text style={styles.saveText}>保存这笔</Text>
              <AppIcon name="check" size={18} color={colors.ink} />
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </RNHostView>
    </BottomSheet>
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
  sheetHeader: {
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
  pressed: {
    opacity: 0.68,
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
  typeSelector: {
    flexDirection: 'row',
    gap: 9,
  },
  typeOption: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.input,
  },
  typeOptionActive: {
    borderColor: colors.skyDeep,
    backgroundColor: colors.frost,
  },
  typeOptionText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  typeOptionTextActive: {
    color: colors.ink,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    minWidth: '22%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
    backgroundColor: '#F6FAFD',
    paddingHorizontal: 7,
    paddingVertical: 10,
  },
  categoryOptionActive: {
    borderColor: colors.skyDeep,
    backgroundColor: '#EAF7FD',
  },
  categoryBubble: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  categoryLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: colors.ink,
    fontWeight: '800',
  },
  categoryHint: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
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
    fontSize: 14,
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
    boxShadow: '0px 10px 22px rgba(29, 73, 98, 0.22)',
  },
  saveButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  saveText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '800',
  },
  });
}
