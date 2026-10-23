export type EntryType = 'expense' | 'income';

export type BuiltinCategoryId =
  | 'meal'
  | 'drink'
  | 'transport'
  | 'shopping'
  | 'study'
  | 'entertainment'
  | 'living'
  | 'other'
  | 'salary'
  | 'parttime'
  | 'scholarship'
  | 'gift'
  | 'reimbursement'
  | 'refund';

export type CategoryId = BuiltinCategoryId | `custom-${string}`;

export type LedgerEntry = {
  id: string;
  type: EntryType;
  categoryId: CategoryId;
  name: string;
  note: string;
  amount: number;
  time: string;
  date: string;
};

export type LedgerState = {
  entries: LedgerEntry[];
  customCategories: CustomCategory[];
  monthlyBudget: number;
  monthlySpentBeforeToday: number;
  yesterdayTotal: number;
  themeColor: string;
};

export type CustomCategoryIconId =
  | 'food'
  | 'coffee'
  | 'transport'
  | 'shopping'
  | 'study'
  | 'entertainment'
  | 'home'
  | 'pet'
  | 'travel'
  | 'fitness'
  | 'health'
  | 'gift'
  | 'work'
  | 'education'
  | 'game'
  | 'camera';

export type CustomCategoryIcon = {
  id: CustomCategoryIconId;
  label: string;
  sf: string;
  material: string;
};

export type CustomCategory = {
  id: `custom-${string}`;
  type: EntryType;
  name: string;
  icon: CustomCategoryIconId;
  color: string;
};

export type CategoryDefinition = {
  id: string;
  type: EntryType;
  label: string;
  sf: string;
  material: string;
  tint: string;
  ink: string;
};

export const CUSTOM_CATEGORY_LIMIT = 20;
export const CUSTOM_CATEGORY_NAME_LIMIT = 12;

export const CUSTOM_CATEGORY_ICONS: CustomCategoryIcon[] = [
  { id: 'food', label: '餐饮', sf: 'fork.knife', material: 'restaurant' },
  {
    id: 'coffee',
    label: '咖啡',
    sf: 'cup.and.saucer.fill',
    material: 'local-cafe',
  },
  { id: 'transport', label: '交通', sf: 'bus.fill', material: 'directions-bus' },
  {
    id: 'shopping',
    label: '购物',
    sf: 'bag.fill',
    material: 'shopping-bag',
  },
  {
    id: 'study',
    label: '学习',
    sf: 'book.closed.fill',
    material: 'menu-book',
  },
  { id: 'entertainment', label: '娱乐', sf: 'film.fill', material: 'movie' },
  { id: 'home', label: '居家', sf: 'house.fill', material: 'home' },
  { id: 'pet', label: '宠物', sf: 'pawprint.fill', material: 'pets' },
  { id: 'travel', label: '旅行', sf: 'airplane', material: 'flight' },
  {
    id: 'fitness',
    label: '运动',
    sf: 'figure.run',
    material: 'fitness-center',
  },
  {
    id: 'health',
    label: '健康',
    sf: 'cross.case.fill',
    material: 'medical-services',
  },
  { id: 'gift', label: '礼物', sf: 'gift.fill', material: 'card-giftcard' },
  { id: 'work', label: '工作', sf: 'briefcase.fill', material: 'work' },
  {
    id: 'education',
    label: '学业',
    sf: 'graduationcap.fill',
    material: 'school',
  },
  {
    id: 'game',
    label: '游戏',
    sf: 'gamecontroller.fill',
    material: 'sports-esports',
  },
  {
    id: 'camera',
    label: '摄影',
    sf: 'camera.fill',
    material: 'photo-camera',
  },
];

export const CUSTOM_CATEGORY_COLORS = [
  '#397A99',
  '#4B7F9D',
  '#5B9A7B',
  '#6A8F5D',
  '#C9975A',
  '#C47A8A',
  '#8B7BC1',
  '#6B79B8',
] as const;

export const BUILTIN_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'meal',
    type: 'expense',
    label: '餐饮',
    sf: 'fork.knife',
    material: 'restaurant',
    tint: '#DCEFF9',
    ink: '#397A99',
  },
  {
    id: 'drink',
    type: 'expense',
    label: '饮品',
    sf: 'cup.and.saucer.fill',
    material: 'local-cafe',
    tint: '#D4EAF7',
    ink: '#2F7899',
  },
  {
    id: 'transport',
    type: 'expense',
    label: '交通',
    sf: 'bus.fill',
    material: 'directions-bus',
    tint: '#E0F0FA',
    ink: '#4B7F9D',
  },
  {
    id: 'shopping',
    type: 'expense',
    label: '购物',
    sf: 'bag.fill',
    material: 'shopping-bag',
    tint: '#E6F3FB',
    ink: '#4D829C',
  },
  {
    id: 'study',
    type: 'expense',
    label: '学习',
    sf: 'book.closed.fill',
    material: 'menu-book',
    tint: '#E7F2F7',
    ink: '#5D8191',
  },
  {
    id: 'entertainment',
    type: 'expense',
    label: '娱乐',
    sf: 'film.fill',
    material: 'movie',
    tint: '#E1EEFA',
    ink: '#507A9C',
  },
  {
    id: 'living',
    type: 'expense',
    label: '生活',
    sf: 'house.fill',
    material: 'home',
    tint: '#DDF1F3',
    ink: '#427F85',
  },
];

