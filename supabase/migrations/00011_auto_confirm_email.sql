-- 00011: Remove email verification entirely.
-- Every new auth user is confirmed immediately at insert time, so signup and
-- login never depend on a confirmation email — regardless of the Supabase
-- "Confirm email" toggle. (Also disable that toggle in Dashboard →
-- Authentication → Providers → Email to stop confirmation emails being sent.)

create or replace function public.auto_confirm_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  after insert on auth.users
  for each row execute function public.auto_confirm_user_email();

-- Backfill: confirm any existing users still pending confirmation
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
