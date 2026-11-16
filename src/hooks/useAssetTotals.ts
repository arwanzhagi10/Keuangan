import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { normalizeTransactionCategory, type Transaction, type Debt } from "@/lib/finance";

export interface AssetTotals {
  savings: number;
  receivable: number;
  payable: number;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useAssetTotals(): AssetTotals {
  const [savings, setSavings] = useState(0);
  const [receivable, setReceivable] = useState(0);
  const [payable, setPayable] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svRes, dbRes] = await Promise.all([
        supabase.from("savings").select("amount"),
        supabase.from("debts").select("amount, type"),
      ]);
      if (svRes.data) {
        setSavings(svRes.data.reduce((sum, saving) => sum + Number(saving.amount), 0));
      }
      if (dbRes.data) {
        let rec = 0;
        let pay = 0;
        for (const r of dbRes.data as Debt[]) {
          if (r.type === "receivable") rec += r.amount;
          else pay += r.amount;
        }
        setReceivable(rec);
        setPayable(pay);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { savings, receivable, payable, loading, reload: load };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      setTransactions(((data || []) as Transaction[]).map(normalizeTransactionCategory));
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, loading, reload: load, setTransactions };
}
