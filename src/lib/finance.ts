export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  created_at?: string;
}

export type FinancialAction = "income" | "expense" | "withdrawal" | "debt";
export type DebtOperation = "new" | "repayment";

export interface QuickAddInput {
  amount: number;
  category: string;
  date: string;
  description: string;
  action: FinancialAction;
  debtOperation?: DebtOperation;
}

export type DebtDirection = "out" | "in";

export interface SavingWithCategory extends Saving {
  category: string;
}

export function normalizeTransactionCategory(transaction: Transaction): Transaction {
  if (transaction.type !== "expense" || transaction.category.trim().toLocaleLowerCase("id-ID") !== "lainnya") {
    return transaction;
  }

  const description = transaction.description.trim().toLocaleLowerCase("id-ID");
  if (description === "keluarga") {
    return { ...transaction, category: "Keluarga", description: "Keluarga" };
  }
  if (description === "pakan entog" || description === "bohlam entog") {
    return { ...transaction, category: "Peliharaan" };
  }
  if (description === "olahraga") {
    return { ...transaction, category: "Kesehatan" };
  }
  return transaction;
}

export interface Saving {
  id: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
  created_at?: string;
}

export interface Debt {
  id: string;
  amount: number;
  type: "payable" | "receivable";
  description: string;
  date: string;
  created_at?: string;
}

export type ExpenseGroup = "Kebutuhan" | "Keinginan" | "Tabungan" | "Lainnya";

export interface MonthlyCashflowAverage {
  income: number;
  expenses: number;
  savingsTransfers: number;
  months: number;
  categories: { category: string; amount: number }[];
}

export function getExpenseGroup(category: string): ExpenseGroup {
  const normalized = category.trim().toLocaleLowerCase("id-ID");
  if (normalized === "keinginan") return "Keinginan";
  if (normalized === "tabungan") return "Tabungan";
  if (normalized === "lainnya") return "Lainnya";
  return "Kebutuhan";
}

export const EXPENSE_GROUP_ORDER: ExpenseGroup[] = ["Kebutuhan", "Keinginan", "Tabungan", "Lainnya"];

export const EXPENSE_GROUP_COLORS: Record<ExpenseGroup, string> = {
  Kebutuhan: "#0ea5e9",
  Keinginan: "#ec4899",
  Tabungan: "#f59e0b",
  Lainnya: "#6b7280",
};

export interface MonthlyCategoryBreakdown {
  monthKey: string;
  monthLabel: string;
  income: number;
  expense: number;
  groups: Record<ExpenseGroup, { total: number; categories: { category: string; amount: number; count: number }[] }>;
}

export function getMonthlyCategoryBreakdown(transactions: Transaction[]): MonthlyCategoryBreakdown[] {
  const months = new Map<string, Map<string, { amount: number; count: number }>>();
  const incomeByMonth = new Map<string, number>();

  transactions.forEach((transaction) => {
    const key = monthKey(transaction.date);
    if (transaction.type === "income") {
      incomeByMonth.set(key, (incomeByMonth.get(key) || 0) + transaction.amount);
      return;
    }
    const categories = months.get(key) || new Map<string, { amount: number; count: number }>();
    const existing = categories.get(transaction.category) || { amount: 0, count: 0 };
    existing.amount += transaction.amount;
    existing.count += 1;
    categories.set(transaction.category, existing);
    months.set(key, categories);
  });

  return Array.from(new Set([...incomeByMonth.keys(), ...months.keys()]))
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const categories = months.get(key) || new Map<string, { amount: number; count: number }>();
      const groups = {} as MonthlyCategoryBreakdown["groups"];
      EXPENSE_GROUP_ORDER.forEach((group) => {
        groups[group] = { total: 0, categories: [] };
      });
      let expense = 0;
      Array.from(categories.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .forEach(([category, value]) => {
          const group = getExpenseGroup(category);
          groups[group].total += value.amount;
          groups[group].categories.push({ category, amount: value.amount, count: value.count });
          expense += value.amount;
        });
      return {
        monthKey: key,
        monthLabel: monthLabel(`${key}-01`),
        income: incomeByMonth.get(key) || 0,
        expense,
        groups,
      };
    });
}