export const BUILTIN_INCOME_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'salary',
    type: 'income',
    label: '工资',
    sf: 'banknote.fill',
    material: 'payments',
    tint: '#E4F3EC',
    ink: '#4E856C',
  },
  {
    id: 'parttime',
    type: 'income',
    label: '兼职',
    sf: 'briefcase.fill',
    material: 'work-outline',
    tint: '#E6F0F7',
    ink: '#557F9A',
  },
  {
    id: 'scholarship',
    type: 'income',
    label: '奖学金',
    sf: 'graduationcap.fill',
    material: 'school',
    tint: '#EEF3D9',
    ink: '#6E8350',
  },
  {
    id: 'gift',
    type: 'income',
    label: '红包',
    sf: 'gift.fill',
    material: 'redeem',
    tint: '#F8E9E6',
    ink: '#A96861',
  },
  {
    id: 'reimbursement',
    type: 'income',
    label: '报销',
    sf: 'doc.text.fill',
    material: 'receipt-long',
    tint: '#E9EEF8',
    ink: '#657CB1',
  },
  {
    id: 'refund',
    type: 'income',
    label: '退款',
    sf: 'arrow.uturn.backward.circle.fill',
    material: 'currency-exchange',
    tint: '#DEF1F1',
    ink: '#4B8588',
  },
];

export const LEGACY_OTHER_CATEGORY: CategoryDefinition = {
  id: 'other',
  type: 'expense',
  label: '其他',
  sf: 'ellipsis',
  material: 'more-horiz',
  tint: '#EDF4F8',
  ink: '#647F8D',
};

export const CATEGORY_BY_ID: Record<string, CategoryDefinition> = Object.fromEntries(
  [
    ...BUILTIN_EXPENSE_CATEGORIES,
    ...BUILTIN_INCOME_CATEGORIES,
    LEGACY_OTHER_CATEGORY,
  ].map((category) => [category.id, category])
);

export const INITIAL_LEDGER: LedgerState = {
  customCategories: [],
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

export type EntrySummary = {
  count: number;
  expense: number;
  income: number;
  net: number;
};

export function summarizeEntries(entries: LedgerEntry[]): EntrySummary {
  let expense = 0;
  let income = 0;
  for (const entry of entries) {
    if (entry.type === 'income') {
      income += entry.amount;
    } else {
      expense += entry.amount;
    }
  }
  return {
    count: entries.length,
    expense,
    income,
    net: income - expense,
  };
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

export function createCustomCategoryId() {
  return `custom-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}` as const;
}

export function isEntryType(value: unknown): value is EntryType {
  return value === 'expense' || value === 'income';
}

export function isCustomCategoryIcon(
  value: unknown
): value is CustomCategoryIconId {
  return (
    typeof value === 'string' &&
    CUSTOM_CATEGORY_ICONS.some((icon) => icon.id === value)
  );
}

export function isCustomCategoryColor(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    CUSTOM_CATEGORY_COLORS.includes(value as (typeof CUSTOM_CATEGORY_COLORS)[number])
  );
}

export function getCustomCategoryIcon(iconId: string) {
  return (
    CUSTOM_CATEGORY_ICONS.find((icon) => icon.id === iconId) ??
    CUSTOM_CATEGORY_ICONS[0]
  );
}

export function customCategoryToDefinition(
  category: CustomCategory
): CategoryDefinition {
  const icon = getCustomCategoryIcon(category.icon);
  return {
    id: category.id,
    type: category.type,
    label: category.name,
    sf: icon.sf,
    material: icon.material,
    tint: `${category.color}20`,
    ink: category.color,
  };
}

export function getCategoriesForType(
  customCategories: CustomCategory[],
  type: EntryType
) {
  const builtins =
    type === 'income' ? BUILTIN_INCOME_CATEGORIES : BUILTIN_EXPENSE_CATEGORIES;
  return [
    ...builtins,
    ...customCategories
      .filter((category) => category.type === type)
      .map(customCategoryToDefinition),
  ];
}

export function resolveCategory(
  customCategories: CustomCategory[],
  categoryId: string
) {
  return (
    CATEGORY_BY_ID[categoryId] ??
    customCategories
      .map(customCategoryToDefinition)
      .find((category) => category.id === categoryId) ??
    LEGACY_OTHER_CATEGORY
  );
}

export function sanitizeCustomCategories(value: unknown): CustomCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = new Set<string>();
  return value
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return [];
      }
      const category = candidate as Record<string, unknown>;
      const id = typeof category.id === 'string' ? category.id : '';
      const name = typeof category.name === 'string' ? category.name.trim() : '';
      if (
        !/^custom-[a-z0-9-]+$/.test(id) ||
        ids.has(id) ||
        !isEntryType(category.type) ||
        !name ||
        name.length > CUSTOM_CATEGORY_NAME_LIMIT ||
        !isCustomCategoryIcon(category.icon) ||
        !isCustomCategoryColor(category.color)
      ) {
        return [];
      }
      ids.add(id);
      return [
        {
          id: id as `custom-${string}`,
          type: category.type,
          name,
          icon: category.icon,
          color: category.color,
        } satisfies CustomCategory,
      ];
    })
    .slice(0, CUSTOM_CATEGORY_LIMIT);
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
