# Project Notes â€” Bellinzone A Credit (banking app)

## Origin
Cloned from `olybless89-cyber/SKY-BORD-BANK` into `olybless89-cyber/bellinzoneacredit.com`.
Rebranded to "Bellinzone A Credit" (account-number prefix `BAC`). Same full banking function, new name.

## Stack
- React 18 + Vite (rolldown-vite) + TypeScript + Tailwind + shadcn/ui
- Supabase (Auth, Postgres, RLS, Edge Functions, Storage)
- Deploy: Railway via Dockerfile (node:22 build â†’ nginx SPA)

## Build / lint
- `npm install --legacy-peer-deps` (pnpm lockfile present but nixpacks/Dockerfile use npm)
- Build: `node_modules/.bin/vite build` (package.json `build`/`dev` are intentionally disabled stubs)
- Type check: `npx tsgo -p tsconfig.check.json`

## Supabase (LIVE backend â€” NEW project, 2026-08-23)
- URL: https://fjrobpbmvjsjgfucoyht.supabase.co (from .env `VITE_SUPABASE_URL`). Old project `qkfhunhqvwzuvrcoevze` is ABANDONED.
- Anon key in .env `VITE_SUPABASE_ANON_KEY` (public client key, RLS-protected).
- Migrations 00001â€“00006 APPLIED (user ran SQL in dashboard). `send-email` edge function NOT deployed â€” built-in `messages` mail used instead.
- Admin EXISTS: `admin@skybordbank.com` / PIN `1234` (UID 6531c6a7-2d4a-4a7f-9cc7-58ca2f275d74, role admin). Created via service-role API + `handle_new_user` trigger.
- **RLS gotcha**: an early admin-bootstrap script left a profiles policy with a raw `(SELECT role FROM profiles ...)` subquery â†’ Postgres error 42P17 "infinite recursion" on ALL profile reads (kills login/profile load). Migration `00008_fix_profile_policy_recursion.sql` rewrites all profiles/admin policies to the SECURITY DEFINER `get_my_role()` helper. MUST be applied in SQL Editor.
- `00007_new_project_gapfill.sql` (kyc_submissions, card_requests, audit_logs) and `00008` need manual apply in SQL Editor; then run `NOTIFY pgrst, 'reload schema';`.

## Features (post-rebuild additions)
- Deposit: user deposits funds into own account (deposit txn + balance increment).
- Withdraw: user withdraws from own account (withdrawal txn + balance decrement), balance guard.
- Debit card order: user requests a debit card (new `card_requests` table via migration, RLS).
- Admin add balance: admin credits a user's account (deposit txn + balance increment) from AdminUsers.

## Auth model
- Supabase Auth email+password. Profile auto-created via `handle_new_user` trigger.
- Role gating: `profile.role === 'admin'`. RLS admin policies grant full access.
- Users CANNOT change own role (RLS WITH CHECK on profiles).

## Gotchas
- `package.json` `dev`/`build` scripts are stubs ("Do not use this command"). Use `vite build` directly.
- tsconfig uses `@typescript/native-preview` (tsgo). `npx tsc` may not be the checker; use `tsgo`.
- index.html had `lang="zh-CN"` â€” fixed to `en`.

## Current State (2026-08-23)
- App pointed at NEW Supabase project `fjrobpbmvjsjgfucoyht` (`.env` updated). Old project deprecated.
- Verified on new backend: admin login â†’ dashboard loads; sign-in notification written to `notifications` (bell shows unread).
- AuthContext hardened: `onAuthStateChange` no longer awaits Supabase calls (client-internal lock would deadlock); session+profile hydrate in a deferred handler. Fixes login redirect race on hard refresh.
- 42P17 profile-policy recursion FIXED â€” combined 00007+00008 script applied in SQL Editor (2026-08-23). Admin portal verified working: login â†’ /admin loads (Overview metrics, Transfer Controls, Secure Mail, notification bell).
- All migrations applied (00001â€“00009). Full 3-step transfer chain verified end-to-end in browser (2026-08-23): login PIN â†’ transfer PIN create/verify â†’ admin-issued COT â†’ transfer executed ($25, balance 5000â†’4975, txn recorded).
- Build clean (`vite build`), `tsgo` passes.