export function getMonthlyCashflowAverage(
  transactions: Transaction[],
  windowMonths = 6,
  referenceDate = new Date(),
): MonthlyCashflowAverage {
  const months = Array.from({ length: Math.max(1, windowMonths) }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const monthSet = new Set(months);
  const monthlyTotals = new Map<string, { income: number; categories: Map<string, number>; count: number }>();
  months.forEach((month) => monthlyTotals.set(month, { income: 0, categories: new Map(), count: 0 }));

  transactions.forEach((transaction) => {
    const monthKey = transaction.date.slice(0, 7);
    const totals = monthlyTotals.get(monthKey);
    if (!totals || !monthSet.has(monthKey)) return;
    totals.count += 1;
    if (transaction.type === "income") {
      totals.income += transaction.amount;
      return;
    }

    totals.categories.set(
      transaction.category,
      (totals.categories.get(transaction.category) || 0) + transaction.amount,
    );
  });

  const activeMonths = Array.from(monthlyTotals.values()).filter((month) => month.count > 0);
  if (activeMonths.length === 0) return { income: 0, expenses: 0, savingsTransfers: 0, months: 0, categories: [] };

  const divisor = activeMonths.length;
  const income = activeMonths.reduce((sum, month) => sum + month.income, 0) / divisor;
  const categoryTotals = new Map<string, number>();
  activeMonths.forEach((month) => {
    month.categories.forEach((amount, category) => {
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount / divisor);
    });
  });

  const categories = Array.from(categoryTotals.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const savingsTransfers = categories
    .filter(({ category }) => category.trim().toLocaleLowerCase("id-ID") === "tabungan")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = categories
    .filter(({ category }) => category.trim().toLocaleLowerCase("id-ID") !== "tabungan")
    .reduce((sum, item) => sum + item.amount, 0);

  return { income, expenses, savingsTransfers, months: divisor, categories };
}

export function formatRupiah(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

export function formatRupiahShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return "Rp " + (amount / 1_000_000_000).toFixed(1) + "M";
  if (abs >= 1_000_000) return "Rp " + (amount / 1_000_000).toFixed(1) + "jt";
  if (abs >= 1_000) return "Rp " + (amount / 1_000).toFixed(0) + "rb";
  return "Rp " + Math.round(amount).toLocaleString("id-ID");
}

export function dailySpendingRate(transactions: Transaction[]): { daily: number; monthly: number } {
  if (transactions.length === 0) return { daily: 0, monthly: 0 };
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length === 0) return { daily: 0, monthly: 0 };
  const dates = expenses.map((t) => new Date(t.date).getTime());
  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const days = Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)));
  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const daily = total / days;
  return { daily, monthly: daily * 30 };
}

export interface IncomeDropScenario {
  incomeDropPct: number;
  expenseCuts: { group: ExpenseGroup; original: number; reduced: number }[];
  newMonthlyExpense: number;
  originalMonthlyExpense: number;
  monthlyDeficit: number;
  coveredBySavingsMonths: number;
  survivalMonths: number;
}

// "Best case": expenses shrink with income, cutting discretionary spending first
// (Lainnya -> Keinginan -> Kebutuhan) while savings transfers drop to zero.
export function buildIncomeDropScenarios(transactions: Transaction[]): IncomeDropScenario[] {
  const average = getMonthlyCashflowAverage(transactions);
  if (average.months === 0) return [];

  const savingsGroup = average.categories
    .filter(({ category }) => category.trim().toLocaleLowerCase("id-ID") === "tabungan")
    .reduce((sum, item) => sum + item.amount, 0);
  const otherGroups: ExpenseGroup[] = ["Lainnya", "Keinginan", "Kebutuhan"];
  const groupTotals = new Map<ExpenseGroup, number>();
  otherGroups.forEach((group) => {
    groupTotals.set(
      group,
      average.categories
        .filter(({ category }) => getExpenseGroup(category) === group)
        .reduce((sum, item) => sum + item.amount, 0),
    );
  });

  return [10, 25, 50, 75, 100].map((incomeDropPct) => {
    let deficit = (average.income * incomeDropPct) / 100;
    deficit -= Math.min(savingsGroup, deficit);

    const expenseCuts = otherGroups.map((group) => ({
      group,
      original: groupTotals.get(group) || 0,
      reduced: groupTotals.get(group) || 0,
    }));
    expenseCuts.forEach((cut) => {
      if (deficit <= 0) return;
      const reduction = Math.min(cut.original, deficit);
      cut.reduced = cut.original - reduction;
      deficit -= reduction;
    });

    const newMonthlyExpense = expenseCuts.reduce((sum, cut) => sum + cut.reduced, 0);
    const originalMonthlyExpense = expenseCuts.reduce((sum, cut) => sum + cut.original, 0);
    const monthlyDeficit = Math.max(0, newMonthlyExpense - (average.income * (100 - incomeDropPct)) / 100);

    return {
      incomeDropPct,
      expenseCuts,
      newMonthlyExpense,
      originalMonthlyExpense,
      monthlyDeficit,
      coveredBySavingsMonths: savingsGroup,
      survivalMonths: monthlyDeficit,
    };
  });
}

export function monthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date | string): string {
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function getRunningBalance(transactions: Transaction[]): { date: string; balance: number }[] {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = 0;
  return sorted.map((t) => {
    running += t.type === "income" ? t.amount : -t.amount;
    return { date: t.date, balance: running };
  });
}

export function getSavingsBalanceOverTime(savings: Saving[]): { date: string; balance: number }[] {
  const sorted = [...savings]
    .filter((entry) => entry.amount !== 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = 0;
  return sorted.map((entry) => {
    running += entry.amount;
    return { date: entry.date, balance: running, description: entry.description };
  });
}

export function getCategoryBreakdown(transactions: Transaction[]): { category: string; amount: number; count: number }[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  const map = new Map<string, { amount: number; count: number }>();
  for (const t of expenses) {
    const existing = map.get(t.category) || { amount: 0, count: 0 };
    existing.amount += t.amount;
    existing.count += 1;
    map.set(t.category, existing);
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

export const CATEGORY_COLORS: Record<string, string> = {
  Makanan: "#f97316",
  Transport: "#3b82f6",
  Tagihan: "#ef4444",
  Hiburan: "#a855f7",
  Keinginan: "#ec4899",
  Belanja: "#06b6d4",
  Kesehatan: "#10b981",
  Keluarga: "#e11d48",
  Peliharaan: "#84cc16",
  Hutang: "#ef4444",
  Piutang: "#0ea5e9",
  Lainnya: "#6b7280",
  Tabungan: "#f59e0b",
  Gaji: "#22c55e",
  Freelance: "#14b8a6",
  Investasi: "#8b5cf6",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#6b7280";
}
