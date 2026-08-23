-- 00009: Transfer PIN (user-managed 4-digit) + COT code (admin-issued)
-- Both are required, in addition to the login PIN, to complete a transfer.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transfer_pin text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cot_code text;

SELECT pg_notify('pgrst', 'reload schema');
