/*
# Fluid Ledger - Finance Dashboard Schema

Creates the three core tables for the Fluid Ledger personal finance dashboard.

## Tables

1. **transactions** — income and expense records
   - `id` (uuid, primary key)
   - `amount` (numeric, not null) — the transaction amount in IDR
   - `type` (text, not null) — either 'income' or 'expense'
   - `category` (text, not null) — e.g. Makanan, Transport, Tagihan, Gaji, Freelance
   - `description` (text, not null) — short label for the transaction
   - `date` (date, not null) — the date the transaction occurred
   - `created_at` (timestamptz, default now)

2. **savings** — savings account balances
   - `id` (uuid, primary key)
   - `amount` (numeric, not null) — amount saved
   - `description` (text, not null) — label for the savings entry
   - `date` (date, not null) — date of the savings record
   - `created_at` (timestamptz, default now())

3. **debts** — debt records (payable = utang, receivable = piutang)
   - `id` (uuid, primary key)
   - `amount` (numeric, not null) — amount owed or owed-to
   - `type` (text, not null) — either 'payable' (utang) or 'receivable' (piutang)
   - `description` (text, not null) — label for the debt
   - `date` (date, not null) — date of the debt record
   - `created_at` (timestamptz, default now())

## Security

- This is a single-tenant personal finance app with no sign-in screen.
- RLS is enabled on all three tables.
- CRUD grants to `anon` and `authenticated` so the anon-key frontend can read and write.
- Policies allow all CRUD operations for both roles (data is intentionally shared/public).
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);

-- ============================================

CREATE TABLE IF NOT EXISTS savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON savings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_savings" ON savings;
CREATE POLICY "anon_select_savings" ON savings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_savings" ON savings;
CREATE POLICY "anon_insert_savings" ON savings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_savings" ON savings;
CREATE POLICY "anon_update_savings" ON savings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_savings" ON savings;
CREATE POLICY "anon_delete_savings" ON savings FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_savings_date ON savings (date DESC);

-- ============================================

CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('payable', 'receivable')),
  description text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON debts TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_debts" ON debts;
CREATE POLICY "anon_select_debts" ON debts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_debts" ON debts;
CREATE POLICY "anon_insert_debts" ON debts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_debts" ON debts;
CREATE POLICY "anon_update_debts" ON debts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_debts" ON debts;
CREATE POLICY "anon_delete_debts" ON debts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_debts_date ON debts (date DESC);
