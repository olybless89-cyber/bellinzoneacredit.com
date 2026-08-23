-- 00012: fix admin_delete_user — direct DELETE on storage.objects is blocked
-- by Supabase's storage.protect_delete trigger ("Direct deletion from storage
-- tables is not allowed. Use the Storage API instead."), which aborted the
-- whole function before the auth.users delete. KYC files are now deleted via
-- storage.delete_object() (not trigger-guarded), then the user row.

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  obj RECORD;
BEGIN
  -- Caller must be an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Admins cannot delete themselves or other admins (prevents lockout)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin accounts cannot be deleted';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Remove KYC files from storage via the storage API helper (direct table
  -- deletes are blocked by storage.protect_delete)
  FOR obj IN
    SELECT name FROM storage.objects
    WHERE bucket_id = 'kyc_documents'
      AND (owner = target_user_id OR name LIKE target_user_id::text || '/%')
  LOOP
    PERFORM storage.delete_object('kyc_documents', obj.name);
  END LOOP;

  -- Cascades to profiles and every dependent table
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
