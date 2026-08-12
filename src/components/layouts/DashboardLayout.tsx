import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, History, User,
  Building2, LogOut, Menu, Settings, TrendingUp, Shield,
  Wallet, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Deposit & Withdraw', href: '/dashboard/money', icon: Wallet },
  { label: 'Transfer', href: '/dashboard/transfer', icon: ArrowLeftRight },
  { label: 'Debit Card', href: '/dashboard/debit-card', icon: CreditCard },
  { label: 'Transactions', href: '/dashboard/transactions', icon: History },
  { label: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

function NavContent({ onClose }: { onClose?: () => void }) {
  const { pathname } = useLocation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg" onClick={onClose}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span><span className="text-primary">Bellinzona</span></span>
        </Link>
      </div>

      {/* User badge */}
      <div className="p-4 mx-4 mt-4 rounded-xl bg-muted border border-border">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
          <span className="text-primary font-bold text-sm">
            {(profile?.first_name?.[0] || profile?.username?.[0] || 'U').toUpperCase()}
          </span>
        </div>
        <div className="text-sm font-semibold text-foreground">
          {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile?.username || 'User'}
        </div>
        <div className="text-xs text-muted-foreground truncate">{profile?.email || ''}</div>
        {profile?.role === 'admin' && (
          <span className="text-xs font-bold text-destructive mt-1 inline-block">ADMINISTRATOR</span>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}

        {/* Admin portal link — only for admins */}
        {profile?.role === 'admin' && (
          <Link
            to="/admin"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 border border-destructive/30',
              pathname.startsWith('/admin')
                ? 'bg-destructive/20 text-destructive'
                : 'text-destructive/70 hover:text-destructive hover:bg-destructive/10'
            )}
          >
            <Shield className="w-4 h-4 shrink-0" />
            Admin Portal
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Link to="/dashboard/profile" onClick={onClose}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card">
        <NavContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-card border-border">
          <NavContent onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-sm"><span className="text-primary">Bellinzona</span></span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

