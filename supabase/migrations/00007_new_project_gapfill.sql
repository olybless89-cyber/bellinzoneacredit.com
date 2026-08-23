-- Gap-fill for the new Supabase project (fjrobpbmvjsjgfucoyht).
-- The new project was bootstrapped with migrations 00001, 00004, and 00006.
-- This script applies only the pieces that are still missing there:
-- audit_log (00003), card_requests (00005), and a schema-cache reload.
-- Safe to run multiple times.

-- 1. Admin audit log (from 00003)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'admin_all_audit_log') THEN
    CREATE POLICY admin_all_audit_log ON public.audit_log FOR ALL TO authenticated
      USING (get_my_role() = 'admin')
      WITH CHECK (get_my_role() = 'admin');
  END IF;
END $$;

-- 2. Card requests / debit card orders (from 00005)
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'card_requests' AND policyname = 'Admin full access to card_requests') THEN
    CREATE POLICY "Admin full access to card_requests" ON public.card_requests FOR ALL TO authenticated
      USING (get_my_role() = 'admin')
      WITH CHECK (get_my_role() = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'card_requests' AND policyname = 'Users view own card_requests') THEN
    CREATE POLICY "Users view own card_requests" ON public.card_requests FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'card_requests' AND policyname = 'Users insert own card_requests') THEN
    CREATE POLICY "Users insert own card_requests" ON public.card_requests FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS card_requests_updated_at ON public.card_requests;
CREATE TRIGGER card_requests_updated_at
  BEFORE UPDATE ON public.card_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Refresh the API schema cache so the new tables appear on the REST API
SELECT pg_notify('pgrst', 'reload schema');
