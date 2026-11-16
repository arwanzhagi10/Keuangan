import { useMemo, useState } from "react";
import { Camera, TrendingDown, TrendingUp } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { formatRupiah, formatRupiahShort, getExpenseGroup, getMonthlyCashflowAverage } from "@/lib/finance";

type Scenario = "decrease" | "increase";

function percentage(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

interface Props {
  transactions: Transaction[];
  savings: number;
  receivable: number;
  payable: number;
}

export default function FinancialSnapshot({ transactions, savings, receivable, payable }: Props) {
  const [scenario, setScenario] = useState<Scenario>("decrease");
  const [decreasePercent, setDecreasePercent] = useState("20");
  const [increasePercent, setIncreasePercent] = useState("10");
  const [increaseSavingsPercent, setIncreaseSavingsPercent] = useState("50");

  const average = useMemo(() => getMonthlyCashflowAverage(transactions), [transactions]);
  const totalBalance = transactions.reduce(
    (sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount),
    0,
  );
  const netWorth = totalBalance + savings + receivable - payable;
  const liquidAssets = totalBalance + savings;
  const runwayMonths = average.expenses > 0 ? Math.max(0, netWorth) / average.expenses : null;
  const baselineSavings = Math.max(0, average.income - average.expenses);

  const categories = average.categories.filter(
    (item) => item.category.trim().toLocaleLowerCase("id-ID") !== "tabungan",
  );
  const cutNeeded =
    scenario === "decrease"
      ? Math.max(0, average.expenses + baselineSavings - average.income * (1 - percentage(decreasePercent) / 100))
      : 0;
  let remainingCut = cutNeeded;
  const cutPlan = categories
    .filter((item) => ["Keinginan", "Lainnya"].includes(getExpenseGroup(item.category)))
    .sort((a, b) => {
      const priority = { Keinginan: 0, Lainnya: 1, Kebutuhan: 2, Tabungan: 3 };
      return priority[getExpenseGroup(a.category)] - priority[getExpenseGroup(b.category)] || b.amount - a.amount;
    })
    .map((item) => {
      const maxReduction = item.amount * (getExpenseGroup(item.category) === "Keinginan" ? 0.5 : 0.25);
      const cut = Math.min(maxReduction, remainingCut);
      remainingCut -= cut;
      return { ...item, cut, remaining: item.amount - cut };
    })
    .filter((item) => item.cut > 0);
  const expenseAfterCuts = average.expenses - cutPlan.reduce((sum, item) => sum + item.cut, 0);
  const incomeAfterDecrease = average.income * (1 - percentage(decreasePercent) / 100);
  const savingsAfterDecrease = incomeAfterDecrease - expenseAfterCuts;
  const decreaseDeficit = Math.max(0, -savingsAfterDecrease);

  const increaseAmount = average.income * (percentage(increasePercent) / 100);
  const additionalSavings = increaseAmount * (percentage(increaseSavingsPercent) / 100);
  const additionalSpending = increaseAmount - additionalSavings;
  const savingsAfterIncrease = baselineSavings + additionalSavings;
  const upgradePlan = categories
    .filter((item) => item.amount > 0)
    .map((item) => ({
      ...item,
      increase: average.expenses > 0 ? additionalSpending * (item.amount / average.expenses) : 0,
    }))
    .filter((item) => item.increase > 0);

  const items = [
    { label: "Saldo Kas", value: totalBalance, color: "text-accent" },
    { label: "Tabungan", value: savings, color: "text-amber-500" },
    { label: "Aset Likuid", value: liquidAssets, color: "text-teal-500" },
    { label: "Piutang", value: receivable, color: "text-blue-500" },
    { label: "Utang", value: -payable, color: "text-red-500" },
    { label: "Aset Bersih", value: netWorth, color: netWorth >= 0 ? "text-accent" : "text-red-500" },
  ];

  return (
    <div className="glass rounded-3xl border border-white/60 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
          <Camera className="h-5 w-5 text-teal-500" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold">Financial Snapshot</h3>
          <p className="text-xs text-muted-foreground">Ringkasan posisi keuangan</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5 last:border-0"
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className={`text-right text-sm font-bold ${item.color}`}>
              {item.value >= 0 ? "" : "−"}{formatRupiah(Math.abs(item.value))}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-accent/5 p-4">
        <p className="text-xs text-muted-foreground">Financial Runway</p>
        <p className="mt-1 font-heading text-2xl font-extrabold text-accent">
          {runwayMonths === null ? "—" : `${runwayMonths.toFixed(1)} bulan`}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Berdasarkan aset bersih dan rata-rata pengeluaran {average.months ? `dari ${average.months} bulan data` : "bulanan"}.
        </p>
      </div>

      <div className="mt-5 border-t border-border/60 pt-5">
        <div className="mb-4">
          <h4 className="font-heading font-bold">Simulasi perubahan income</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Rata-rata income {formatRupiahShort(average.income)} · pengeluaran {formatRupiahShort(average.expenses)}/bulan
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-secondary p-1">
          <button
            type="button"
            aria-pressed={scenario === "decrease"}
            onClick={() => setScenario("decrease")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              scenario === "decrease" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Income turun
          </button>
          <button
            type="button"
            aria-pressed={scenario === "increase"}
            onClick={() => setScenario("increase")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              scenario === "increase" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Income naik
          </button>
        </div>

        {scenario === "decrease" ? (
          <>
            <label className="mb-4 block text-xs font-medium text-muted-foreground">
              Penurunan income
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={decreasePercent}
                  onChange={(event) => setDecreasePercent(event.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
                <span className="text-sm">%</span>
              </span>
            </label>

            <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Income setelah turun</p>
                <p className="mt-1 font-bold">{formatRupiahShort(incomeAfterDecrease)}/bln</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tabungan yang disarankan</p>
                <p className={`mt-1 font-bold ${savingsAfterDecrease >= 0 ? "text-accent" : "text-red-500"}`}>
                  {formatRupiahShort(Math.max(0, savingsAfterDecrease))}/bln
                </p>
              </div>
            </div>

            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
              Prioritas pengurangan: Keinginan, lalu Lainnya
            </p>
            {cutPlan.length > 0 ? (
              <div className="space-y-2">
                {cutPlan.map((item) => (
                  <div key={item.category} className="rounded-xl bg-white/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{item.category}</span>
                      <span className="whitespace-nowrap font-bold text-orange-600">
                        −{formatRupiahShort(item.cut)}/bln
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Rata-rata {formatRupiahShort(item.amount)} → disarankan {formatRupiahShort(item.remaining)}/bulan
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                Tidak ada pengeluaran Keinginan atau Lainnya untuk ditekan. Kebutuhan dipertahankan; penurunan income akan mengurangi tabungan.
              </p>
            )}
            {remainingCut > 0 && (
              <p className="mt-3 rounded-xl bg-orange-500/10 p-3 text-xs text-orange-700">
                Pengurangan dibatasi maksimal 50% untuk Keinginan dan 25% untuk Lainnya agar tidak berlebihan.
                Tabungan berkurang sekitar {formatRupiahShort(Math.min(remainingCut, baselineSavings))}/bulan
                {decreaseDeficit > 0 ? `; masih ada kekurangan ${formatRupiahShort(decreaseDeficit)}/bulan.` : "."}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Kenaikan income
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={increasePercent}
                    onChange={(event) => setIncreasePercent(event.target.value)}
                    className="min-w-0 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <span>%</span>
                </span>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Kenaikan untuk tabungan
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={increaseSavingsPercent}
                    onChange={(event) => setIncreaseSavingsPercent(event.target.value)}
                    className="min-w-0 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <span>%</span>
                </span>
              </label>
            </div>

            <div className="mb-4 rounded-xl bg-accent/5 p-3 text-xs">
              <p className="text-muted-foreground">Total tabungan yang disarankan</p>
              <p className="mt-1 font-bold text-accent">{formatRupiahShort(savingsAfterIncrease)}/bulan</p>
              <p className="mt-1 text-muted-foreground">
                Dari tambahan income {formatRupiahShort(increaseAmount)}/bulan, {formatRupiahShort(additionalSavings)} dialokasikan ke tabungan.
              </p>
            </div>

            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              Budget kategori yang bisa di-upgrade
            </p>
            {upgradePlan.length > 0 ? (
              <div className="space-y-2">
                {upgradePlan.map((item) => (
                  <div key={item.category} className="rounded-xl bg-white/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{item.category}</span>
                      <span className="whitespace-nowrap font-bold text-accent">
                        +{formatRupiahShort(item.increase)}/bln
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Rata-rata {formatRupiahShort(item.amount)} → disarankan {formatRupiahShort(item.amount + item.increase)}/bulan
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                Belum ada kategori pengeluaran untuk dihitung sebagai budget tambahan.
              </p>
            )}
          </>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
          Saran memakai rata-rata {average.months} bulan transaksi. Tabungan adalah sisa income setelah pengeluaran; kategori Tabungan tidak dihitung sebagai konsumsi.
        </p>
      </div>
    </div>
  );
}
