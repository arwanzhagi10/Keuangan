import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Maximize2, Minimize2, TrendingDown } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { monthLabel } from "@/lib/finance";

type ViewMode = "total" | "daily";

interface MonthColumn {
  key: string;
  label: string;
  fullLabel: string;
  days: number;
}

function formatThousands(amount: number): string {
  if (amount <= 0) return "—";
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(amount / 1000)} rb`;
}

export default function SpendingTrend({ transactions }: { transactions: Transaction[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("total");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());
  const [maximized, setMaximized] = useState(false);

  const { months, categories } = useMemo(() => {
    const now = new Date();
    const monthColumns: MonthColumn[] = Array.from({ length: 3 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 2 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
        fullLabel: monthLabel(date),
        days: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      };
    });
    const validMonths = new Set(monthColumns.map((month) => month.key));
    const totals = new Map<string, Map<string, Map<string, number>>>();

    transactions.forEach((transaction) => {
      const month = transaction.date.slice(0, 7);
      if (transaction.type !== "expense" || !validMonths.has(month)) return;

      const category = transaction.category.trim() || "Lainnya";
      const description = transaction.description.trim() || "Tanpa deskripsi";
      let descriptions = totals.get(category);
      if (!descriptions) {
        descriptions = new Map();
        totals.set(category, descriptions);
      }
      let monthlyAmounts = descriptions.get(description);
      if (!monthlyAmounts) {
        monthlyAmounts = new Map();
        descriptions.set(description, monthlyAmounts);
      }
      monthlyAmounts.set(month, (monthlyAmounts.get(month) || 0) + transaction.amount);
    });

    const categoryRows = Array.from(totals.entries())
      .map(([name, descriptions]) => {
        const descriptionRows = Array.from(descriptions.entries())
          .map(([description, monthlyAmounts]) => {
            const monthlyTotals = Object.fromEntries(
              monthColumns.map((month) => [month.key, monthlyAmounts.get(month.key) || 0]),
            );
            return {
              name: description,
              months: monthlyTotals,
              total: Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0),
            };
          })
          .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"));
        const monthlyTotals = Object.fromEntries(
          monthColumns.map((month) => [
            month.key,
            descriptionRows.reduce((sum, description) => sum + description.months[month.key], 0),
          ]),
        );
        return {
          name,
          months: monthlyTotals,
          total: Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0),
          descriptions: descriptionRows,
        };
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"));

    return { months: monthColumns, categories: categoryRows };
  }, [transactions]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const formatCell = (amount: number, month: MonthColumn) =>
    formatThousands(viewMode === "daily" ? amount / month.days : amount);

  return (
    <section id="trend" className="px-5 py-16 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <TrendingDown className="h-5 w-5 text-orange-500" />
          </div>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">Tren Pengeluaran</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Total pengeluaran per kategori selama 3 bulan terakhir (dalam ribu Rupiah).
          </p>
        </div>

        {maximized && (
          <div
            className="fixed inset-0 z-[59] bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setMaximized(false)}
            aria-hidden="true"
          />
        )}
        <div
          className={
            maximized
              ? "fixed inset-0 z-[60] overflow-y-auto border border-white/60 bg-background p-4 shadow-2xl sm:p-8"
              : "glass rounded-3xl border border-white/60 p-4 md:p-8"
          }
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-secondary p-1 text-xs">
              {([
                { label: "Total", value: "total" },
                { label: "Per Hari", value: "daily" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={viewMode === option.value}
                  onClick={() => setViewMode(option.value)}
                  className={`rounded-full px-4 py-2 font-semibold transition-colors ${
                    viewMode === option.value
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMaximized((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label={maximized ? "Tutup tampilan penuh" : "Maksimalkan tabel"}
            >
              {maximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {maximized ? "Tutup" : "Maksimalkan"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-[10px] sm:text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="w-[30%] py-3 pl-2 text-left font-semibold sm:pl-4" style={{ textAlign: "left" }}>Kategori</th>
                  {months.map((month) => (
                    <th key={month.key} scope="col" title={month.fullLabel} className="px-1 py-3 text-center font-semibold sm:px-3">
                      {month.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const expanded = expandedCategories.has(category.name);
                  return (
                    <Fragment key={category.name}>
                      <tr className="border-b border-border/80">
                        <th scope="row" className="py-2.5 pl-2 text-left font-medium sm:pl-4" style={{ textAlign: "left" }}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(category.name)}
                            aria-expanded={expanded}
                            className="flex items-center justify-start gap-2 rounded-md text-left hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            style={{ justifyContent: "flex-start", textAlign: "left" }}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 flex-none" />
                            ) : (
                              <ChevronRight className="h-4 w-4 flex-none" />
                            )}
                            <span>{category.name}</span>
                          </button>
                        </th>
                        {months.map((month) => (
                          <td key={month.key} className="px-1 py-2.5 text-center tabular-nums sm:px-3">
                            <button
                              type="button"
                              onClick={() => toggleCategory(category.name)}
                              aria-label={`${expanded ? "Tutup" : "Lihat"} rincian ${category.name}, ${month.fullLabel}`}
                              className="whitespace-nowrap rounded px-0.5 py-0.5 text-center hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-1"
                            >
                              {formatCell(category.months[month.key], month)}
                            </button>
                          </td>
                        ))}
                      </tr>
                      {expanded &&
                        category.descriptions.map((description) => (
                          <tr key={`${category.name}-${description.name}`} className="border-b border-border/60 bg-white/40 text-muted-foreground">
                            <th scope="row" className="py-2 pl-8 text-left font-normal sm:pl-10" style={{ textAlign: "left" }}>
                              {description.name}
                            </th>
                            {months.map((month) => (
                              <td key={month.key} className="px-1 py-2 text-center tabular-nums sm:px-3">
                                {formatCell(description.months[month.key], month)}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={months.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                      Belum ada pengeluaran dalam 3 bulan terakhir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {viewMode === "daily"
              ? "Rata-rata harian dihitung dari total bulanan dibagi jumlah hari kalender pada bulan tersebut."
              : "Angka ditampilkan dalam ribuan Rupiah."}{" "}
            Klik kategori atau angkanya untuk membandingkan rincian/deskripsi transaksi per bulan.
          </p>
        </div>
      </div>
    </section>
  );
}
