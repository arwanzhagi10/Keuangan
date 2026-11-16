import { motion } from "framer-motion";
import { PiggyBank, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/finance";

interface Props {
  savings: number;
  receivable: number;
  payable: number;
  net: number;
  loading: boolean;
}

export default function AssetOverview({ savings, receivable, payable, net, loading }: Props) {
  const cards = [
    { label: "Tabungan", value: savings, icon: PiggyBank, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Piutang", value: receivable, icon: ArrowDownLeft, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Utang", value: payable, icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Aset Bersih", value: net, icon: Wallet, color: net >= 0 ? "text-accent" : "text-red-500", bg: "bg-accent/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8"
    >
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 + i * 0.08 }}
          className="glass rounded-2xl p-4 md:p-5 border border-white/60"
        >
          <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
            <c.icon className={`w-4.5 h-4.5 ${c.color}`} />
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-1">{c.label}</p>
          {loading ? (
            <div className="h-7 w-24 bg-muted rounded animate-pulse" />
          ) : (
            <p className={`font-heading font-bold text-lg md:text-xl break-words ${c.color}`}>
              {c.value >= 0 ? "" : "−"}{formatRupiah(Math.abs(c.value))}
            </p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
