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
  ACCOUNT_LIMIT,
  ACCOUNT_NAME_LIMIT,
  CATEGORY_BY_ID,
  CUSTOM_CATEGORY_LIMIT,
  CUSTOM_CATEGORY_NAME_LIMIT,
  INITIAL_LEDGER,
  createAccountId,
  createCustomCategoryId,
  customCategoryToDefinition,
  getAccountBalances,
  getCategoriesForType,
  getTotalAssets,
  isCustomCategoryColor,
  isCustomCategoryIcon,
  isEntryType,
  isLedgerAccountColor,
  isLedgerAccountKind,
  sortEntries,
  type CategoryDefinition,
  type CustomCategory,
  type CustomCategoryIconId,
  type EntryType,
  type LedgerAccount,
  type LedgerAccountId,
  type LedgerAccountKind,
  type LedgerEntry,
  type LedgerState,
  type LedgerTransfer,
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

export type AccountInput = {
  id?: LedgerAccountId;
  name: string;
  kind: LedgerAccountKind;
  color: string;
  openingBalance: number;
};

export type AccountSaveResult =
  | { ok: true; account: LedgerAccount }
  | {
      ok: false;
      reason: 'invalid' | 'duplicate' | 'limit' | 'not-found';
    };

export type AccountDeleteResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'default' | 'in-use' | 'last-account' | 'not-found';
      usageCount?: number;
    };

type LedgerContextValue = {
  ledger: LedgerState;
  colors: ReturnType<typeof createLedgerPalette>;
  accountBalances: Record<string, number>;
  totalAssets: number;
  categoriesById: Record<string, CategoryDefinition>;
  categoriesByType: Record<EntryType, CategoryDefinition[]>;
  upsertEntry: (entry: LedgerEntry) => void;
  removeEntry: (id: string) => void;
  upsertTransfer: (transfer: LedgerTransfer) => void;
  removeTransfer: (id: string) => void;
  resetLedger: () => void;
  replaceLedger: (ledger: LedgerState) => void;
  saveAccount: (input: AccountInput) => AccountSaveResult;
  deleteAccount: (id: LedgerAccountId) => AccountDeleteResult;
  setDefaultAccount: (id: LedgerAccountId) => boolean;
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

  const upsertTransfer = useCallback((transfer: LedgerTransfer) => {
    setLedger((current) => {
      const exists = current.transfers.some((item) => item.id === transfer.id);
      const transfers = exists
        ? current.transfers.map((item) =>
            item.id === transfer.id ? transfer : item
          )
        : [...current.transfers, transfer];

      return { ...current, transfers };
    });
  }, []);

  const removeTransfer = useCallback((id: string) => {
    setLedger((current) => ({
      ...current,
      transfers: current.transfers.filter((transfer) => transfer.id !== id),
    }));
  }, []);

  const resetLedger = useCallback(() => {
    setLedger({
      ...INITIAL_LEDGER,
      entries: INITIAL_LEDGER.entries.map((entry) => ({ ...entry })),
      transfers: [],
      accounts: INITIAL_LEDGER.accounts.map((account) => ({ ...account })),
    });
  }, []);

  const replaceLedger = useCallback((next: LedgerState) => {
    setLedger({
      ...next,
      entries: sortEntries(next.entries.map((entry) => ({ ...entry }))),
      transfers: next.transfers.map((transfer) => ({ ...transfer })),
      accounts: next.accounts.map((account) => ({ ...account })),
      customCategories: next.customCategories.map((category) => ({ ...category })),
    });
  }, []);

  const saveAccount = useCallback(
    (input: AccountInput): AccountSaveResult => {
      const name = input.name.trim();
      if (
        !name ||
        name.length > ACCOUNT_NAME_LIMIT ||
        !isLedgerAccountKind(input.kind) ||
        !isLedgerAccountColor(input.color) ||
        !Number.isFinite(input.openingBalance) ||
        input.openingBalance < 0
      ) {
        return { ok: false, reason: 'invalid' };
      }

      const existing = input.id
        ? ledger.accounts.find((account) => account.id === input.id)
        : null;
      if (input.id && !existing) {
        return { ok: false, reason: 'not-found' };
      }
      if (
        ledger.accounts.some(
          (account) =>
            account.id !== input.id &&
            account.name.trim().toLocaleLowerCase() ===
              name.toLocaleLowerCase()
        )
      ) {
        return { ok: false, reason: 'duplicate' };
      }
      if (!existing && ledger.accounts.length >= ACCOUNT_LIMIT) {
        return { ok: false, reason: 'limit' };
      }

      const account: LedgerAccount = {
        id: existing?.id ?? createAccountId(),
        name,
        kind: input.kind,
        color: input.color,
        openingBalance: Math.round(input.openingBalance * 100) / 100,
      };
      setLedger((current) => ({
        ...current,
        accounts: existing
          ? current.accounts.map((item) =>
              item.id === account.id ? account : item
            )
          : [...current.accounts, account],
        defaultAccountId: current.defaultAccountId || account.id,
      }));
      return { ok: true, account };
    },
    [ledger.accounts]
  );

  const deleteAccount = useCallback(
    (id: LedgerAccountId): AccountDeleteResult => {
      const account = ledger.accounts.find((item) => item.id === id);
      if (!account) {
        return { ok: false, reason: 'not-found' };
      }
      if (ledger.accounts.length <= 1) {
        return { ok: false, reason: 'last-account' };
      }
      if (ledger.defaultAccountId === id) {
        return { ok: false, reason: 'default' };
      }
      const usageCount =
        ledger.entries.filter((entry) => entry.accountId === id).length +
        ledger.transfers.filter(
          (transfer) =>
            transfer.fromAccountId === id || transfer.toAccountId === id
        ).length;
      if (usageCount > 0) {
        return { ok: false, reason: 'in-use', usageCount };
      }
      setLedger((current) => ({
        ...current,
        accounts: current.accounts.filter((item) => item.id !== id),
      }));
      return { ok: true };
    },
    [
      ledger.accounts,
      ledger.defaultAccountId,
      ledger.entries,
      ledger.transfers,
    ]
  );

  const setDefaultAccount = useCallback(
    (id: LedgerAccountId) => {
      if (!ledger.accounts.some((account) => account.id === id)) {
        return false;
      }
      setLedger((current) => ({ ...current, defaultAccountId: id }));
      return true;
    },
    [ledger.accounts]
  );

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
  const accountBalances = useMemo(() => getAccountBalances(ledger), [ledger]);
  const totalAssets = useMemo(() => getTotalAssets(ledger), [ledger]);
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
      accountBalances,
      totalAssets,
      categoriesById,
      categoriesByType,
      upsertEntry,
      removeEntry,
      upsertTransfer,
      removeTransfer,
      resetLedger,
      replaceLedger,
      saveAccount,
      deleteAccount,
      setDefaultAccount,
      saveCustomCategory,
      deleteCustomCategory,
      setMonthlyBudget,
      setThemeColor,
    }),
    [
      accountBalances,
      categoriesById,
      categoriesByType,
      colors,
      deleteAccount,
      deleteCustomCategory,
      ledger,
      removeEntry,
      removeTransfer,
      resetLedger,
      replaceLedger,
      saveAccount,
      setDefaultAccount,
      saveCustomCategory,
      setMonthlyBudget,
      setThemeColor,
      totalAssets,
      upsertEntry,
      upsertTransfer,
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
