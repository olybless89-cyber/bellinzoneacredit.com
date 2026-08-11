import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// All paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/', '/login', '/register', '/investment', '/credit-cards', '/contact',
  '/digital-banking', '/mobile-web-banking', '/insurance-policies',
  '/home-property-loan', '/all-bank-accounts', '/borrowing-account',
  '/private-banking', '/fixed-term-account', '/404',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path);
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPath(location.pathname)) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">Loading Bellinzone A Credit...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}