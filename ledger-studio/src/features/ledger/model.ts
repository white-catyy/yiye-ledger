export type CategoryId =
  | 'meal'
  | 'drink'
  | 'transport'
  | 'shopping'
  | 'study'
  | 'entertainment'
  | 'living'
  | 'other';

export type LedgerEntry = {
  id: string;
  categoryId: CategoryId;
  name: string;
  note: string;
  amount: number;
  time: string;
  date: string;
};

export type LedgerState = {
  entries: LedgerEntry[];
  monthlyBudget: number;
  monthlySpentBeforeToday: number;
  yesterdayTotal: number;
  themeColor: string;
};

export type CategoryDefinition = {
  id: CategoryId;
  label: string;
  sf: string;
  material: string;
  tint: string;
  ink: string;
};

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'meal',
    label: '餐饮',
    sf: 'fork.knife',
    material: 'restaurant',
    tint: '#DCEFF9',
    ink: '#397A99',
  },
  {
    id: 'drink',
    label: '饮品',
    sf: 'cup.and.saucer.fill',
    material: 'local-cafe',
    tint: '#D4EAF7',
    ink: '#2F7899',
  },
  {
    id: 'transport',
    label: '交通',
    sf: 'bus.fill',
    material: 'directions-bus',
    tint: '#E0F0FA',
    ink: '#4B7F9D',
  },
  {
    id: 'shopping',
    label: '购物',
    sf: 'bag.fill',
    material: 'shopping-bag',
    tint: '#E6F3FB',
    ink: '#4D829C',
  },
  {
    id: 'study',
    label: '学习',
    sf: 'book.closed.fill',
    material: 'menu-book',
    tint: '#E7F2F7',
    ink: '#5D8191',
  },
  {
    id: 'entertainment',
    label: '娱乐',
    sf: 'film.fill',
    material: 'movie',
    tint: '#E1EEFA',
    ink: '#507A9C',
  },
  {
    id: 'living',
    label: '生活',
    sf: 'house.fill',
    material: 'home',
    tint: '#DDF1F3',
    ink: '#427F85',
  },
  {
    id: 'other',
    label: '其他',
    sf: 'ellipsis',
    material: 'more-horiz',
    tint: '#EDF4F8',
    ink: '#647F8D',
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
) as Record<CategoryId, CategoryDefinition>;

export const INITIAL_LEDGER: LedgerState = {
  monthlyBudget: 0,
  monthlySpentBeforeToday: 0,
  yesterdayTotal: 0,
  themeColor: '#4C9FC4',
  entries: [],
};

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

const entryDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

export function formatMoney(value: number) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatToday(date = new Date()) {
  return dateFormatter.format(date);
}

export function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function sortEntries(entries: LedgerEntry[]) {
  return [...entries].sort((a, b) => {
    const dateComparison = a.date.localeCompare(b.date);
    return dateComparison !== 0 ? dateComparison : a.time.localeCompare(b.time);
  });
}

export function sumEntries(entries: LedgerEntry[]) {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function normalizeAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = cleaned.split('.');
  const wholePart = whole.slice(0, 6);
  const decimalPart = decimalParts.join('').slice(0, 2);
  return decimalParts.length > 0 ? `${wholePart}.${decimalPart}` : wholePart;
}

export function createEntryId() {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
}

export function formatEntryDate(dateKey: string) {
  const today = getDateKey();
  if (dateKey === today) {
    return '今天';
  }
  const yesterday = getYesterdayKey();
  if (dateKey === yesterday) {
    return '昨天';
  }
  const date = new Date(`${dateKey}T12:00:00`);
  return entryDateFormatter.format(date);
}

export function isSameMonth(dateKey: string, date = new Date()) {
  return dateKey.startsWith(getDateKey(date).slice(0, 7));
}
