import { useMemo, useState } from "react";
import { HandCoins, TrendingUp } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { formatRupiah, formatRupiahShort, getMonthlyCashflowAverage } from "@/lib/finance";

type TimeUnit = "month" | "year";

interface TimeInputProps {
  label: string;
  value: string;
  unit: TimeUnit;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: TimeUnit) => void;
}

function TimeInput({ label, value, unit, onValueChange, onUnitChange }: TimeInputProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-[10px] text-muted-foreground">bulan / tahun</span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
        />
        <div className="flex flex-none rounded-xl bg-secondary p-1">
          {(["month", "year"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={unit === option}
              onClick={() => onUnitChange(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                unit === option ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {option === "month" ? "Bulan" : "Tahun"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function nonNegativeNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function CanIAfford({
  transactions,
  savings,
  receivable,
  payable,
}: {
  transactions: Transaction[];
  savings: number;
  receivable: number;
  payable: number;
}) {
  const [itemName, setItemName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [purchaseTime, setPurchaseTime] = useState("3");
  const [purchaseUnit, setPurchaseUnit] = useState<TimeUnit>("year");
  const [savingStart, setSavingStart] = useState("0");
  const [savingStartUnit, setSavingStartUnit] = useState<TimeUnit>("month");

  const average = useMemo(() => getMonthlyCashflowAverage(transactions), [transactions]);
  const totalBalance = transactions.reduce(
    (sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount),
    0,
  );
  const netWorth = totalBalance + savings + receivable - payable;

  const price = nonNegativeNumber(priceInput);
  const purchaseMonths = nonNegativeNumber(purchaseTime) * (purchaseUnit === "year" ? 12 : 1);
  const savingStartMonths = nonNegativeNumber(savingStart) * (savingStartUnit === "year" ? 12 : 1);
  const monthsToSave = Math.max(0, purchaseMonths - savingStartMonths);
  const futurePrice = price * Math.pow(1.05, purchaseMonths / 12);
  const requiredMonthlySaving = monthsToSave > 0 ? futurePrice / monthsToSave : null;
  const monthlySurplus = average.income - average.expenses;
  const canReachTarget = requiredMonthlySaving !== null && monthlySurplus >= requiredMonthlySaving;
  const monthsOfRunway = average.expenses > 0 ? Math.max(0, netWorth) / average.expenses : Infinity;

  return (
    <div className="glass rounded-3xl border border-white/60 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
          <HandCoins className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold">Bisa Beli Gak?</h3>
          <p className="text-xs text-muted-foreground">Hitung target pembelian dengan inflasi</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nama barang</label>
          <input
            type="text"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            placeholder="Contoh: HP"
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Harga sekarang (Rp)</label>
          <input
            type="number"
            min="0"
            value={priceInput}
            onChange={(event) => setPriceInput(event.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <TimeInput
          label="Mau beli kapan?"
          value={purchaseTime}
          unit={purchaseUnit}
          onValueChange={setPurchaseTime}
          onUnitChange={setPurchaseUnit}
        />
        <TimeInput
          label="Mulai nabung kapan?"
          value={savingStart}
          unit={savingStartUnit}
          onValueChange={setSavingStart}
          onUnitChange={setSavingStartUnit}
        />
      </div>

      {price > 0 && (
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl bg-muted/40 p-4 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Harga sekarang</span>
              <span className="font-medium">{formatRupiah(price)}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3">
              <span className="text-muted-foreground">Harga saat dibeli</span>
              <span className="font-bold">{formatRupiah(futurePrice)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-accent">
              <TrendingUp className="h-3.5 w-3.5" />
              Tabungan yang dibutuhkan
            </div>
            {requiredMonthlySaving === null ? (
              <p className="mt-2 text-sm font-bold text-orange-500">Waktu menabung harus dimulai sebelum target pembelian.</p>
            ) : (
              <>
                <p className="mt-1 font-heading text-xl font-extrabold">
                  {formatRupiah(requiredMonthlySaving)}<span className="ml-1 text-xs font-medium">/bulan</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Nabung selama {monthsToSave} bulan untuk {itemName.trim() || "barang ini"}.
                  {monthlySurplus >= 0
                    ? ` Rata-rata sisa income Anda ${formatRupiahShort(monthlySurplus)}/bulan.`
                    : ` Pengeluaran rata-rata melebihi income ${formatRupiahShort(Math.abs(monthlySurplus))}/bulan.`}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Inflasi tetap 5% per tahun.</span>
        <span>
          Runway aset bersih: {monthsOfRunway === Infinity ? "—" : `${monthsOfRunway.toFixed(1)} bulan`}
        </span>
      </div>
      {average.months > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Rata-rata income dan pengeluaran berdasarkan {average.months} bulan transaksi terakhir.
        </p>
      )}
      {!canReachTarget && requiredMonthlySaving !== null && price > 0 && (
        <p className="mt-2 text-[11px] font-medium text-orange-600">
          Target tabungan bulanan lebih tinggi dari sisa income rata-rata.
        </p>
      )}
    </div>
  );
}