## Feature model (added 2026-08-23)
- **Transfers**: full beneficiary form (name, account/IBAN, bank, routing (9-digit ABA), SWIFT for international), 4 methods (internal/ACH/wire/international) with fees + ETA, review screen, 3-step verification: login PIN â†’ transfer PIN â†’ COT code. Details stored in `transactions.metadata` jsonb.
- **Transfer PIN** (`profiles.transfer_pin`, migration 00009): user-managed 4-digit PIN, created inline on first transfer or changed in Profile â†’ Security (verified by login PIN). Must differ from login PIN. Admin can reset in AdminUsers "Security Codes" dialog.
- **COT code** (`profiles.cot_code`, migration 00009): admin-issued per user (AdminUsers â†’ "Issue COT" â†’ generate/save â†’ "Send via Mail" delivers through built-in Secure Mail + notification). Transfer CANNOT complete without it; user sees request-COT prompt when none issued.
- **Transfer blocks**: per-user `profiles.transfers_blocked` flag + global `site_settings.transfers_blocked` (admin toggle in AdminOverview "Transfer Controls" card; per-user button in AdminUsers). Checked in `transferFunds` + Transfer page UI.
- **Built-in mail** (`messages` table): user page `/dashboard/messages` (compose goes to all admins via `public_profiles` view), admin page `/admin/messages` (recipient picker + broadcast-to-all; `/admin/messages?to=<userId>` preselects). No external email provider.
- **Notifications** (`notifications` table): bell (`NotificationBell`) in DashboardLayout + AdminLayout headers, 20s polling. Fired on: sign-in, deposit, withdrawal, transfer sent/received, admin credit, card status change, new message, transfer block/unblock. All notification writes are best-effort and silently no-op if the table is missing.
- `send-email` edge function calls removed from Transfer/AdminUsers (function was never deployed, 404).

## Deployment Blockers (need user action)
1. **Apply migrations 00007 + 00008** in the NEW project's Supabase Dashboard â†’ SQL Editor (paste file contents; run 00007 then 00008), then run `NOTIFY pgrst, 'reload schema';`. Without 00008 the app cannot read profiles (42P17 recursion) and admin portal is unreachable.
2. **Railway env vars**: ensure the Railway project has `VITE_SUPABASE_URL=https://fjrobpbmvjsjgfucoyht.supabase.co` + the NEW anon key (from `.env`). Pushing to GitHub `main` auto-deploys if Railway is connected to the repo.

## Test Credentials (live Supabase, new project)
- Admin: `admin@skybordbank.com` / PIN `1234`
- (No test user on the new project yet â€” register via /register)

## Update (2026-08-23b) â€” KYC + login PIN fixes
- **KYC fixed end-to-end**: live `kyc_documents` table has both `notes` AND `admin_notes` columns (drift from migration 00001 â€” has no `doc_type`). AdminKYC now writes `notes` (not admin_notes), shows ID images via `storage.createSignedUrl` (bucket `kyc_documents` is PRIVATE â€” raw paths never render as img src). KycDocument type: `admin_notes` removed.
- **Profile page**: real KYC status (latest kyc_documents row, replaces hardcoded "Pending Review") + KYC submit/resubmit card (ID type + front/back upload â†’ insert kyc_documents) + functional Change Login PIN form (current PIN gate, 4-digit, confirm).
- **Admin PIN management**: Security Codes dialog (Issue COT) now has 3 sections â€” COT code, transfer PIN reset, login PIN reset (`setUserLoginPin` in api.ts, notifies user).
- Verified live: KYC pendingâ†’approved (admin notified, profile Verified), user PIN change 1234â†’4321, admin reset back to 1234.

## Update (2026-08-23c) â€” COT removed, admin user deletion, registration hardening

