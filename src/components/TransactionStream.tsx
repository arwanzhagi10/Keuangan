import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { formatRupiah, getCategoryColor } from "@/lib/finance";

const CATEGORY_FILTERS = ["Belanja", "Freelance", "Gaji", "Hiburan", "Hutang", "Keinginan", "Investasi", "Kesehatan", "Keluarga", "Peliharaan", "Piutang", "Lainnya", "Makanan", "Tabungan", "Tagihan", "Transport"];
const PAGE_SIZE = 21;
const PERIOD_FILTERS = [
  { label: "7 Hari", value: 7 },
  { label: "30 Hari", value: 30 },
  { label: "90 Hari", value: 90 },
  { label: "Semua", value: null },
] as const;

type Period = (typeof PERIOD_FILTERS)[number]["value"];

interface Props {
  transactions: Transaction[] | null;
  onDelete: (id: string) => void;
  monthlyBudget: number;
  liquidityImage: string;
}

function cardDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function TransactionStream({ transactions, onDelete }: Props) {
  const [category, setCategory] = useState("Semua Kategori");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [period, setPeriod] = useState<Period>(null);
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);

  const monthOptions = useMemo(() => {
    const values = Array.from(new Set((transactions || []).map((transaction) => transaction.date.slice(0, 7)))).sort().reverse();
    return values;
  }, [transactions]);

  const categoryFilters = useMemo(() => {
    if (type === "all") return CATEGORY_FILTERS;

    return CATEGORY_FILTERS.filter((item) =>
      (transactions || []).some((transaction) => transaction.type === type && transaction.category === item),
    );
  }, [transactions, type]);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = period === null ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() - period + 1);
    const end = period === null ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return (transactions || []).filter((transaction) => {
      const date = new Date(`${transaction.date}T12:00:00`);
      const matchesCategory = category === "Semua Kategori" || transaction.category === category;
      const matchesType = type === "all" || transaction.type === type;
      const matchesMonth = month === "all" || transaction.date.startsWith(month);
      const matchesStart = !start || date >= start;
      const matchesEnd = !end || date <= end;
      return matchesCategory && matchesType && matchesMonth && matchesStart && matchesEnd;
    });
  }, [transactions, category, type, period, month]);

  useEffect(() => {
    setPage(1);
  }, [category, type, period, month]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleTransactions = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageNumbers = Array.from(new Set([1, page - 1, page, page + 1, totalPages].filter((number) => number >= 1 && number <= totalPages))).sort((a, b) => a - b);

  const resetFilters = () => {
    setCategory("Semua Kategori");
    setType("all");
    setPeriod(null);
    setMonth("all");
  };

  return (
    <section id="stream" className="relative overflow-hidden border-y border-border/70 bg-[#f8fafc] py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="relative mx-auto max-w-7xl px-5 md:px-10">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Riwayat Transaksi</h2>
            <p className="mt-2 text-base text-slate-500">Setiap aliran dana, terekam dalam grid visual.</p>
          </div>
          <div className="flex rounded-2xl border border-slate-200 bg-white/80 p-1 shadow-sm">
            {(["all", "income", "expense"] as const).map((item) => (
              <button
                key={item}
                onClick={() => { setType(item); setCategory("Semua Kategori"); }}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${type === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {item === "all" ? "Semua" : item === "income" ? "Masuk" : "Keluar"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {["Semua Kategori", ...categoryFilters].map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${category === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white/80 text-slate-500 hover:border-slate-400 hover:text-slate-900"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-7 flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500">Bulan:</span>
            <select value={month} onChange={(event) => { setMonth(event.target.value); setPeriod(null); }} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 outline-none focus:border-accent">
              <option value="all">Semua Bulan</option>
              {monthOptions.map((value) => <option key={value} value={value}>{new Date(`${value}-01T12:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</option>)}
            </select>
            <span className="ml-1 font-medium text-slate-500">Periode:</span>
            {PERIOD_FILTERS.map((item) => (
              <button key={item.label} onClick={() => { setPeriod(item.value); setMonth("all"); }} className={`rounded-full border px-3 py-1.5 font-medium transition-all ${period === item.value && month === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white/80 text-slate-500 hover:border-slate-400"}`}>
                {item.label}
              </button>
            ))}
            {(category !== "Semua Kategori" || type !== "all" || period !== null || month !== "all") && <button onClick={resetFilters} className="font-semibold text-accent hover:underline">Reset</button>}
          </div>
          <span className="font-medium text-slate-400">{filtered.length} transaksi</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visibleTransactions.map((transaction, index) => {
              const color = getCategoryColor(transaction.category);
              const isIncome = transaction.type === "income";
              return (
                <motion.article key={transaction.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: index * 0.025 }} className="group relative min-h-[128px] rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}18` }}>
                      {isIncome ? <ArrowUpRight className="h-5 w-5" style={{ color }} /> : <ArrowDownRight className="h-5 w-5" style={{ color }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">{transaction.category}</p>
                        <button onClick={() => onDelete(transaction.id)} aria-label={`Hapus ${transaction.description}`} className="text-slate-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <p className="text-xs text-slate-400">{cardDate(transaction.date)}</p>
                    </div>
                  </div>
                  <p className={`mt-4 text-xl font-extrabold tracking-tight ${isIncome ? "text-teal-600" : "text-slate-900"}`}>{isIncome ? "+" : "−"}{formatRupiah(transaction.amount)}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{transaction.description}</p>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        {visibleTransactions.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-14 text-center text-sm text-slate-500">Tidak ada transaksi yang sesuai filter.</div>}

        {filtered.length > 0 && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            {pageNumbers.map((number, index) => (
              <span key={number} className="flex items-center gap-2">
                {index > 0 && pageNumbers[index - 1] !== number - 1 && <span className="text-slate-400">...</span>}
                <button onClick={() => setPage(number)} className={`h-9 min-w-9 rounded-xl px-2 text-xs font-semibold transition-colors ${page === number ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"}`}>{number}</button>
              </span>
            ))}
            <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            <span className="ml-2 text-xs text-slate-400">Halaman {page} dari {totalPages}</span>
          </div>
        )}
      </div>
    </section>
  );
}
