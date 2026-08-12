import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const services = [
  { label: 'Digital Banking', href: '/digital-banking' },
  { label: 'Mobile & Web Banking', href: '/mobile-web-banking' },
  { label: 'Insurance Policies', href: '/insurance-policies' },
  { label: 'Home & Property Loan', href: '/home-property-loan' },
  { label: 'All Bank Accounts', href: '/all-bank-accounts' },
  { label: 'Borrowing Accounts', href: '/borrowing-account' },
  { label: 'Private Banking', href: '/private-banking' },
  { label: 'Fixed Term Account', href: '/fixed-term-account' },
];

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Investment', href: '/investment' },
  { label: 'Credit Cards', href: '/credit-cards' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-background/95 backdrop-blur border-b border-border shadow-lg' : 'bg-transparent'
    )}>
      {/* Top bar */}
      <div className={cn('border-b border-white/10 transition-all duration-300', scrolled && 'hidden')}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>support@bellinzonacredit.com</span>
          <span>Find Nearest Branch</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:block">
              <span className="text-primary">Bellinzona</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</Link>
            {/* Services dropdown */}
            <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
              <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Services <ChevronDown className="w-4 h-4" />
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl py-2 z-50">
                  {services.map((s) => (
                    <Link key={s.href} to={s.href} className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" onClick={() => setServicesOpen(false)}>
                      {s.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {navLinks.slice(1).map((link) => (
              <Link key={link.href} to={link.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary border border-border">
                    {profile?.first_name || profile?.username || 'Dashboard'}
                  </Button>
                </Link>
                <Button size="sm" onClick={handleSignOut} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground border border-border hover:text-primary hover:border-primary">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Open Account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden text-foreground">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card border-border w-72">
              <div className="flex flex-col gap-6 mt-6">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl" onClick={() => setMobileOpen(false)}>
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span><span className="text-primary">Bellinzona</span></span>
                </Link>
                <nav className="flex flex-col gap-2">
                  {[{ label: 'Home', href: '/' }, ...navLinks.slice(1)].map((link) => (
                    <Link key={link.href} to={link.href} className="px-3 py-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" onClick={() => setMobileOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">Services</div>
                  {services.map((s) => (
                    <Link key={s.href} to={s.href} className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-secondary transition-colors" onClick={() => setMobileOpen(false)}>
                      {s.label}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  {user ? (
                    <>
                      <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full" variant="secondary">Dashboard</Button>
                      </Link>
                      <Button className="w-full bg-primary text-primary-foreground" onClick={() => { handleSignOut(); setMobileOpen(false); }}>Sign Out</Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full" variant="secondary">Login</Button>
                      </Link>
                      <Link to="/register" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full bg-primary text-primary-foreground">Open Account</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
