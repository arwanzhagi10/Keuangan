import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { formatRupiah, getExpenseGroup, monthKey, monthLabel, type ExpenseGroup } from "@/lib/finance";

const EXPENSE_GROUPS: ExpenseGroup[] = ["Kebutuhan", "Keinginan", "Tabungan", "Lainnya"];

function dateKey(date: string): string {
  return date.slice(0, 10);
}

function formatDayName(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", { weekday: "short" }).replace(".", "").toUpperCase();
}

function formatNet(amount: number): string {
  if (amount > 0) return `+${formatRupiah(amount)}`;
  if (amount < 0) return `−${formatRupiah(Math.abs(amount))}`;
  return formatRupiah(0);
}

interface Props {
  transactions: Transaction[];
  monthlyBudget: number;
}

export default function ActivitySection({ transactions, monthlyBudget }: Props) {
  const monthlySummaries = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number; count: number }>();
    transactions.forEach((transaction) => {
      const key = monthKey(transaction.date);
      const month = totals.get(key) || { income: 0, expense: 0, count: 0 };
      if (transaction.type === "income") month.income += transaction.amount;
      else month.expense += transaction.amount;
      month.count += 1;
      totals.set(key, month);
    });

    return Array.from(totals.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 4)
      .map(([key, month]) => ({ key, label: monthLabel(`${key}-01`), ...month }));
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const availableMonths = useMemo(() => {
    const currentMonth = selectedMonth;
    return Array.from(new Set([currentMonth, ...transactions.map((transaction) => transaction.date.slice(0, 7))]))
      .filter((month) => /^\d{4}-\d{2}$/.test(month))
      .sort((a, b) => b.localeCompare(a));
  }, [selectedMonth, transactions]);

  const dailyActivities = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    transactions.forEach((transaction) => {
      if (transaction.date.slice(0, 7) !== selectedMonth) return;
      const key = dateKey(transaction.date);
      const items = grouped.get(key) || [];
      items.push(transaction);
      grouped.set(key, items);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        transactions: items,
        income: items.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
        expense: items.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
      }));
  }, [selectedMonth, transactions]);

  const monthTotals = useMemo(
    () =>
      dailyActivities.reduce(
        (totals, day) => ({ income: totals.income + day.income, expense: totals.expense + day.expense }),
        { income: 0, expense: 0 },
      ),
    [dailyActivities],
  );

  useEffect(() => {
    setExpandedDate(dailyActivities[0]?.date || null);
  }, [dailyActivities]);

  const currentMonthIndex = availableMonths.indexOf(selectedMonth);
  const hasNewerMonth = currentMonthIndex > 0;
  const hasOlderMonth = currentMonthIndex >= 0 && currentMonthIndex < availableMonths.length - 1;

  return (
    <section id="activity" className="px-5 py-16 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <div className="mb-5">
            <h2 className="font-heading text-xl font-bold">Ringkasan Bulanan</h2>
            <p className="text-sm text-muted-foreground">Ringkasan arus kas dan budget, maksimal empat bulan terakhir</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {monthlySummaries.map((month, index) => {
              const net = month.income - month.expense;
              const budgetPct = Math.min(100, (month.expense / monthlyBudget) * 100);
              return (
                <motion.div
                  key={month.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass rounded-2xl border border-white/60 p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{month.label}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pemasukan</p>
                      <p className="text-sm font-bold text-accent">{formatRupiah(month.income)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pengeluaran</p>
                      <p className="text-sm font-bold text-orange-500">{formatRupiah(month.expense)}</p>
                    </div>
                    <div className="border-t border-border/50 pt-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Selisih</p>
                      <p className={`text-sm font-bold ${net >= 0 ? "text-accent" : "text-red-500"}`}>
                        {net >= 0 ? "+" : "−"}{formatRupiah(Math.abs(net))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Budget · {month.count} transaksi</span>
                      <span>{budgetPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={`h-full rounded-full ${budgetPct > 90 ? "bg-red-500" : "bg-accent"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetPct}%` }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold">Aktivitas Bulanan</h2>
            <p className="text-sm text-muted-foreground">Rincian pemasukan dan pengeluaran per hari</p>
          </div>
        </div>

        <div className="glass rounded-3xl border border-white/60 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-heading font-bold">{monthLabel(`${selectedMonth}-01`)}</h3>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {dailyActivities.length} hari dengan transaksi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Bulan sebelumnya"
                disabled={!hasOlderMonth}
                onClick={() => setSelectedMonth(availableMonths[currentMonthIndex + 1])}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Bulan berikutnya"
                disabled={!hasNewerMonth}
                onClick={() => setSelectedMonth(availableMonths[currentMonthIndex - 1])}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-accent/5 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pemasukan</p>
              <p className="mt-1 break-words text-sm font-bold text-accent">{formatRupiah(monthTotals.income)}</p>
            </div>
            <div className="rounded-2xl bg-orange-500/5 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pengeluaran</p>
              <p className="mt-1 break-words text-sm font-bold text-orange-500">{formatRupiah(monthTotals.expense)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {dailyActivities.map((day) => {
              const expanded = expandedDate === day.date;
              const net = day.income - day.expense;
              const incomeByCategory = new Map<string, Transaction[]>();
              const expensesByGroup = new Map<ExpenseGroup, Map<string, Transaction[]>>();

              day.transactions.forEach((transaction) => {
                if (transaction.type === "income") {
                  const items = incomeByCategory.get(transaction.category) || [];
                  items.push(transaction);
                  incomeByCategory.set(transaction.category, items);
                  return;
                }

                const group = getExpenseGroup(transaction.category);
                const categories = expensesByGroup.get(group) || new Map<string, Transaction[]>();
                const items = categories.get(transaction.category) || [];
                items.push(transaction);
                categories.set(transaction.category, items);
                expensesByGroup.set(group, categories);
              });

              return (
                <div key={day.date} className="overflow-hidden rounded-2xl bg-white/70">
                  <button
                    type="button"
                    onClick={() => setExpandedDate(expanded ? null : day.date)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white"
                  >
                    <span className="flex h-11 w-10 flex-none flex-col items-center justify-center rounded-xl border border-border bg-white">
                      <span className="text-[8px] font-semibold text-muted-foreground">{formatDayName(day.date)}</span>
                      <span className="text-sm font-bold">{Number(day.date.slice(8, 10))}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">{day.transactions.length} transaksi</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {day.transactions.filter((item) => item.type === "expense").length} pengeluaran
                      </span>
                    </span>
                    <span className={`whitespace-nowrap text-xs font-bold ${net >= 0 ? "text-accent" : "text-red-500"}`}>
                      {formatNet(net)}
                    </span>
                    <ChevronDown className={`h-4 w-4 flex-none text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>

                  {expanded && (
                    <div className="space-y-4 border-t border-border/60 px-4 py-4 sm:px-6">
                      {Array.from(incomeByCategory.entries()).map(([category, items]) => (
                        <div key={`income-${category}`}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold uppercase text-muted-foreground">
                            <span>{category}</span>
                            <span className="whitespace-nowrap text-accent">
                              +{formatRupiah(items.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                          <div className="space-y-1 border-l border-border pl-3">
                            {items.map((item) => (
                              <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                                <span className="min-w-0 break-words text-muted-foreground">{item.description || category}</span>
                                <span className="whitespace-nowrap font-medium text-accent">+{formatRupiah(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {EXPENSE_GROUPS.map((group) => {
                        const categories = expensesByGroup.get(group);
                        if (!categories) return null;
                        const total = Array.from(categories.values())
                          .flat()
                          .reduce((sum, item) => sum + item.amount, 0);

                        return (
                          <div key={group}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold uppercase text-muted-foreground">
                              <span>{group}</span>
                              <span className="whitespace-nowrap text-red-500">−{formatRupiah(total)}</span>
                            </div>
                            <div className="space-y-2 border-l border-border pl-3">
                              {Array.from(categories.entries()).map(([category, items]) => (
                                <Fragment key={`${group}-${category}`}>
                                  <p className="text-[10px] font-semibold text-muted-foreground">{category}</p>
                                  {items.map((item) => (
                                    <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                                      <span className="min-w-0 break-words text-muted-foreground">{item.description || category}</span>
                                      <span className="whitespace-nowrap font-medium">−{formatRupiah(item.amount)}</span>
                                    </div>
                                  ))}
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {dailyActivities.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Belum ada transaksi pada bulan ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
