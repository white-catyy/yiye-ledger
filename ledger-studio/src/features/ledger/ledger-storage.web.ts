import { normalizeThemeColor } from '@/constants/theme';

import { getDateKey, INITIAL_LEDGER, type LedgerEntry, type LedgerState } from './model';

const STORAGE_KEY = 'yiye-ledger-v1';

function parseStoredLedger(value: string | null): LedgerState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<LedgerState> & {
      entries?: Array<Partial<LedgerEntry>>;
    };
    if (
      !Array.isArray(parsed.entries) ||
      typeof parsed.monthlyBudget !== 'number' ||
      typeof parsed.monthlySpentBeforeToday !== 'number' ||
      typeof parsed.yesterdayTotal !== 'number'
    ) {
      return null;
    }
    const isLegacy = !parsed.themeColor || parsed.entries?.some((entry) => !entry.date);
    const entries = (parsed.entries ?? [])
      .filter((entry) => !entry.id?.startsWith('sample-'))
      .map((entry) => ({ ...entry, date: entry.date ?? getDateKey() })) as LedgerEntry[];

    return {
      entries,
      monthlyBudget: isLegacy ? 0 : parsed.monthlyBudget,
      monthlySpentBeforeToday: isLegacy ? 0 : parsed.monthlySpentBeforeToday,
      yesterdayTotal: isLegacy ? 0 : parsed.yesterdayTotal,
      themeColor: normalizeThemeColor(parsed.themeColor ?? '') ?? INITIAL_LEDGER.themeColor,
    };
  } catch {
    return null;
  }
}

function getWebStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function loadLedger() {
  return parseStoredLedger(getWebStorage()?.getItem(STORAGE_KEY) ?? null) ?? INITIAL_LEDGER;
}

export function saveLedger(ledger: LedgerState) {
  getWebStorage()?.setItem(STORAGE_KEY, JSON.stringify(ledger));
}
