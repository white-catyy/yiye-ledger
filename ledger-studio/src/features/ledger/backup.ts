import { normalizeThemeColor } from '@/constants/theme';

import {
  ACCOUNT_LIMIT,
  DEFAULT_ACCOUNT,
  CATEGORY_BY_ID,
  CUSTOM_CATEGORY_LIMIT,
  getDateKey,
  isEntryType,
  isValidTime,
  sanitizeCustomCategories,
  sanitizeLedgerAccounts,
  sanitizeLedgerTransfers,
  sortEntries,
  type CustomCategory,
  type LedgerAccount,
  type LedgerAccountId,
  type LedgerEntry,
  type LedgerState,
  type LedgerTransfer,
} from './model';

export type LedgerBackupV1 = {
  format: 'yiye-ledger-backup';
  version: 1;
  exportedAt: string;
  data: Omit<
    LedgerState,
    'customCategories' | 'entries' | 'accounts' | 'transfers' | 'defaultAccountId'
  > & {
    entries: Array<Omit<LedgerEntry, 'type' | 'accountId'>>;
  };
};

export type LedgerBackup = {
  format: 'yiye-ledger-backup';
  version: 3;
  exportedAt: string;
  data: LedgerState;
};

export type BackupParseResult =
  | { ok: true; backup: LedgerBackup }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseCustomCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return { ok: false as const, error: '备份缺少自定义分类数据' };
  }
  const categories = sanitizeCustomCategories(value);
  if (
    categories.length !== value.length ||
    categories.length > CUSTOM_CATEGORY_LIMIT
  ) {
    return { ok: false as const, error: '备份中的自定义分类内容无效' };
  }

  const names = new Set<string>();
  for (const category of categories) {
    const key = `${category.type}:${category.name.toLocaleLowerCase()}`;
    if (names.has(key)) {
      return { ok: false as const, error: '备份中存在同类型重名分类' };
    }
    names.add(key);
    const builtinDuplicate = Object.values(CATEGORY_BY_ID).some(
      (builtin) =>
        builtin.id !== 'other' &&
        builtin.type === category.type &&
        builtin.label.toLocaleLowerCase() === category.name.toLocaleLowerCase()
    );
    if (builtinDuplicate) {
      return { ok: false as const, error: '备份中的自定义分类与内置分类重名' };
    }
  }
  return { ok: true as const, categories };
}

export function createLedgerBackup(ledger: LedgerState): LedgerBackup {
  return {
    format: 'yiye-ledger-backup',
    version: 3,
    exportedAt: new Date().toISOString(),
    data: {
      ...ledger,
      entries: ledger.entries.map((entry) => ({ ...entry })),
      transfers: ledger.transfers.map((transfer) => ({ ...transfer })),
      accounts: ledger.accounts.map((account) => ({ ...account })),
      customCategories: ledger.customCategories.map((category) => ({
        ...category,
      })),
    },
  };
}

export function serializeLedgerBackup(ledger: LedgerState) {
  return JSON.stringify(createLedgerBackup(ledger), null, 2);
}

export function getBackupFilename(date = new Date()) {
  return `yiye-ledger-backup-${getDateKey(date)}.json`;
}

