-- 00008: Fix "infinite recursion detected in policy for relation profiles" (42P17).
-- The new project has a leftover profiles policy whose USING clause selects
-- directly from public.profiles (added by an early admin-bootstrap script).
-- Postgres evaluates policies with OR semantics, so even though the SECURITY
-- DEFINER get_user_role() policy is safe, the raw subquery policy recurses
-- for every query. Rewrite ALL profiles policies to use get_my_role()
-- (SECURITY DEFINER, no RLS loop) and drop any recursive duplicates.

-- Ensure the safe helper exists (idempotent)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

-- Drop every existing policy on profiles, then recreate the correct set.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM public.get_my_role()::public.user_role);

-- Same class of bug can exist on other tables whose admin policies use a raw
-- "(SELECT role FROM profiles ...)" subquery. That pattern does NOT recurse
-- (profiles SELECT policies allow it), but normalise them to get_my_role()
-- for consistency and to avoid RLS evaluation of profiles on every check.
DO $$
DECLARE t text; pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['bank_accounts','transactions','kyc_documents','investments','contact_messages','newsletter_subscribers','card_requests','kyc_submissions','audit_logs'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname LIKE 'admin%' LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      END LOOP;
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.get_my_role() = ''admin'') WITH CHECK (public.get_my_role() = ''admin'')',
        t || '_admin_all', t);
    END IF;
  END LOOP;
END $$;
