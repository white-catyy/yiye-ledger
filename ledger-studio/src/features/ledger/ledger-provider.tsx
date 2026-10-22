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
  INITIAL_LEDGER,
  sortEntries,
  type LedgerEntry,
  type LedgerState,
} from './model';
import { createLedgerPalette, normalizeThemeColor } from '@/constants/theme';

type LedgerContextValue = {
  ledger: LedgerState;
  colors: ReturnType<typeof createLedgerPalette>;
  upsertEntry: (entry: LedgerEntry) => void;
  removeEntry: (id: string) => void;
  resetLedger: () => void;
  replaceLedger: (ledger: LedgerState) => void;
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
    });
  }, []);

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

  const value = useMemo(
    () => ({
      ledger,
      colors,
      upsertEntry,
      removeEntry,
      resetLedger,
      replaceLedger,
      setMonthlyBudget,
      setThemeColor,
    }),
    [
      colors,
      ledger,
      removeEntry,
      resetLedger,
      replaceLedger,
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
