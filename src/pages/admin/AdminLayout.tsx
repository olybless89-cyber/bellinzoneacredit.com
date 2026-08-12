import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, ShieldCheck, ArrowUpRight,
  LogOut, Menu, X, Building2, ChevronRight, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/admin/users', label: 'Users', icon: Users, end: false },
  { path: '/admin/kyc', label: 'KYC Queue', icon: ShieldCheck, end: false },
  { path: '/admin/transactions', label: 'Transactions', icon: ArrowUpRight, end: false },
  { path: '/admin/card-requests', label: 'Card Requests', icon: CreditCard, end: false },
];

function NavItems({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ path, label, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          onClick={onClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
          {!end && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard', { replace: true });
    }
    if (!loading && !profile) {
      navigate('/login', { replace: true });
    }
  }, [profile, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading || !profile || profile.role !== 'admin') return null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-bold text-sm text-foreground leading-none">Bellinezona Credit Union</div>
          <div className="text-xs text-destructive font-semibold mt-0.5">ADMIN PORTAL</div>
        </div>
      </div>

      <div className="px-3 flex-1">
        <NavItems onClick={() => setMobileOpen(false)} />
      </div>

      {/* Admin badge + sign out */}
      <div className="px-3 pb-6 mt-auto border-t border-border pt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted mb-3">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-destructive font-bold text-xs shrink-0">
            {(profile.first_name?.[0] || profile.username?.[0] || 'A').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">
              {profile.first_name || profile.username || 'Admin'}
            </div>
            <div className="text-xs text-destructive">Administrator</div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive border border-border"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">Admin Portal</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 bg-card">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
