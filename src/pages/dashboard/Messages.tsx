import { useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Mailbox, { type MailTarget } from '@/components/common/Mailbox';
import { getAdminProfiles } from '@/services/api';

export default function MessagesPage() {
  const { user } = useAuth();

  const resolveNames = useCallback(async (ids: string[]) => {
    const { data } = await supabase.from('public_profiles').select('id, first_name, last_name, username, role').in('id', ids);
    const map: Record<string, string> = {};
    (data || []).forEach((p) => {
      const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      map[p.id] = p.role === 'admin'
        ? 'Bellinzone Support'
        : full || p.username || 'User';
    });
    return map;
  }, []);

  const loadTargets = useCallback(async (): Promise<MailTarget[]> => {
    const admins = await getAdminProfiles();
    return admins.map((a) => ({ id: a.id, label: 'Bellinzone Support' }));
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Secure Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Built-in bank mail — message Bellinzone support directly, no external email needed
        </p>
      </div>
      <Mailbox
        selfId={user.id}
        resolveNames={resolveNames}
        loadTargets={loadTargets}
        fixedTargetLabel="Bellinzone A Credit — Customer Support"
      />
    </div>
  );
}
