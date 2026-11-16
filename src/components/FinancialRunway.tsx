import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plane, AlertTriangle } from "lucide-react";
import type { Transaction } from "@/lib/finance";
import { dailySpendingRate, formatRupiah } from "@/lib/finance";

interface Props {
  transactions: Transaction[];
  savings: number;
  receivable: number;
  payable: number;
}

export default function FinancialRunway({ transactions, savings, receivable, payable }: Props) {
  const { daily, monthly } = useMemo(() => dailySpendingRate(transactions), [transactions]);

  const totalBalance = transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  const liquidAssets = totalBalance + savings + receivable - payable;
  const runwayDays = daily > 0 ? Math.floor(liquidAssets / daily) : Infinity;
  const runwayMonths = monthly > 0 ? liquidAssets / monthly : Infinity;

  const getStatus = () => {
    if (runwayMonths === Infinity) return { label: "Stabil", color: "text-accent", bg: "bg-accent/10" };
    if (runwayMonths >= 6) return { label: "Aman", color: "text-teal-500", bg: "bg-teal-500/10" };
    if (runwayMonths >= 3) return { label: "Cukup", color: "text-amber-500", bg: "bg-amber-500/10" };
    if (runwayMonths >= 1) return { label: "Hati-hati", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { label: "Kritis", color: "text-red-500", bg: "bg-red-500/10" };
  };

  const status = getStatus();
  const isFinite = runwayDays !== Infinity;

  return (
    <div className="glass rounded-3xl p-6 border border-white/60">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
          <Plane className={`w-5 h-5 ${status.color}`} />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg">Financial Runway</h3>
          <p className="text-xs text-muted-foreground">Berapa lama aset bertahan</p>
        </div>
      </div>

      <div className="text-center py-6">
        <p className={`text-5xl font-heading font-extrabold ${status.color}`}>
          {isFinite ? runwayMonths.toFixed(1) : "∞"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">bulan</p>
        {isFinite && (
          <p className="text-xs text-muted-foreground mt-1">~{runwayDays.toLocaleString("id-ID")} hari</p>
        )}
      </div>

      <div className={`rounded-xl p-3 ${status.bg} flex items-center gap-2`}>
        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${status.color}`} />
        <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
      </div>

      <div className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Aset Likuid</span>
          <span className="font-medium">{formatRupiah(liquidAssets)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pengeluaran/hari</span>
          <span className="font-medium">{formatRupiah(daily)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pengeluaran/bulan</span>
          <span className="font-medium">{formatRupiah(monthly)}</span>
        </div>
      </div>
    </div>
  );
}
