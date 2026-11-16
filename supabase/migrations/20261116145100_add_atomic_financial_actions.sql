ALTER TABLE public.savings
  ADD COLUMN IF NOT EXISTS source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE;
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS source_transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_savings_source_transaction ON public.savings (source_transaction_id);
CREATE INDEX IF NOT EXISTS idx_debts_source_transaction ON public.debts (source_transaction_id);

CREATE OR REPLACE FUNCTION public.record_financial_action(
  p_action text,
  p_amount numeric,
  p_category text,
  p_date date,
  p_debt_operation text,
  p_description text
)
RETURNS public.transactions
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
  v_transaction_type text;
  v_transaction_category text;
  v_transaction_description text;
  v_debt_type text;
  v_debt_amount numeric;
  v_current_balance numeric;
  v_savings_balance numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('financial-assets'));

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah harus lebih dari nol.' USING ERRCODE = '22023';
  END IF;
  IF p_date IS NULL OR p_description IS NULL OR btrim(p_description) = '' THEN
    RAISE EXCEPTION 'Tanggal dan deskripsi wajib diisi.' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'withdrawal' THEN
    IF p_category IS DISTINCT FROM 'Tabungan' THEN
      RAISE EXCEPTION 'Kategori penarikan harus Tabungan.' USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(SUM(amount), 0)
      INTO v_savings_balance
      FROM public.savings;
    IF p_amount > v_savings_balance THEN
      RAISE EXCEPTION 'Saldo tabungan tidak mencukupi.' USING ERRCODE = '22023';
    END IF;

    v_transaction_type := 'income';
    v_transaction_category := 'Tabungan';
    v_transaction_description := 'Tarik tabungan - ' || btrim(p_description);
  ELSIF p_action = 'debt' THEN
    IF p_category IS NULL
      OR p_category NOT IN ('Hutang', 'Piutang')
      OR p_debt_operation IS NULL
      OR p_debt_operation NOT IN ('new', 'repayment') THEN
      RAISE EXCEPTION 'Kategori dan jenis transaksi Hutang/Piutang tidak valid.' USING ERRCODE = '22023';
    END IF;

    IF p_category = 'Piutang' THEN
      v_debt_type := 'receivable';
      v_transaction_type := CASE WHEN p_debt_operation = 'new' THEN 'expense' ELSE 'income' END;
    ELSE
      v_debt_type := 'payable';
      v_transaction_type := CASE WHEN p_debt_operation = 'new' THEN 'income' ELSE 'expense' END;
    END IF;
    v_transaction_category := p_category;
    v_transaction_description := btrim(p_description);
    v_debt_amount := CASE WHEN p_debt_operation = 'new' THEN p_amount ELSE -p_amount END;

    IF p_debt_operation = 'repayment' THEN
      SELECT COALESCE(SUM(amount), 0)
        INTO v_current_balance
        FROM public.debts
        WHERE type = v_debt_type;
      IF p_amount > v_current_balance THEN
        RAISE EXCEPTION 'Jumlah pembayaran melebihi saldo yang tersisa.' USING ERRCODE = '22023';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Jenis transaksi khusus tidak valid.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.transactions (amount, type, category, description, date)
  VALUES (p_amount, v_transaction_type, v_transaction_category, v_transaction_description, p_date)
  RETURNING * INTO v_transaction;

  IF p_action = 'withdrawal' THEN
    INSERT INTO public.savings (amount, description, date, source_transaction_id)
    VALUES (-p_amount, 'Tarik tabungan - ' || btrim(p_description), p_date, v_transaction.id);
  ELSE
    INSERT INTO public.debts (amount, type, description, date, source_transaction_id)
    VALUES (v_debt_amount, v_debt_type, btrim(p_description), p_date, v_transaction.id);
  END IF;

  RETURN v_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.record_financial_action(text, numeric, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_financial_action(text, numeric, text, date, text, text) TO anon, authenticated;
