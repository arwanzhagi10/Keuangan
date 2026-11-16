import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout";
import WealthWave from "@/components/WealthWave";
import QuickAddBar from "@/components/QuickAddBar";
import TransactionStream from "@/components/TransactionStream";
import HorizonProjection from "@/components/HorizonProjection";
import ExpenseSummary from "@/components/ExpenseSummary";
import ActivitySection from "@/components/ActivitySection";
import SpendingTrend from "@/components/SpendingTrend";
import SavingsPanel from "@/components/SavingsPanel";
import DebtPanel from "@/components/DebtPanel";
import FinancialRunway from "@/components/FinancialRunway";
import CanIAfford from "@/components/CanIAfford";
import FinancialSnapshot from "@/components/afford/FinancialSnapshot";
import AssetOverview from "@/components/AssetOverview";
import PasswordGate from "@/components/PasswordGate";
import { useAssetTotals, useTransactions } from "@/hooks/useAssetTotals";
import { dailySpendingRate, formatRupiah, type QuickAddInput, type Transaction } from "@/lib/finance";

const heroImage = "https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=1600";
const liquidityImage = "https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg?auto=compress&cs=tinysrgb&w=1600";

export default function Dashboard() {
  const { toast } = useToast();
  const { transactions, reload, setTransactions } = useTransactions();
  const { savings, receivable, payable, loading: assetsLoading, reload: reloadAssets } = useAssetTotals();
  const [assetRefreshToken, setAssetRefreshToken] = useState(0);

  const handleAdd = async (data: QuickAddInput) => {
    try {
      let row: Transaction;
      if (data.action === "income" || data.action === "expense") {
        const { data: inserted, error } = await supabase
          .from("transactions")
          .insert({
            amount: data.amount,
            type: data.action,
            category: data.category,
            description: data.description,
            date: data.date,
          })
          .select()
          .single();
        if (error) throw error;
        if (!inserted) throw new Error("Transaksi tidak berhasil dibuat.");
        row = inserted as Transaction;
      } else {
        const { data: inserted, error } = await supabase
          .rpc("record_financial_action", {
            p_action: data.action,
            p_amount: data.amount,
            p_category: data.category,
            p_date: data.date,
            p_debt_operation: data.debtOperation || null,
            p_description: data.description,
          })
          .single();
        if (error) throw error;
        if (!inserted) throw new Error("Transaksi tidak berhasil dibuat.");
        row = inserted as Transaction;
      }

      setTransactions((prev) => [row, ...(prev || [])]);
      if (data.action === "withdrawal" || data.action === "debt") {
        await refreshAssetPanels();
      }
      toast({
        title: "Transaksi tersimpan",
        description: `${data.action === "withdrawal" ? "Tarik tabungan" : data.action === "debt" ? "Hutang/Piutang" : data.action === "income" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(data.amount)}`,
      });
    } catch (error) {
      const description = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Silakan coba lagi.";
      toast({ title: "Gagal menyimpan", description, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions((prev) => (prev || []).filter((t) => t.id !== id));
      await refreshAssetPanels();
      toast({ title: "Transaksi dihapus" });
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const refreshAssetPanels = async () => {
    await reloadAssets();
    setAssetRefreshToken((token) => token + 1);
  };

  const txList = transactions || [];
  const totalBalance = txList.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
  const now = new Date();
  const monthTx = txList.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlyBudget = 3000000;
  const { daily: avgDailySpend, monthly: monthlySpendEstimate } = dailySpendingRate(txList);
  const netWorthTotal = totalBalance + savings + receivable - payable;

  return (
    <PasswordGate>
      <Layout>
        {/* ===== PULSE DASHBOARD ===== */}
        <section id="pulse" className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroImage} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          </div>

          <div className="relative px-5 md:px-10 pt-12 md:pt-20 pb-16 max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/60 text-xs font-medium text-muted-foreground mb-5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Fluid Intelligence Dashboard
              </span>
              <h1 className="text-4xl md:text-6xl font-heading font-extrabold leading-[1.05] mb-4 max-w-3xl">
                Keuangan Anda,
                <br />
                <span className="text-accent">seperti detak nadi.</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-xl">
                Pantau arus kas, catat transaksi, dan proyeksikan masa depan — semua dalam satu tampilan elegan yang berjalan 24/7.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-dark rounded-3xl p-6 text-white">
                <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider mb-3">
                  <Wallet className="w-4 h-4" />
                  Total Saldo
                </div>
                <p className={`text-3xl md:text-2xl lg:text-4xl font-heading font-extrabold tracking-tight leading-none break-words ${totalBalance >= 0 ? "text-accent" : "text-red-400"}`}>
                  {totalBalance >= 0 ? "" : "−"}Rp {Math.abs(totalBalance).toLocaleString("id-ID")}
                </p>
                <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalBalance / Math.max(monthIncome, 1)) * 100)}%` }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-3xl p-6 border border-white/60">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Pemasukan Bulan Ini
                </div>
                <p className="text-3xl md:text-2xl lg:text-3xl font-heading font-extrabold tracking-tight leading-none break-words text-accent">
                  Rp {monthIncome.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{monthTx.filter((t) => t.type === "income").length} transaksi</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-3xl p-6 border border-white/60">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-3">
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                  Pengeluaran Bulan Ini
                </div>
                <p className="text-3xl md:text-2xl lg:text-3xl font-heading font-extrabold tracking-tight leading-none break-words text-orange-500">
                  Rp {monthExpense.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{monthTx.filter((t) => t.type === "expense").length} transaksi</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Estimasi {formatRupiah(monthlySpendEstimate)}/bulan ({formatRupiah(avgDailySpend)}/hari × 30)
                </p>
              </motion.div>
            </div>

            <AssetOverview savings={savings} receivable={receivable} payable={payable} net={netWorthTotal} loading={assetsLoading} />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-3xl p-6 md:p-8 border border-white/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-bold text-lg">Dynamic Wealth Wave</h3>
                  <p className="text-sm text-muted-foreground">Perkembangan saldo dari waktu ke waktu</p>
                </div>
              </div>
              <WealthWave transactions={txList} />
            </motion.div>
          </div>
        </section>

        {/* ===== LIQUIDITY STREAM ===== */}
        <TransactionStream transactions={transactions} onDelete={handleDelete} monthlyBudget={monthlyBudget} liquidityImage={liquidityImage} />

        {/* ===== EXPENSE SUMMARY ===== */}
        <ExpenseSummary transactions={txList} />

        {/* ===== SPENDING TREND ===== */}
        <SpendingTrend transactions={txList} />

        {/* ===== ACTIVITY ===== */}
        <ActivitySection transactions={txList} monthlyBudget={monthlyBudget} />

        {/* ===== SAVINGS ===== */}
        <SavingsPanel refreshToken={assetRefreshToken} onChanged={refreshAssetPanels} />
        <DebtPanel refreshToken={assetRefreshToken} />

        {/* ===== PLANNING ===== */}
        <section id="planning" className="px-5 md:px-10 py-20 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Decision Intelligence
            </span>
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-3">Runway &amp; Keputusan</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">
              Keputusan dihitung dari aset bersih — saldo + tabungan + piutang − utang — dengan estimasi pengeluaran rata-rata harian × 30 hari.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <FinancialRunway transactions={txList} savings={savings} receivable={receivable} payable={payable} />
            <CanIAfford transactions={txList} savings={savings} receivable={receivable} payable={payable} />
            <FinancialSnapshot transactions={txList} savings={savings} receivable={receivable} payable={payable} />
          </div>
        </section>

        {/* ===== HORIZON ===== */}
        <HorizonProjection transactions={txList} savings={savings} receivable={receivable} payable={payable} />

        {/* ===== FOOTER ===== */}
        <footer className="border-t border-border mt-10">
          <div className="px-5 md:px-10 py-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                <Wallet className="w-4 h-4 text-background" />
              </div>
              <span className="font-heading font-bold">Keuangan Arwan Resita</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">Berjalan 24/7 di cloud · Gratis · Tanpa perlu menyalakan PC</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <a href="#pulse" className="hover:text-foreground transition-colors">Pulse</a>
              <a href="#stream" className="hover:text-foreground transition-colors">Stream</a>
              <a href="#summary" className="hover:text-foreground transition-colors">Summary</a>
              <a href="#horizon" className="hover:text-foreground transition-colors">Horizon</a>
            </div>
          </div>
        </footer>

        <QuickAddBar onAdd={handleAdd} transactions={txList} />
      </Layout>
    </PasswordGate>
  );
}
