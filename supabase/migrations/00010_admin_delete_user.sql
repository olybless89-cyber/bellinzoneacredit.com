-- 00010: admin_delete_user — lets an admin permanently delete a user and all
-- their data from the client (anon key + admin session), without a service key.
--
-- All app tables cascade from auth.users (profiles → bank_accounts →
-- transactions, notifications, messages, kyc_documents, card_requests,
-- investments), so deleting the auth user removes everything. Storage files
-- in the private kyc_documents bucket are removed explicitly.

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
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

  -- Remove KYC files from storage (paths are '<user_id>/...')
  DELETE FROM storage.objects
  WHERE bucket_id = 'kyc_documents'
    AND (owner = target_user_id OR name LIKE target_user_id::text || '/%');

  -- Cascades to profiles and every dependent table
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
