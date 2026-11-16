import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, HandCoins } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Debt } from "@/lib/finance";
import { formatRupiah } from "@/lib/finance";
import { useToast } from "@/components/ui/use-toast";

export default function DebtPanel({ refreshToken = 0 }: { refreshToken?: number }) {
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("debts").select("*").order("date", { ascending: false });
      if (error) throw error;
      setDebts((data || []) as Debt[]);
    } catch (error) {
      const description = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Silakan coba lagi.";
      toast({ title: "Gagal memuat Hutang/Piutang", description, variant: "destructive" });
      setDebts([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const receivable = (debts || [])
    .filter((entry) => entry.type === "receivable")
    .reduce((total, entry) => total + entry.amount, 0);
  const payable = (debts || [])
    .filter((entry) => entry.type === "payable")
    .reduce((total, entry) => total + entry.amount, 0);

  return (
    <section id="debts" className="px-5 md:px-10 py-16 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <HandCoins className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl">Hutang &amp; Piutang</h2>
          <p className="text-sm text-muted-foreground">Piutang: {formatRupiah(receivable)} · Hutang: {formatRupiah(payable)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="glass rounded-2xl p-5 border border-white/60 flex items-center gap-3">
          <ArrowDownLeft className="w-5 h-5 text-teal-600" />
          <div>
            <p className="text-xs text-muted-foreground">Piutang tersisa</p>
            <p className="font-bold text-lg">{formatRupiah(receivable)}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/60 flex items-center gap-3">
          <ArrowUpRight className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-xs text-muted-foreground">Hutang tersisa</p>
            <p className="font-bold text-lg">{formatRupiah(payable)}</p>
          </div>
        </div>
      </div>

      {debts === null ? (
        <div className="glass rounded-2xl p-8 border border-white/60 text-center text-muted-foreground text-sm">
          Memuat...
        </div>
      ) : debts.length === 0 ? (
        <div className="glass rounded-2xl p-8 border border-white/60 text-center text-muted-foreground text-sm">
          Belum ada transaksi Hutang atau Piutang.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map((entry) => {
            const isReceivable = entry.type === "receivable";
            const isIncrease = entry.amount >= 0;
            const label = isReceivable
              ? (isIncrease ? "Piutang baru" : "Pembayaran piutang")
              : (isIncrease ? "Hutang baru" : "Pembayaran hutang");
            return (
              <div key={entry.id} className="glass rounded-2xl p-5 border border-white/60">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <span className={`font-bold ${isIncrease ? "text-accent" : "text-orange-600"}`}>
                    {isIncrease ? "+" : "−"}{formatRupiah(Math.abs(entry.amount))}
                  </span>
                </div>
                <p className="font-medium mt-3">{entry.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(`${entry.date}T12:00:00`).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
