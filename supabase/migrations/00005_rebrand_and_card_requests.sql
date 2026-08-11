-- Bellinzone A Credit rebrand + debit card requests
-- 1. New account-number prefix for new accounts (BZC). Existing SKB accounts keep their number.
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS text AS $$
DECLARE
  num text;
BEGIN
  num := 'BZC' || lpad(floor(random() * 10000000000)::bigint::text, 10, '0');
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- 2. Card requests (debit card orders)
CREATE TABLE IF NOT EXISTS public.card_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  card_type text NOT NULL DEFAULT 'debit',
  card_network text NOT NULL DEFAULT 'Visa',
  delivery_address text,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to card_requests" ON public.card_requests FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "Users view own card_requests" ON public.card_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own card_requests" ON public.card_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER card_requests_updated_at
  BEFORE UPDATE ON public.card_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
