import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Mailbox, { type MailTarget } from '@/components/common/Mailbox';

export default function AdminMessages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTo = searchParams.get('to') || undefined;

  const resolveNames = useCallback(async (ids: string[]) => {
    const { data } = await supabase.from('profiles').select('id, first_name, last_name, username, email').in('id', ids);
    const map: Record<string, string> = {};
    (data || []).forEach((p) => {
      const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      map[p.id] = full || p.username || p.email || 'User';
    });
    return map;
  }, []);

  const loadTargets = useCallback(async (): Promise<MailTarget[]> => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, username, email, role')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });
    return (data || []).map((p) => {
      const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      return { id: p.id, label: full || p.username || p.email || 'User', sublabel: p.email || undefined };
    });
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Secure Mail</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Built-in bank mail — send and receive messages with users directly, no external email provider
        </p>
      </div>
      <Mailbox
        selfId={user.id}
        resolveNames={resolveNames}
        loadTargets={loadTargets}
        allowBroadcast
        initialRecipientId={initialTo}
      />
    </div>
  );
}
