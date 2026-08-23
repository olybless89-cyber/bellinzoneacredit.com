# Project Notes — Bellinzone A Credit (banking app)

## Origin
Cloned from `olybless89-cyber/SKY-BORD-BANK` into `olybless89-cyber/bellinzoneacredit.com`.
Rebranded to "Bellinzone A Credit" (account-number prefix `BAC`). Same full banking function, new name.

## Stack
- React 18 + Vite (rolldown-vite) + TypeScript + Tailwind + shadcn/ui
- Supabase (Auth, Postgres, RLS, Edge Functions, Storage)
- Deploy: Railway via Dockerfile (node:22 build → nginx SPA)

## Build / lint
- `npm install --legacy-peer-deps` (pnpm lockfile present but nixpacks/Dockerfile use npm)
- Build: `node_modules/.bin/vite build` (package.json `build`/`dev` are intentionally disabled stubs)
- Type check: `npx tsgo -p tsconfig.check.json`

## Supabase (LIVE backend — NEW project, 2026-08-23)
- URL: https://fjrobpbmvjsjgfucoyht.supabase.co (from .env `VITE_SUPABASE_URL`). Old project `qkfhunhqvwzuvrcoevze` is ABANDONED.
- Anon key in .env `VITE_SUPABASE_ANON_KEY` (public client key, RLS-protected).
- Migrations 00001–00006 APPLIED (user ran SQL in dashboard). `send-email` edge function NOT deployed — built-in `messages` mail used instead.
- Admin EXISTS: `admin@skybordbank.com` / PIN `1234` (UID 6531c6a7-2d4a-4a7f-9cc7-58ca2f275d74, role admin). Created via service-role API + `handle_new_user` trigger.
- **RLS gotcha**: an early admin-bootstrap script left a profiles policy with a raw `(SELECT role FROM profiles ...)` subquery → Postgres error 42P17 "infinite recursion" on ALL profile reads (kills login/profile load). Migration `00008_fix_profile_policy_recursion.sql` rewrites all profiles/admin policies to the SECURITY DEFINER `get_my_role()` helper. MUST be applied in SQL Editor.
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
- index.html had `lang="zh-CN"` — fixed to `en`.

## Current State (2026-08-23)
- App pointed at NEW Supabase project `fjrobpbmvjsjgfucoyht` (`.env` updated). Old project deprecated.
- Verified on new backend: admin login → dashboard loads; sign-in notification written to `notifications` (bell shows unread).
- AuthContext hardened: `onAuthStateChange` no longer awaits Supabase calls (client-internal lock would deadlock); session+profile hydrate in a deferred handler. Fixes login redirect race on hard refresh.
- 42P17 profile-policy recursion FIXED — combined 00007+00008 script applied in SQL Editor (2026-08-23). Admin portal verified working: login → /admin loads (Overview metrics, Transfer Controls, Secure Mail, notification bell).
- All migrations applied (00001–00008). All tables return 200 on REST API.
- Build clean (`vite build`), `tsgo` passes.

## Feature model (added 2026-08-23)
- **Transfers**: full beneficiary form (name, account/IBAN, bank, routing (9-digit ABA), SWIFT for international), 4 methods (internal/ACH/wire/international) with fees + ETA, review screen, login-PIN verification only (NO COT code, NO separate transfer PIN). Details stored in `transactions.metadata` jsonb (works without migration).
- **Transfer blocks**: per-user `profiles.transfers_blocked` flag + global `site_settings.transfers_blocked` (admin toggle in AdminOverview "Transfer Controls" card; per-user button in AdminUsers). Checked in `transferFunds` + Transfer page UI.
- **Built-in mail** (`messages` table): user page `/dashboard/messages` (compose goes to all admins via `public_profiles` view), admin page `/admin/messages` (recipient picker + broadcast-to-all; `/admin/messages?to=<userId>` preselects). No external email provider.
- **Notifications** (`notifications` table): bell (`NotificationBell`) in DashboardLayout + AdminLayout headers, 20s polling. Fired on: sign-in, deposit, withdrawal, transfer sent/received, admin credit, card status change, new message, transfer block/unblock. All notification writes are best-effort and silently no-op if the table is missing.
- `send-email` edge function calls removed from Transfer/AdminUsers (function was never deployed, 404).

## Deployment Blockers (need user action)
1. **Apply migrations 00007 + 00008** in the NEW project's Supabase Dashboard → SQL Editor (paste file contents; run 00007 then 00008), then run `NOTIFY pgrst, 'reload schema';`. Without 00008 the app cannot read profiles (42P17 recursion) and admin portal is unreachable.
2. **Railway env vars**: ensure the Railway project has `VITE_SUPABASE_URL=https://fjrobpbmvjsjgfucoyht.supabase.co` + the NEW anon key (from `.env`). Pushing to GitHub `main` auto-deploys if Railway is connected to the repo.

## Test Credentials (live Supabase, new project)
- Admin: `admin@skybordbank.com` / PIN `1234`
- (No test user on the new project yet — register via /register)