export function parseLedgerBackup(content: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, error: '文件不是有效的 JSON 格式' };
  }

  if (!isRecord(parsed) || parsed.format !== 'yiye-ledger-backup') {
    return { ok: false, error: '这不是一页账备份文件' };
  }
  if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) {
    return { ok: false, error: '备份版本不受支持，请更新 App 后重试' };
  }
  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt))) {
    return { ok: false, error: '备份缺少有效的导出时间' };
  }
  if (!isRecord(parsed.data)) {
    return { ok: false, error: '备份缺少账本数据' };
  }

  const version = parsed.version;
  const data = parsed.data;
  if (
    !Array.isArray(data.entries) ||
    !isNonNegativeNumber(data.monthlyBudget) ||
    !isNonNegativeNumber(data.monthlySpentBeforeToday) ||
    !isNonNegativeNumber(data.yesterdayTotal)
  ) {
    return { ok: false, error: '备份中的预算或汇总数据不完整' };
  }

  const themeColor = normalizeThemeColor(String(data.themeColor ?? ''));
  if (!themeColor) {
    return { ok: false, error: '备份中的主题颜色无效' };
  }

  const customCategoryResult =
    version === 1
      ? { ok: true as const, categories: [] as CustomCategory[] }
      : parseCustomCategories(data.customCategories);
  if (!customCategoryResult.ok) {
    return customCategoryResult;
  }

  let accounts: LedgerAccount[];
  if (version === 3) {
    if (!Array.isArray(data.accounts)) {
      return { ok: false, error: '备份缺少资金账户数据' };
    }
    accounts = sanitizeLedgerAccounts(data.accounts);
    if (
      accounts.length !== data.accounts.length ||
      accounts.length === 0 ||
      accounts.length > ACCOUNT_LIMIT
    ) {
      return { ok: false, error: '备份中的资金账户内容无效' };
    }
  } else {
    accounts = [{ ...DEFAULT_ACCOUNT }];
  }

  const accountIds = new Set<string>(
    accounts.map((account) => account.id)
  );
  if (
    version === 3 &&
    !accountIds.has(String(data.defaultAccountId ?? ''))
  ) {
    return { ok: false, error: '备份中的默认账户无效' };
  }
  const defaultAccountId = accountIds.has(String(data.defaultAccountId ?? ''))
    ? (data.defaultAccountId as LedgerAccountId)
    : accounts[0].id;

  const customCategoryById = new Map<string, CustomCategory>(
    customCategoryResult.categories.map((category) => [category.id, category])
  );
  const entryIds = new Set<string>();
  const entries: LedgerEntry[] = [];
  for (const candidate of data.entries) {
    if (!isRecord(candidate)) {
      return { ok: false, error: '备份包含无效的流水记录' };
    }

    const entryType = version === 1 ? 'expense' : candidate.type;
    const categoryId =
      typeof candidate.categoryId === 'string' ? candidate.categoryId : '';
    const category =
      CATEGORY_BY_ID[categoryId] ?? customCategoryById.get(categoryId);
    const amount = candidate.amount;
    const date = String(candidate.date ?? '');
    const accountId =
      version === 3
        ? String(candidate.accountId ?? '')
        : defaultAccountId;
    if (
      typeof candidate.id !== 'string' ||
      !candidate.id ||
      entryIds.has(candidate.id) ||
      typeof candidate.name !== 'string' ||
      !candidate.name.trim() ||
      typeof candidate.note !== 'string' ||
      !isEntryType(entryType) ||
      !category ||
      category.type !== entryType ||
      !accountIds.has(accountId) ||
      !isNonNegativeNumber(amount) ||
      amount <= 0 ||
      typeof candidate.time !== 'string' ||
      !isValidTime(candidate.time) ||
      !isValidDateKey(date) ||
      date > getDateKey()
    ) {
      return { ok: false, error: '备份中的流水内容无效或包含未来日期' };
    }

    entryIds.add(candidate.id);
    entries.push({
      id: candidate.id,
      type: entryType,
      categoryId: categoryId as LedgerEntry['categoryId'],
      accountId: accountId as LedgerAccountId,
      name: candidate.name.trim(),
      note: candidate.note,
      amount,
      time: candidate.time,
      date,
    });
  }

  let transfers: LedgerTransfer[];
  if (version === 3) {
    if (!Array.isArray(data.transfers)) {
      return { ok: false, error: '备份缺少转账数据' };
    }
    transfers = sanitizeLedgerTransfers(data.transfers, accountIds);
    if (
      transfers.length !== data.transfers.length ||
      transfers.some(
        (transfer) =>
          !isValidDateKey(transfer.date) || transfer.date > getDateKey()
      )
    ) {
      return { ok: false, error: '备份中的转账内容无效' };
    }
  } else {
    transfers = [];
  }

  return {
    ok: true,
    backup: {
      format: 'yiye-ledger-backup',
      version: 3,
      exportedAt: parsed.exportedAt,
      data: {
        entries: sortEntries(entries),
        transfers,
        accounts,
        defaultAccountId,
        customCategories: customCategoryResult.categories,
        monthlyBudget: data.monthlyBudget,
        monthlySpentBeforeToday: data.monthlySpentBeforeToday,
        yesterdayTotal: data.yesterdayTotal,
        themeColor,
      },
    },
  };
}
