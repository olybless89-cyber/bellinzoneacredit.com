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

## Supabase (LIVE backend — shared with source project)
- URL: https://qkfhunhqvwzuvrcoevze.supabase.co (from .env `VITE_SUPABASE_URL`)
- Anon key in .env `VITE_SUPABASE_ANON_KEY` (public client key, RLS-protected)
- All 4 migrations ALREADY applied. `send-email` edge function NOT deployed (404) — email sends fail silently (.catch'd).
- Seeded admin EXISTS: `admin@skybordbank.com` / password `skb_1234` (UID 87a50ec5-5112-4b21-b5c2-2104e4bc3f40, role admin).
- Existing test user: `milljohnson75@gmail.com` (UID 2c0822d0-cd51-4afc-9129-67c72d62866e), account SKB3870327296, balance 0.
- No service_role key available — cannot run new SQL migrations or seed via service role. New migrations are additive (functions/policies) and would need manual apply in Supabase dashboard OR are purely client-side.

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
- Rebranded + new features built, verified end-to-end against live Supabase, and pushed to `bellinzoneacredit.com` main.
- Verified live (REST + browser UI): login (user+admin), deposit, withdrawal, admin add-balance, new detailed transfer flow ($5 internal transfer with beneficiary details).
- Migration `00005_rebrand_and_card_requests.sql` written but **NOT APPLIED** to live DB (needs service_role key). Debit card *ordering* returns 404 until applied; the page UI + admin approval UI work and degrade gracefully.
- Migration `00006_transfers_notifications_mail.sql` written but **NOT APPLIED** to live DB. Until applied: transfer blocking, notifications bell, and built-in mail UI all render but degrade gracefully (blocks read as "not blocked"; notifications/messages return empty; write attempts show a toast telling admin to apply migration 00006).
- Build clean (`vite build`), `tsgo` + `biome lint` pass.

## Feature model (added 2026-08-23)
- **Transfers**: full beneficiary form (name, account/IBAN, bank, routing (9-digit ABA), SWIFT for international), 4 methods (internal/ACH/wire/international) with fees + ETA, review screen, login-PIN verification only (NO COT code, NO separate transfer PIN). Details stored in `transactions.metadata` jsonb (works without migration).
- **Transfer blocks**: per-user `profiles.transfers_blocked` flag + global `site_settings.transfers_blocked` (admin toggle in AdminOverview "Transfer Controls" card; per-user button in AdminUsers). Checked in `transferFunds` + Transfer page UI.
- **Built-in mail** (`messages` table): user page `/dashboard/messages` (compose goes to all admins via `public_profiles` view), admin page `/admin/messages` (recipient picker + broadcast-to-all; `/admin/messages?to=<userId>` preselects). No external email provider.
- **Notifications** (`notifications` table): bell (`NotificationBell`) in DashboardLayout + AdminLayout headers, 20s polling. Fired on: sign-in, deposit, withdrawal, transfer sent/received, admin credit, card status change, new message, transfer block/unblock. All notification writes are best-effort and silently no-op if the table is missing.
- `send-email` edge function calls removed from Transfer/AdminUsers (function was never deployed, 404).

## Deployment Blockers (need user credentials)
1. **Supabase service_role key** — to apply migrations 00005 + 00006. Apply via Supabase Dashboard → SQL Editor (paste file contents, run 00005 first), or `supabase db push` with DB access.
2. **Railway token** — to deploy manually (CLI not installed in env). Repo is Railway-ready (Dockerfile + nixpacks.toml); pushing to GitHub `main` auto-deploys if the Railway project is connected to the repo. Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` as Railway env vars.

## Test Credentials (live Supabase)
- Admin: `admin@skybordbank.com` / PIN `1234`
- User: `milljohnson75@gmail.com` / PIN `2356` (account SKB3870327296)
