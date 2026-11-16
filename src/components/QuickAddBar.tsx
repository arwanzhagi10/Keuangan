import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import type { DebtOperation, FinancialAction, QuickAddInput, Transaction } from "@/lib/finance";

const CATEGORIES = ["Makanan", "Transport", "Tagihan", "Hiburan", "Keinginan", "Belanja", "Kesehatan", "Keluarga", "Peliharaan", "Lainnya", "Tabungan", "Gaji", "Freelance", "Investasi"];
const DEBT_CATEGORIES = ["Hutang", "Piutang"];
const DEFAULT_DESCRIPTIONS: Record<string, string[]> = {
  Makanan: ["Sarapan", "Makan Siang", "Makan Malam", "Jus", "Kopi"],
  Transport: ["bensin suami", "bensin istri", "Transport online", "Parkir"],
  Tagihan: ["Wifi", "Kuota", "Listrik", "BPJS"],
  Hiburan: ["Game", "Netflix", "Cukur"],
  Belanja: ["Pasar", "Belanja bulanan", "Indomaret", "Shopee"],
  Kesehatan: ["Obat", "Berobat", "BPJS", "Vitamin", "Olahraga"],
  Keluarga: ["Keluarga"],
  Peliharaan: ["Pakan Entog", "Bohlam Entog"],
  Hutang: ["Pinjaman diterima", "Pembayaran hutang"],
  Piutang: ["Piutang diberikan", "Pembayaran piutang"],
  Lainnya: ["Sumbangan", "Keperluan rumah"],
  Tabungan: ["Tabungan", "Tabungan Maybank", "Investasi"],
  Gaji: ["Gaji bulan ini", "Gaji"],
  Freelance: ["Freelance", "Project freelance"],
  Investasi: ["Dividen", "Hasil investasi"],
};

interface Props {
  onAdd: (data: QuickAddInput) => void;
  transactions: Transaction[];
}

export default function QuickAddBar({ onAdd, transactions }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FinancialAction>("expense");
  const [debtOperation, setDebtOperation] = useState<DebtOperation>("new");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Makanan");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    transactions
      .filter((transaction) =>
        transaction.category === category
        && (type === "debt" || transaction.type === (type === "withdrawal" ? "income" : type))
        && transaction.description.trim(),
      )
      .forEach((transaction) => counts.set(transaction.description, (counts.get(transaction.description) || 0) + 1));

    const frequent = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value);
    const defaults = DEFAULT_DESCRIPTIONS[category] || [];
    return Array.from(new Set([...frequent, ...defaults])).slice(0, 6);
  }, [category, transactions, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !description.trim()) return;
    onAdd({
      amount: amt,
      action: type,
      category: type === "withdrawal" ? "Tabungan" : category,
      description: description.trim(),
      date,
      ...(type === "debt" ? { debtOperation } : {}),
    });
    setAmount("");
    setDescription("");
    setOpen(false);
  };

  const setAction = (action: FinancialAction) => {
    setType(action);
    if (action === "debt") {
      setCategory("Piutang");
    } else if (action === "withdrawal") {
      setCategory("Tabungan");
    } else if (DEBT_CATEGORIES.includes(category)) {
      setCategory("Makanan");
    }
  };

  const categories = type === "debt" ? DEBT_CATEGORIES : CATEGORIES;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-accent to-teal-400 shadow-lg shadow-accent/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[100dvh] w-full max-w-lg overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            >
              <div className="glass rounded-3xl border border-white/60 p-4 shadow-2xl sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-heading font-bold text-lg">Tambah Transaksi</h3>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAction("expense")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        type === "expense" ? "bg-orange-500 text-white" : "glass border border-white/60 text-muted-foreground"
                      }`}
                    >
                      <ArrowDown className="w-4 h-4" /> Pengeluaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction("income")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        type === "income" ? "bg-teal-500 text-white" : "glass border border-white/60 text-muted-foreground"
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" /> Pemasukan
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction("withdrawal")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        type === "withdrawal" ? "bg-amber-500 text-white" : "glass border border-white/60 text-muted-foreground"
                      }`}
                    >
                      Tarik Tabungan
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction("debt")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        type === "debt" ? "bg-sky-600 text-white" : "glass border border-white/60 text-muted-foreground"
                      }`}
                    >
                      Piutang
                    </button>
                  </div>
                  {type === "withdrawal" && (
                    <p className="text-xs text-muted-foreground">
                      Dicatat sebagai pemasukan dan mengurangi saldo tabungan.
                    </p>
                  )}

                  {/* Amount */}
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Jumlah (Rp)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      required
                      autoFocus
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm border border-white/60 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Category */}
                  {type !== "withdrawal" && (
                    <div>
                      <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Kategori</label>
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCategory(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              category === c ? "bg-accent text-white" : "glass border border-white/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {type === "debt" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {(["new", "repayment"] as const).map((operation) => (
                          <button
                            key={operation}
                            type="button"
                            onClick={() => setDebtOperation(operation)}
                            className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                              debtOperation === operation
                                ? "bg-sky-600 text-white"
                                : "glass border border-white/60 text-muted-foreground"
                            }`}
                          >
                            {operation === "new" ? "Transaksi baru" : "Pembayaran"}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {debtOperation === "new"
                          ? "Piutang baru menjadi pengeluaran; hutang baru diterima menjadi pemasukan."
                          : "Pembayaran piutang menjadi pemasukan; pembayaran hutang menjadi pengeluaran."}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="text-xs text-muted-foreground font-medium">Catatan</label>
                      <span className="text-[10px] text-muted-foreground">Pilihan cepat</span>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setDescription(suggestion)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                            description === suggestion ? "border-accent bg-accent text-white" : "border-white/60 bg-white/60 text-muted-foreground hover:border-accent hover:text-foreground"
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="cth. Makan Siang"
                      required
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm border border-white/60 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Tanggal</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm border border-white/60 focus:outline-none focus:border-accent"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    className="w-full bg-gradient-to-r from-accent to-teal-400 text-white font-semibold rounded-xl py-3 text-sm"
                  >
                    Simpan Transaksi
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