- **COT code fully removed** from transfer flow (Transfer stage type/JSX), admin Security Codes dialog, Profile security section, api.ts (`generateCotCode`/`setUserCotCode` deleted), and Profile type. Transfers now require login PIN â†’ transfer PIN only.
- **Admin Delete User**: `adminDeleteUser` rpc in api.ts + red Delete button on Users page (type DELETE to confirm; blocks self/admin deletion; cascades auth.users â†’ profiles â†’ all data; storage objects cleaned explicitly). Backed by **migration 00010** `admin_delete_user(uuid)` security-definer function â€” needs to be pasted in the SQL Editor; UI degrades gracefully with a "migration 00010 not applied" toast.
- **Registration bug (no KYC/account)**: root cause found â€” Supabase "Confirm email" still ON â†’ `signUp` returns no session â†’ RLS silently blocks profile/bank_account/KYC writes. Register.tsx now detects the no-session case (warning toast) and surfaces KYC insert errors with fallback guidance. **User must disable Supabase Auth â†’ Providers â†’ Email â†’ "Confirm email"** for registration to fully work; the `authData.user &&` guard also fixes the broken redirect to pages.dev confusion.
- Users list action column now wraps (flex-wrap) so all 6 buttons fit.

## Update (2026-08-23d) — Email verification removed entirely
- **Migration 00011** `auto_confirm_email.sql`: `on_auth_user_created_auto_confirm` trigger (AFTER INSERT on auth.users) sets `email_confirmed_at = now()` for every new user + backfills existing unconfirmed users. Apply in SQL Editor, then `NOTIFY pgrst, 'reload schema';`. With this, signup/login never depend on a confirmation email even if the Supabase "Confirm email" toggle stays ON. Also disable the toggle (Auth → Providers → Email) to stop confirmation emails being sent.
- **Register.tsx**: `emailRedirectTo` and the no-session warning block removed. After `signUp`, if no session was returned it immediately calls `signInWithPassword` (works once 00011 is applied), then creates profile/account/KYC and navigates straight to `/dashboard` (auto-login — no more "go sign in" step). "Email not confirmed" errors get a clear admin-action toast.
- **Login.tsx**: "Email not confirmed" sign-in errors (legacy unconfirmed accounts) now show a clear message pointing at migration 00011.
- Live check: `GET /auth/v1/settings` showed `mailer_autoconfirm: false` (toggle still ON). **Disabling the toggle is REQUIRED, not optional**: with it ON, signUp sends a confirmation email and hard-fails with 429 `over_email_send_rate_limit` once the tiny built-in SMTP quota is hit (user NOT created — verified live). Migration 00011 removes the confirmation *gate* (login works, existing users backfilled); the toggle removes the *email sending* (no 429s, no useless emails). Register.tsx maps both errors to clear admin-action toasts.
- **00011 APPLIED in SQL Editor (2026-08-23)** — auto-confirm trigger + backfill live on `fjrobpbmvjsjgfucoyht`. Remaining manual step: disable Auth → Providers → Email → "Confirm email" toggle (stops confirmation emails / 429 rate-limit).

## Update (2026-08-23e) — KYC-not-showing-in-admin investigation
- **Root cause**: submissions made BEFORE the 00011/deploy fix were silently dropped — old Register flow had no session (Confirm email ON) → RLS blocked the kyc_documents insert → nothing reached the DB. NOT an admin-side bug.
- **Verified live end-to-end (REST, as fresh user + admin)**: signup→instant session ✅, storage upload to kyc_documents bucket ✅, kyc_documents insert (status pending) ✅, admin SELECT sees the pending row ✅. Pipeline fully works post-fix; affected users just resubmit from Profile → Identity Verification.
- AdminKYC now surfaces query errors with a toast (was: silent empty list on error).
- **Migration 00010 NOT live**: `admin_delete_user` rpc returns PGRST202 (not in schema cache) — needs SQL Editor apply + `NOTIFY pgrst, 'reload schema';`. Admin Delete User button won't work until then.
- Storage: no admin DELETE policy on storage.objects (admin delete of KYC files is 403 via REST; security-definer functions bypass this). Orphaned files are harmless.
- **Migration 00010 APPLIED (2026-08-23)** — `admin_delete_user` rpc live; Admin → Users Delete button works (cascades auth.users → all data + KYC storage files; blocks self/admin deletion).
