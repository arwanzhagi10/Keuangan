import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { getRunningBalance, formatRupiahShort, monthLabel } from "@/lib/finance";

const CATEGORY_FILTERS = ["Belanja", "Freelance", "Gaji", "Hiburan", "Hutang", "Keinginan", "Investasi", "Kesehatan", "Keluarga", "Peliharaan", "Piutang", "Lainnya", "Makanan", "Tabungan", "Tagihan", "Transport"];
const PERIOD_FILTERS = [
  { label: "7 Hari", value: 7 },
  { label: "30 Hari", value: 30 },
  { label: "90 Hari", value: 90 },
  { label: "Semua", value: null },
] as const;

type Period = (typeof PERIOD_FILTERS)[number]["value"];

export default function WealthWave({ transactions }: { transactions: Transaction[] }) {
  const [category, setCategory] = useState("Semua");
  const [period, setPeriod] = useState<Period>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const periodStart = period === null ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() - period + 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : periodStart;
    const end = toDate ? new Date(`${toDate}T23:59:59`) : period === null ? null : periodEnd;

    return transactions.filter((transaction) => {
      const date = new Date(`${transaction.date}T12:00:00`);
      const matchesCategory = category === "Semua" || transaction.category === category;
      const matchesStart = !start || date >= start;
      const matchesEnd = !end || date <= end;
      return matchesCategory && matchesStart && matchesEnd;
    });
  }, [transactions, category, period, fromDate, toDate]);

  const points = useMemo(() => {
    const running = getRunningBalance(filteredTransactions);
    if (running.length === 0) return null;

    const w = 800;
    const h = 240;
    const pad = { top: 20, right: 10, bottom: 30, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const balances = running.map((point) => point.balance);
    const minBal = Math.min(...balances, 0);
    const maxBal = Math.max(...balances, 0);
    const range = maxBal - minBal || 1;
    const coords = running.map((point, index) => {
      const x = pad.left + (index / Math.max(running.length - 1, 1)) * chartW;
      const y = pad.top + chartH - ((point.balance - minBal) / range) * chartH;
      return { x, y, ...point };
    });
    const linePath = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${pad.top + chartH} L ${coords[0].x.toFixed(1)} ${pad.top + chartH} Z`;

    return { coords, linePath, areaPath, minBal, maxBal, w, h, pad, chartH };
  }, [filteredTransactions]);

  const resetFilters = () => {
    setCategory("Semua");
    setPeriod(null);
    setFromDate("");
    setToDate("");
  };

  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-wrap gap-2">
          {["Semua", ...CATEGORY_FILTERS].map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                category === item ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-border bg-white/70 text-muted-foreground hover:border-slate-400 hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="mr-1 h-4 w-4 text-muted-foreground" />
            {PERIOD_FILTERS.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setPeriod(item.value);
                  setFromDate("");
                  setToDate("");
                }}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                  period === item.value && !fromDate && !toDate ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-white/70 text-muted-foreground hover:border-slate-400 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPeriod(null); }} className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent" aria-label="Tanggal mulai" />
            <span>–</span>
            <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPeriod(null); }} className="rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent" aria-label="Tanggal akhir" />
            {(category !== "Semua" || period !== null || fromDate || toDate) && (
              <button onClick={resetFilters} className="ml-1 text-xs font-semibold text-accent hover:underline">Reset</button>
            )}
          </div>
        </div>
      </div>

      {!points ? (
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
          Tidak ada transaksi pada filter ini
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${points.w} ${points.h}`} className="min-w-[600px] w-full" style={{ height: 240 }}>
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const y = points.pad.top + points.chartH * tick;
              const value = points.maxBal - (points.maxBal - points.minBal) * tick;
              return (
                <g key={tick}>
                  <line x1={points.pad.left} y1={y} x2={points.w - points.pad.right} y2={y} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="3 3" />
                  <text x={points.pad.left - 5} y={y + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatRupiahShort(value)}</text>
                </g>
              );
            })}
            {points.minBal < 0 && <line x1={points.pad.left} y1={points.pad.top + points.chartH - ((0 - points.minBal) / (points.maxBal - points.minBal || 1)) * points.chartH} x2={points.w - points.pad.right} y2={points.pad.top + points.chartH - ((0 - points.minBal) / (points.maxBal - points.minBal || 1)) * points.chartH} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />}
            <motion.path d={points.areaPath} fill="url(#waveGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }} />
            <motion.path d={points.linePath} fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
            <motion.circle cx={points.coords[points.coords.length - 1].x} cy={points.coords[points.coords.length - 1].y} r="4" fill="#14b8a6" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1 }} />
            <text x={points.coords[0].x} y={points.h - 5} textAnchor="start" className="fill-muted-foreground text-[10px]">{monthLabel(points.coords[0].date)}</text>
            {points.coords.length > 1 && <text x={points.coords[points.coords.length - 1].x} y={points.h - 5} textAnchor="end" className="fill-muted-foreground text-[10px]">{monthLabel(points.coords[points.coords.length - 1].date)}</text>}
          </svg>
        </div>
      )}
    </div>
  );
}
