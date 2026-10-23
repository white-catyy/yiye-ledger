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
  CUSTOM_CATEGORY_COLORS,
  CUSTOM_CATEGORY_ICONS,
  CUSTOM_CATEGORY_LIMIT,
  CUSTOM_CATEGORY_NAME_LIMIT,
  type CategoryDefinition,
  type CustomCategory,
  type CustomCategoryIcon,
  type CustomCategoryIconId,
  type EntryType,
} from './model';

function iconPreview(
  icon: CustomCategoryIcon,
  type: EntryType,
  color: string
): CategoryDefinition {
  return {
    id: icon.id,
    type,
    label: icon.label,
    sf: icon.sf,
    material: icon.material,
    tint: `${color}20`,
    ink: color,
  };
}

export function CustomCategoryManager() {
  const { colors, deleteCustomCategory, ledger } = useLedger();
  const styles = useMemo(() => createManagerStyles(colors), [colors]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(
    null
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const limitReached = ledger.customCategories.length >= CUSTOM_CATEGORY_LIMIT;

  function openCreate() {
    setMessage('');
    setConfirmDeleteId(null);
    setEditingCategory(null);
    setEditorVisible(true);
  }

  function openEdit(category: CustomCategory) {
    setMessage('');
    setConfirmDeleteId(null);
    setEditingCategory(category);
    setEditorVisible(true);
  }

  function requestDelete(id: string) {
    setMessage('');
    const result = deleteCustomCategory(id);
    if (!result.ok && result.reason === 'in-use') {
      setConfirmDeleteId(null);
      setMessage(
        `这个分类正被 ${result.usageCount ?? 0} 笔流水使用，请先修改相关流水后再删除。`
      );
      return;
    }
    if (result.ok) {
      setConfirmDeleteId(null);
      setMessage('自定义分类已删除');
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text selectable style={styles.heading}>
            自定义分类
          </Text>
          <Text selectable style={styles.description}>
            收入和支出分类分开使用，合计 {ledger.customCategories.length}/
            {CUSTOM_CATEGORY_LIMIT}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="新增自定义分类"
          accessibilityRole="button"
          accessibilityState={{ disabled: limitReached }}
          disabled={limitReached}
          onPress={openCreate}
          style={({ pressed }) => [
            styles.addButton,
            limitReached && styles.addButtonDisabled,
            pressed && styles.pressed,
          ]}>
          <AppIcon name="plus" size={16} color={colors.ink} />
          <Text style={styles.addButtonText}>新增</Text>
        </Pressable>
      </View>

      {ledger.customCategories.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <AppIcon name="document" size={19} color={colors.aqua} />
          </View>
          <Text selectable style={styles.emptyText}>
            还没有自定义分类。添加后会自动出现在对应类型的编辑器里。
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {ledger.customCategories.map((category, index) => {
            const icon = iconPreview(
              CUSTOM_CATEGORY_ICONS.find((item) => item.id === category.icon) ??
                CUSTOM_CATEGORY_ICONS[0],
              category.type,
              category.color
            );
            const confirming = confirmDeleteId === category.id;
            return (
              <View
                key={category.id}
                style={[
                  styles.categoryRow,
                  index === ledger.customCategories.length - 1 && styles.lastRow,
                ]}>
                <View style={[styles.iconBubble, { backgroundColor: icon.tint }]}>
                  <CategoryIcon category={icon} size={19} color={category.color} />
                </View>
                <View style={styles.categoryCopy}>
                  <Text numberOfLines={1} selectable style={styles.categoryName}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryType}>
                    {category.type === 'income' ? '收入分类' : '支出分类'}
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
                      accessibilityLabel={`确认删除${category.name}分类`}
                      accessibilityRole="button"
                      onPress={() => requestDelete(category.id)}
                      style={({ pressed }) => [
                        styles.dangerAction,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.dangerActionText}>删除</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityLabel={`编辑${category.name}分类`}
                      accessibilityRole="button"
                      onPress={() => openEdit(category)}
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.pressed,
                      ]}>
                      <AppIcon name="edit" size={17} color={colors.inkSoft} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`删除${category.name}分类`}
                      accessibilityRole="button"
                      onPress={() => setConfirmDeleteId(category.id)}
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
      )}

      {limitReached ? (
        <Text selectable style={styles.helper}>
          已达到 20 个自定义分类上限，删除未使用分类后可继续添加。
        </Text>
      ) : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={[
            styles.message,
            message.includes('已删除') && styles.successMessage,
          ]}>
          {message}
        </Text>
      ) : null}

      <CategoryForm
        category={editingCategory}
        onDismiss={() => setEditorVisible(false)}
        visible={editorVisible}
      />
    </View>
  );
}

function CategoryForm({
  category,
  visible,
  onDismiss,
}: {
  category: CustomCategory | null;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { colors, saveCustomCategory } = useLedger();
  const styles = useMemo(() => createFormStyles(colors), [colors]);
  const [type, setType] = useState<EntryType>('expense');
  const [name, setName] = useState('');
  const [iconId, setIconId] = useState<CustomCategoryIconId>('food');
  const [color, setColor] = useState<string>(CUSTOM_CATEGORY_COLORS[0]);
  const [error, setError] = useState('');
  const editing = Boolean(category);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setType(category?.type ?? 'expense');
    setName(category?.name ?? '');
    setIconId(category?.icon ?? 'food');
    setColor(category?.color ?? CUSTOM_CATEGORY_COLORS[0]);
    setError('');
  }, [category, visible]);

  function save() {
    const result = saveCustomCategory({
      id: category?.id,
      type,
      name,
      icon: iconId,
      color,
    });
    if (result.ok) {
      onDismiss();
      return;
    }
    const messages = {
      invalid: '请检查分类名称、图标和颜色',
      duplicate: '同类型中已有同名分类',
      limit: '最多只能创建 20 个自定义分类',
      'not-found': '分类不存在，请刷新后重试',
      'type-locked': '分类创建后不能切换收入或支出类型',
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
                  {editing ? '编辑自定义分类' : '新增自定义分类'}
                </Text>
                <Text selectable style={styles.subtitle}>
                  分类只会在对应的收入或支出编辑器中出现
                </Text>
              </View>
              <Pressable
                accessibilityLabel="关闭分类编辑"
                accessibilityRole="button"
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.pressed,
                ]}>
                <AppIcon name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>分类类型</Text>
              <View style={styles.typeSelector}>
                {(['expense', 'income'] as const).map((option) => {
                  const active = type === option;
                  return (
                    <Pressable
                      accessibilityLabel={`分类类型设为${option === 'income' ? '收入' : '支出'}`}
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: editing,
                        selected: active,
                      }}
                      disabled={editing}
                      key={option}
                      onPress={() => setType(option)}
                      style={({ pressed }) => [
                        styles.typeOption,
                        active && styles.typeOptionActive,
                        editing && !active && styles.disabled,
                        pressed && styles.pressed,
                      ]}>
                      <AppIcon
                        name={option === 'income' ? 'trend' : 'wallet'}
                        size={18}
                        color={active ? colors.ink : colors.inkSoft}
                      />
                      <Text
                        style={[
                          styles.typeText,
                          active && styles.typeTextActive,
                        ]}>
                        {option === 'income' ? '收入' : '支出'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {editing ? (
                <Text selectable style={styles.helper}>
                  分类创建后类型固定，只可修改名称、图标和颜色。
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>分类名称</Text>
              <TextInput
                accessibilityLabel="分类名称"
                maxLength={CUSTOM_CATEGORY_NAME_LIMIT}
                onChangeText={(value) => {
                  setName(value);
                  setError('');
                }}
                placeholder="例如：社团、摄影"
                placeholderTextColor={colors.muted}
                style={styles.textInput}
                value={name}
              />
              <Text style={styles.counter}>
                {name.length}/{CUSTOM_CATEGORY_NAME_LIMIT}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>图标</Text>
              <View style={styles.iconGrid}>
                {CUSTOM_CATEGORY_ICONS.map((icon) => {
                  const active = icon.id === iconId;
                  const preview = iconPreview(icon, type, color);
                  return (
                    <Pressable
                      accessibilityLabel={`使用${icon.label}图标`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      key={icon.id}
                      onPress={() => setIconId(icon.id)}
                      style={({ pressed }) => [
                        styles.iconOption,
                        active && styles.iconOptionActive,
                        pressed && styles.pressed,
                      ]}>
                      <View
                        style={[
                          styles.iconPreview,
                          { backgroundColor: preview.tint },
                        ]}>
                        <CategoryIcon
                          category={preview}
                          size={20}
                          color={color}
                        />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.iconLabel,
                          active && styles.iconLabelActive,
                        ]}>
                        {icon.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>颜色</Text>
              <View style={styles.colorGrid}>
                {CUSTOM_CATEGORY_COLORS.map((swatch) => {
                  const active = swatch === color;
                  return (
                    <Pressable
                      accessibilityLabel={`选择颜色${swatch}`}
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

            {error ? (
              <Text accessibilityLiveRegion="polite" selectable style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel="保存自定义分类"
              accessibilityRole="button"
              onPress={save}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.saveText}>保存分类</Text>
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
    addButtonDisabled: {
      opacity: 0.42,
    },
    addButtonText: {
      color: colors.ink,
      fontSize: 11,
      fontWeight: '800',
    },
    empty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 16,
      backgroundColor: colors.input,
      padding: 13,
    },
    emptyIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.frost,
    },
    emptyText: {
      flex: 1,
      color: colors.inkSoft,
      fontSize: 10.5,
      lineHeight: 16,
    },
    list: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 17,
      backgroundColor: colors.input,
    },
    categoryRow: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
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
    categoryCopy: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    categoryName: {
      color: colors.ink,
      fontSize: 12.5,
      fontWeight: '700',
    },
    categoryType: {
      color: colors.muted,
      fontSize: 9.5,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    iconButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 11,
      backgroundColor: colors.card,
    },
    rowAction: {
      minHeight: 34,
      justifyContent: 'center',
      borderRadius: 11,
      backgroundColor: colors.card,
      paddingHorizontal: 9,
    },
    rowActionText: {
      color: colors.inkSoft,
      fontSize: 10,
      fontWeight: '700',
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
    fieldGroup: {
      gap: 8,
    },
    label: {
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
    typeText: {
      color: colors.inkSoft,
      fontSize: 13,
      fontWeight: '700',
    },
    typeTextActive: {
      color: colors.ink,
      fontWeight: '800',
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
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconOption: {
      width: '22.5%',
      flexGrow: 1,
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      backgroundColor: colors.input,
      paddingHorizontal: 5,
      paddingVertical: 9,
    },
    iconOptionActive: {
      borderColor: colors.ink,
      backgroundColor: colors.frost,
    },
    iconPreview: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    iconLabel: {
      color: colors.inkSoft,
      fontSize: 9.5,
    },
    iconLabelActive: {
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
    helper: {
      color: colors.muted,
      fontSize: 10,
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
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.68,
    },
  });
}
