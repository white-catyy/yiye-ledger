import { normalizeThemeColor } from '@/constants/theme';

import {
  CATEGORY_BY_ID,
  getDateKey,
  isValidTime,
  sortEntries,
  type CategoryId,
  type LedgerEntry,
  type LedgerState,
} from './model';

export type LedgerBackupV1 = {
  format: 'yiye-ledger-backup';
  version: 1;
  exportedAt: string;
  data: LedgerState;
};

export type BackupParseResult =
  | { ok: true; backup: LedgerBackupV1 }
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

export function createLedgerBackup(ledger: LedgerState): LedgerBackupV1 {
  return {
    format: 'yiye-ledger-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      ...ledger,
      entries: ledger.entries.map((entry) => ({ ...entry })),
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
  if (parsed.version !== 1) {
    return { ok: false, error: '备份版本不受支持，请更新 App 后重试' };
  }
  if (typeof parsed.exportedAt !== 'string' || Number.isNaN(Date.parse(parsed.exportedAt))) {
    return { ok: false, error: '备份缺少有效的导出时间' };
  }
  if (!isRecord(parsed.data)) {
    return { ok: false, error: '备份缺少账本数据' };
  }

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

  const ids = new Set<string>();
  const today = getDateKey();
  const entries: LedgerEntry[] = [];
  for (const candidate of data.entries) {
    if (!isRecord(candidate)) {
      return { ok: false, error: '备份包含无效的流水记录' };
    }

    const categoryId = String(candidate.categoryId ?? '') as CategoryId;
    const amount = candidate.amount;
    const date = String(candidate.date ?? '');
    if (
      typeof candidate.id !== 'string' ||
      !candidate.id ||
      ids.has(candidate.id) ||
      typeof candidate.name !== 'string' ||
      !candidate.name.trim() ||
      typeof candidate.note !== 'string' ||
      !CATEGORY_BY_ID[categoryId] ||
      !isNonNegativeNumber(amount) ||
      amount <= 0 ||
      typeof candidate.time !== 'string' ||
      !isValidTime(candidate.time) ||
      !isValidDateKey(date) ||
      date > today
    ) {
      return { ok: false, error: '备份中的流水内容无效或包含未来日期' };
    }

    ids.add(candidate.id);
    entries.push({
      id: candidate.id,
      categoryId,
      name: candidate.name.trim(),
      note: candidate.note,
      amount,
      time: candidate.time,
      date,
    });
  }

  return {
    ok: true,
    backup: {
      format: 'yiye-ledger-backup',
      version: 1,
      exportedAt: parsed.exportedAt,
      data: {
        entries: sortEntries(entries),
        monthlyBudget: data.monthlyBudget,
        monthlySpentBeforeToday: data.monthlySpentBeforeToday,
        yesterdayTotal: data.yesterdayTotal,
        themeColor,
      },
    },
  };
}
