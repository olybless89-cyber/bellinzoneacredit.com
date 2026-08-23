-- Transfer controls, notifications, and built-in mail
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE everywhere).

-- 1. Per-user transfer block flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transfers_blocked boolean NOT NULL DEFAULT false;

-- 2. Global site settings (key/value flags managed by admin)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (key, value)
VALUES ('transfers_blocked', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read site_settings" ON public.site_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin full access to site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- 3. Notifications (in-app, shown via bell in dashboard + admin portal)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Any signed-in user may create a notification (e.g. sender notifies recipient of an internal transfer)
CREATE POLICY "Authenticated users create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin full access to notifications" ON public.notifications FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- 4. Built-in mail (website's own message system, no external provider)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages (sender_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients mark messages read" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Admin full access to messages" ON public.messages FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin'::public.user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::public.user_role);
