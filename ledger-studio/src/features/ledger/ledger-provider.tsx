import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { loadLedger, saveLedger } from './ledger-storage';
import {
  CATEGORY_BY_ID,
  CUSTOM_CATEGORY_LIMIT,
  CUSTOM_CATEGORY_NAME_LIMIT,
  INITIAL_LEDGER,
  createCustomCategoryId,
  customCategoryToDefinition,
  getCategoriesForType,
  isCustomCategoryColor,
  isCustomCategoryIcon,
  isEntryType,
  sortEntries,
  type CategoryDefinition,
  type CustomCategory,
  type CustomCategoryIconId,
  type EntryType,
  type LedgerEntry,
  type LedgerState,
} from './model';
import { createLedgerPalette, normalizeThemeColor } from '@/constants/theme';

export type CustomCategoryInput = {
  id?: `custom-${string}`;
  type: EntryType;
  name: string;
  icon: CustomCategoryIconId;
  color: string;
};

export type CategorySaveResult =
  | { ok: true; category: CustomCategory }
  | {
      ok: false;
      reason: 'invalid' | 'duplicate' | 'limit' | 'not-found' | 'type-locked';
    };

export type CategoryDeleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'in-use' | 'not-found';
      usageCount?: number;
    };

type LedgerContextValue = {
  ledger: LedgerState;
  colors: ReturnType<typeof createLedgerPalette>;
  categoriesById: Record<string, CategoryDefinition>;
  categoriesByType: Record<EntryType, CategoryDefinition[]>;
  upsertEntry: (entry: LedgerEntry) => void;
  removeEntry: (id: string) => void;
  resetLedger: () => void;
  replaceLedger: (ledger: LedgerState) => void;
  saveCustomCategory: (input: CustomCategoryInput) => CategorySaveResult;
  deleteCustomCategory: (id: string) => CategoryDeleteResult;
  setMonthlyBudget: (amount: number) => void;
  setThemeColor: (color: string) => void;
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: PropsWithChildren) {
  const [ledger, setLedger] = useState<LedgerState>(loadLedger);

  useEffect(() => {
    saveLedger(ledger);
  }, [ledger]);

  const upsertEntry = useCallback((entry: LedgerEntry) => {
    setLedger((current) => {
      const exists = current.entries.some((item) => item.id === entry.id);
      const entries = exists
        ? current.entries.map((item) => (item.id === entry.id ? entry : item))
        : [...current.entries, entry];

      return { ...current, entries: sortEntries(entries) };
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setLedger((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
    }));
  }, []);

  const resetLedger = useCallback(() => {
    setLedger({
      ...INITIAL_LEDGER,
      entries: INITIAL_LEDGER.entries.map((entry) => ({ ...entry })),
    });
  }, []);

  const replaceLedger = useCallback((next: LedgerState) => {
    setLedger({
      ...next,
      entries: sortEntries(next.entries.map((entry) => ({ ...entry }))),
      customCategories: next.customCategories.map((category) => ({ ...category })),
    });
  }, []);

  const saveCustomCategory = useCallback(
    (input: CustomCategoryInput): CategorySaveResult => {
      const name = input.name.trim();
      if (
        !name ||
        name.length > CUSTOM_CATEGORY_NAME_LIMIT ||
        !isEntryType(input.type) ||
        !isCustomCategoryIcon(input.icon) ||
        !isCustomCategoryColor(input.color)
      ) {
        return { ok: false, reason: 'invalid' };
      }

      const existing = input.id
        ? ledger.customCategories.find((category) => category.id === input.id)
        : null;
      if (input.id && !existing) {
        return { ok: false, reason: 'not-found' };
      }
      if (existing && existing.type !== input.type) {
        return { ok: false, reason: 'type-locked' };
      }

      const duplicate = getCategoriesForType(
        ledger.customCategories,
        input.type
      ).some(
        (category) =>
          category.id !== input.id &&
          category.label.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
      );
      if (duplicate) {
        return { ok: false, reason: 'duplicate' };
      }

      if (!existing && ledger.customCategories.length >= CUSTOM_CATEGORY_LIMIT) {
        return { ok: false, reason: 'limit' };
      }

      const category: CustomCategory = {
        id: existing?.id ?? createCustomCategoryId(),
        type: existing?.type ?? input.type,
        name,
        icon: input.icon,
        color: input.color,
      };
      setLedger((current) => ({
        ...current,
        customCategories: existing
          ? current.customCategories.map((item) =>
              item.id === category.id ? category : item
            )
          : [...current.customCategories, category],
      }));
      return { ok: true, category };
    },
    [ledger.customCategories]
  );

  const deleteCustomCategory = useCallback(
    (id: string): CategoryDeleteResult => {
      const category = ledger.customCategories.find((item) => item.id === id);
      if (!category) {
        return { ok: false, reason: 'not-found' };
      }
      const usageCount = ledger.entries.filter(
        (entry) => entry.categoryId === id
      ).length;
      if (usageCount > 0) {
        return { ok: false, reason: 'in-use', usageCount };
      }
      setLedger((current) => ({
        ...current,
        customCategories: current.customCategories.filter((item) => item.id !== id),
      }));
      return { ok: true };
    },
    [ledger.customCategories, ledger.entries]
  );

  const setMonthlyBudget = useCallback((amount: number) => {
    setLedger((current) => ({
      ...current,
      monthlyBudget: Math.max(0, Math.round(amount * 100) / 100),
    }));
  }, []);

  const setThemeColor = useCallback((color: string) => {
    const normalized = normalizeThemeColor(color);
    if (!normalized) {
      return;
    }
    setLedger((current) => ({ ...current, themeColor: normalized }));
  }, []);

  const colors = useMemo(
    () => createLedgerPalette(ledger.themeColor),
    [ledger.themeColor]
  );
  const categoriesById = useMemo(
    () => ({
      ...CATEGORY_BY_ID,
      ...Object.fromEntries(
        ledger.customCategories.map((category) => [
          category.id,
          customCategoryToDefinition(category),
        ])
      ),
    }),
    [ledger.customCategories]
  );
  const categoriesByType = useMemo(
    () => ({
      expense: getCategoriesForType(ledger.customCategories, 'expense'),
      income: getCategoriesForType(ledger.customCategories, 'income'),
    }),
    [ledger.customCategories]
  );

  const value = useMemo(
    () => ({
      ledger,
      colors,
      categoriesById,
      categoriesByType,
      upsertEntry,
      removeEntry,
      resetLedger,
      replaceLedger,
      saveCustomCategory,
      deleteCustomCategory,
      setMonthlyBudget,
      setThemeColor,
    }),
    [
      categoriesById,
      categoriesByType,
      colors,
      deleteCustomCategory,
      ledger,
      removeEntry,
      resetLedger,
      replaceLedger,
      saveCustomCategory,
      setMonthlyBudget,
      setThemeColor,
      upsertEntry,
    ]
  );

  return <LedgerContext value={value}>{children}</LedgerContext>;
}

export function useLedger() {
  const value = use(LedgerContext);
  if (!value) {
    throw new Error('useLedger must be used inside LedgerProvider');
  }
  return value;
}
