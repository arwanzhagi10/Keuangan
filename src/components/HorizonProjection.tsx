import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Telescope } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { formatRupiah, formatRupiahShort, getMonthlyCashflowAverage } from "@/lib/finance";

interface Props {
  transactions: Transaction[];
  savings: number;
  receivable: number;
  payable: number;
}

interface ProjectionPoint {
  years: number;
  age: number;
  amount: number;
}

function boundedNumber(value: string, maximum: number): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(maximum, Math.max(0, parsed));
}

function projectAssets(startingAssets: number, monthlySaving: number, annualIncrease: number, years: number): number {
  let total = startingAssets;
  const yearlySaving = monthlySaving * 12;
  for (let year = 0; year < years; year += 1) {
    total += yearlySaving * Math.pow(1 + annualIncrease / 100, year);
  }
  return total;
}

export default function HorizonProjection({ transactions, savings, receivable, payable }: Props) {
  const [currentAge, setCurrentAge] = useState("29");
  const [targetAge, setTargetAge] = useState("50");
  const [annualIncrease, setAnnualIncrease] = useState("5");

  const average = useMemo(() => getMonthlyCashflowAverage(transactions), [transactions]);
  const totalBalance = transactions.reduce(
    (sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount),
    0,
  );
  const currentAssets = totalBalance + savings + receivable - payable;
  const ageNow = boundedNumber(currentAge, 120);
  const ageTarget = boundedNumber(targetAge, 120);
  const years = Math.max(0, ageTarget - ageNow);
  const yearlyIncrease = boundedNumber(annualIncrease, 100);
  const suggestedMonthlySaving = Math.max(0, average.income - average.expenses);
  const projectedAssets = projectAssets(currentAssets, suggestedMonthlySaving, yearlyIncrease, years);
  const inflationAdjustedAssets = projectedAssets / Math.pow(1.05, years);

  const points = useMemo<ProjectionPoint[]>(() => {
    if (years <= 0) return [];
    const marks = Array.from(new Set([0, Math.round(years * 0.25), Math.round(years * 0.5), Math.round(years * 0.75), years])).sort(
      (a, b) => a - b,
    );
    return marks.map((pointYears) => ({
      years: pointYears,
      age: ageNow + pointYears,
      amount: projectAssets(currentAssets, suggestedMonthlySaving, yearlyIncrease, pointYears),
    }));
  }, [ageNow, currentAssets, suggestedMonthlySaving, years, yearlyIncrease]);

  const chart = useMemo(() => {
    const w = 800;
    const h = 280;
    const pad = { top: 30, right: 20, bottom: 50, left: 70 };
    const chartWidth = w - pad.left - pad.right;
    const chartHeight = h - pad.top - pad.bottom;
    const values = points.map((point) => point.amount);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const range = maxValue - minValue || 1;
    const coords = points.map((point, index) => ({
      ...point,
      x: pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth,
      y: pad.top + chartHeight - ((point.amount - minValue) / range) * chartHeight,
    }));
    return { w, h, pad, chartWidth, chartHeight, minValue, maxValue, coords };
  }, [points]);

  const linePath = chart.coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    chart.coords.length > 0
      ? `${linePath} L ${chart.coords[chart.coords.length - 1].x} ${chart.pad.top + chart.chartHeight} L ${chart.coords[0].x} ${chart.pad.top + chart.chartHeight} Z`
      : "";

  const assets = [
    { label: "Saldo kas", amount: totalBalance },
    { label: "Tabungan", amount: savings },
    { label: "Piutang", amount: receivable },
    { label: "Utang", amount: -payable },
  ];

  return (
    <section id="horizon" className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-20">
      <div className="mb-10 text-center">
        <div className="glass mb-4 inline-flex items-center gap-2 rounded-full border border-white/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Telescope className="h-3.5 w-3.5 text-accent" />
          Horizon Projection
        </div>
        <h2 className="mb-3 font-heading text-3xl font-extrabold md:text-5xl">Proyeksi Masa Depan</h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Proyeksi aset bersih dari saldo, tabungan, piutang, utang, dan saran tabungan berdasarkan rata-rata income serta pengeluaran.
        </p>
      </div>

      <div className="glass rounded-3xl border border-white/60 p-4 sm:p-6 md:p-8">
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-muted-foreground">
            Umur sekarang
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="120"
                value={currentAge}
                onChange={(event) => setCurrentAge(event.target.value)}
                className="min-w-0 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <span>tahun</span>
            </span>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Target umur
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="120"
                value={targetAge}
                onChange={(event) => setTargetAge(event.target.value)}
                className="min-w-0 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <span>tahun</span>
            </span>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Kenaikan tabungan per tahun
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={annualIncrease}
                onChange={(event) => setAnnualIncrease(event.target.value)}
                className="min-w-0 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
              />
              <span>%</span>
            </span>
          </label>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.label} className="rounded-xl bg-muted/30 p-3">
              <p className="text-[10px] text-muted-foreground">{asset.label}</p>
              <p className={`mt-1 break-words text-xs font-bold ${asset.amount < 0 ? "text-red-500" : ""}`}>
                {asset.amount < 0 ? "−" : ""}{formatRupiah(Math.abs(asset.amount))}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-accent/5 p-4">
            <p className="text-xs text-muted-foreground">Aset bersih sekarang</p>
            <p className="mt-1 break-words font-bold text-accent">{formatRupiah(currentAssets)}</p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">Rata-rata income / bulan</p>
            <p className="mt-1 break-words font-bold">{formatRupiah(average.income)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Rata-rata pengeluaran: {formatRupiah(average.expenses)}
            </p>
          </div>
          <div className="rounded-2xl bg-teal-500/10 p-4">
            <p className="text-xs text-muted-foreground">Saran tabungan / bulan</p>
            <p className="mt-1 break-words font-bold text-teal-700">{formatRupiah(suggestedMonthlySaving)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Rata-rata dari {average.months} bulan transaksi
            </p>
          </div>
        </div>

        {years > 0 ? (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                <p className="text-xs text-muted-foreground">Proyeksi nominal pada umur {ageTarget}</p>
                <p className="mt-1 break-words font-heading text-2xl font-extrabold text-accent">
                  {formatRupiah(projectedAssets)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Daya beli setara uang sekarang (inflasi 5%)</p>
                <p className="mt-1 break-words font-heading text-xl font-bold">
                  {formatRupiah(inflationAdjustedAssets)}
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="w-full min-w-[500px]" style={{ height: 280 }}>
                <defs>
                  <linearGradient id="horizonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                  const y = chart.pad.top + chart.chartHeight * tick;
                  const value = chart.maxValue - (chart.maxValue - chart.minValue) * tick;
                  return (
                    <g key={tick}>
                      <line
                        x1={chart.pad.left}
                        y1={y}
                        x2={chart.w - chart.pad.right}
                        y2={y}
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="0.5"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={chart.pad.left - 5}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-muted-foreground text-[10px]"
                      >
                        {formatRupiahShort(value)}
                      </text>
                    </g>
                  );
                })}
                {areaPath && <motion.path d={areaPath} fill="url(#horizonGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
                {linePath && (
                  <motion.path
                    d={linePath}
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2 }}
                  />
                )}
                {chart.coords.map((point) => (
                  <g key={point.years}>
                    <motion.circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      fill="#14b8a6"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                    />
                    <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-foreground text-[10px] font-bold">
                      {formatRupiahShort(point.amount)}
                    </text>
                    <text x={point.x} y={chart.h - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                      Usia {point.age}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-orange-500/10 p-3 text-sm text-orange-700">
            Umur target harus lebih besar dari umur sekarang.
          </p>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Proyeksi mengasumsikan tabungan bulanan sebesar rata-rata income dikurangi pengeluaran, lalu jumlah setoran naik {yearlyIncrease}% setiap tahun.
          Tidak menghitung hasil investasi. Nilai daya beli memakai inflasi 5% per tahun.
        </p>
      </div>
    </section>
  );
}
