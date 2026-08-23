import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, ArrowLeftRight, Mail, ShieldAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '@/services/api';
import type { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  transaction: ArrowLeftRight,
  message: Mail,
  security: ShieldAlert,
};

const TYPE_COLOR: Record<string, string> = {
  info: 'text-blue-500',
  success: 'text-green-600',
  warning: 'text-yellow-500',
  transaction: 'text-primary',
  message: 'text-purple-500',
  security: 'text-destructive',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!user) return;
    setUnread(await getUnreadNotificationCount(user.id));
  }, [user]);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 20000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    if (!open || !user) return;
    setLoadingList(true);
    getNotifications(user.id).then(setItems).finally(() => setLoadingList(false));
  }, [open, user]);

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleOpenItem = async (n: AppNotification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 bg-card border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-bold text-sm text-foreground">Notifications</span>
          {unread > 0 && (
            <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loadingList ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = TYPE_ICON[n.type] || Info;
              const color = TYPE_COLOR[n.type] || TYPE_COLOR.info;
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpenItem(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-xs truncate', !n.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground')}>{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
