import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PiggyBank, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Saving } from "@/lib/finance";
import { formatRupiah } from "@/lib/finance";
import { useToast } from "@/components/ui/use-toast";

interface Props {
  refreshToken?: number;
  onChanged?: () => void | Promise<void>;
}

export default function SavingsPanel({ refreshToken = 0, onChanged }: Props) {
  const { toast } = useToast();
  const [savings, setSavings] = useState<Saving[] | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("savings").select("*").order("date", { ascending: false });
      if (error) throw error;
      setSavings((data || []) as Saving[]);
    } catch {
      setSavings([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const total = (savings || []).reduce((s, r) => s + r.amount, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !description.trim()) return;
    try {
      const { data, error } = await supabase
        .from("savings")
        .insert({ amount: amt, description: description.trim(), date })
        .select()
        .single();
      if (error) throw error;
      setSavings((prev) => [data as Saving, ...(prev || [])]);
      await onChanged?.();
      toast({ title: "Tabungan tersimpan", description: formatRupiah(amt) });
      setAmount("");
      setDescription("");
      setOpen(false);
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("savings").delete().eq("id", id);
      if (error) throw error;
      setSavings((prev) => (prev || []).filter((s) => s.id !== id));
      await onChanged?.();
      toast({ title: "Tabungan dihapus" });
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  return (
    <section id="savings" className="px-5 md:px-10 py-16 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">Tabungan</h2>
            <p className="text-sm text-muted-foreground">Total: {formatRupiah(total)}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 glass rounded-xl px-4 py-2 text-sm border border-white/60 hover:border-accent transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(savings || []).map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5 border border-white/60 group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-amber-500" />
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className={`font-bold text-lg mt-3 ${s.amount < 0 ? "text-red-500" : "text-accent"}`}>
              {s.amount < 0 ? `−${formatRupiah(Math.abs(s.amount))}` : formatRupiah(s.amount)}
            </p>
            <p className="text-sm font-medium mt-1">{s.description}</p>
            <p className="text-xs text-muted-foreground mt-1">{new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          </motion.div>
        ))}
        {savings && savings.length === 0 && (
          <div className="col-span-full glass rounded-2xl p-8 border border-white/60 text-center text-muted-foreground text-sm">
            Belum ada tabungan. Klik "Tambah" untuk menambahkan.
          </div>
        )}
        {savings === null && (
          <div className="col-span-full glass rounded-2xl p-8 border border-white/60 text-center text-muted-foreground text-sm">
            Memuat...
          </div>
        )}
      </div>

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
                  <h3 className="font-heading font-bold text-lg">Tambah Tabungan</h3>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Jumlah (Rp)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required autoFocus
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm border border-white/60 focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Deskripsi</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="cth. Maybank Berjangka" required
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm border border-white/60 focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Tanggal</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm border border-white/60 focus:outline-none focus:border-accent" />
                  </div>
                  <motion.button type="submit" whileTap={{ scale: 0.97 }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold rounded-xl py-3 text-sm">
                    Simpan
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
