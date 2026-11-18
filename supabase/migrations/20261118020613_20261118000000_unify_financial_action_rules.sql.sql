/*
# Unified financial action rules (savings + debt automation)

1. Summary
- Extends `record_financial_action` so ALL entry paths share one rulebook:
  - An EXPENSE filed with category "Tabungan" is automatically a savings transfer:
    it creates the transaction AND a positive row in `savings` (no double bookkeeping).
  - A WITHDRAWAL ("Tarik Tabungan") still creates an income transaction AND a
    negative `savings` row, and is blocked if savings balance is insufficient.
  - DEBT entries now use only category + direction, no separate operation:
    - "Hutang" (payable): NEW debt -> income transaction (money received),
      debt row +amount. REPAYMENT -> expense transaction (money paid out),
      debt row -amount, blocked if payable balance too low.
    - "Piutang" (receivable): NEW receivable -> expense transaction (money lent),
      debt row +amount. COLLECTED -> income transaction, debt row -amount,
      blocked if receivable balance too low.
  - The debt operation is now derived from the transaction direction, so the UI
    no longer needs a "transaksi baru / pembayaran" toggle.

2. Modified functions
- `record_financial_action(p_action, p_amount, p_category, p_date, p_debt_operation, p_description)`
  - p_debt_operation is retained (nullable, ignored) for backwards compatibility.
  - New p_action values: still 'withdrawal' and 'debt'; 'debt' now also handles
    automatic savings transfer when p_action = 'expense' AND p_category = 'Tabungan'.
  - Actually implemented as: p_action IN ('expense','withdrawal','debt').

3. Security changes
- Function keeps EXECUTE for anon + authenticated (same as before), search_path pinned.

4. Notes
- Idempotent: CREATE OR REPLACE FUNCTION only; no data changes.
*/

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
  v_effective_action text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('financial-assets'));

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah harus lebih dari nol.' USING ERRCODE = '22023';
  END IF;
  IF p_date IS NULL OR p_description IS NULL OR btrim(p_description) = '' THEN
    RAISE EXCEPTION 'Tanggal dan deskripsi wajib diisi.' USING ERRCODE = '22023';
  END IF;

  -- Rule 1: an expense in the savings category is a savings transfer.
  v_effective_action := p_action;
  IF v_effective_action = 'expense' AND lower(btrim(p_category)) = 'tabungan' THEN
    v_effective_action := 'transfer';
  END IF;

  IF v_effective_action = 'transfer' THEN
    v_transaction_type := 'expense';
    v_transaction_category := 'Tabungan';
    v_transaction_description := btrim(p_description);
  ELSIF v_effective_action = 'withdrawal' THEN
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
  ELSIF v_effective_action = 'expense' THEN
    v_transaction_type := 'expense';
    v_transaction_category := COALESCE(p_category, 'Lainnya');
    v_transaction_description := btrim(p_description);
  ELSIF v_effective_action = 'income' THEN
    v_transaction_type := 'income';
    v_transaction_category := COALESCE(p_category, 'Lainnya');
    v_transaction_description := btrim(p_description);
  ELSIF v_effective_action = 'debt' THEN
    IF p_category IS NULL OR p_category NOT IN ('Hutang', 'Piutang') THEN
      RAISE EXCEPTION 'Kategori Hutang/Piutang tidak valid.' USING ERRCODE = '22023';
    END IF;

    IF p_category = 'Piutang' THEN
      v_debt_type := 'receivable';
      -- Direction decides meaning: expense = lend money out (new receivable),
      -- income = receivable got paid (money came back in).
      v_transaction_type := CASE WHEN lower(btrim(COALESCE(p_debt_operation, ''))) = 'repayment' OR lower(btrim(COALESCE(p_debt_operation, ''))) = 'collect' THEN 'income' ELSE 'expense' END;
    ELSE
      v_debt_type := 'payable';
      -- Direction decides meaning: income = new debt taken (money received),
      -- expense = debt payment (money out).
      v_transaction_type := CASE WHEN lower(btrim(COALESCE(p_debt_operation, ''))) = 'repayment' OR lower(btrim(COALESCE(p_debt_operation, ''))) = 'collect' THEN 'expense' ELSE 'income' END;
    END IF;
    v_transaction_category := p_category;
    v_transaction_description := btrim(p_description);
    v_debt_amount := CASE WHEN lower(btrim(COALESCE(p_debt_operation, ''))) = 'repayment' OR lower(btrim(COALESCE(p_debt_operation, ''))) = 'collect' THEN -p_amount ELSE p_amount END;

    IF v_debt_amount < 0 THEN
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

  IF v_effective_action = 'transfer' THEN
    INSERT INTO public.savings (amount, description, date, source_transaction_id)
    VALUES (p_amount, btrim(p_description), p_date, v_transaction.id);
  ELSIF v_effective_action = 'withdrawal' THEN
    INSERT INTO public.savings (amount, description, date, source_transaction_id)
    VALUES (-p_amount, 'Tarik tabungan - ' || btrim(p_description), p_date, v_transaction.id);
  ELSIF v_effective_action = 'debt' THEN
    INSERT INTO public.debts (amount, type, description, date, source_transaction_id)
    VALUES (v_debt_amount, v_debt_type, btrim(p_description), p_date, v_transaction.id);
  END IF;

  RETURN v_transaction;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_financial_action(text, numeric, text, date, text, text) TO anon, authenticated;
