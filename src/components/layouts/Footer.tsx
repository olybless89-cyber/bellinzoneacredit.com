import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Twitter, Facebook, Instagram, Youtube, Linkedin, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { subscribeNewsletter } from '@/services/api';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await subscribeNewsletter(email);
      toast.success('Subscribed successfully!');
      setEmail('');
    } catch {
      toast.error('Already subscribed or invalid email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span><span className="text-primary">Bellinzona</span></span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              A digital-first financial institution dedicated to providing secure, innovative, and customer-centric banking solutions for a modern world.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Facebook, Instagram, Youtube, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Explore</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                ['Our Services', '/all-bank-accounts'],
                ['Credit Cards', '/credit-cards'],
                ['Investment Plans', '/investment'],
                ['Contact Us', '/contact'],
                ['Digital Banking', '/digital-banking'],
                ['Private Banking', '/private-banking'],
              ].map(([label, href]) => (
                <li key={href}><Link to={href} className="hover:text-primary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support Hub</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Via Giovanni Nizzola 1, 6500 Bellinzona, Switzerland</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:support@bellinzonacredit.com" className="hover:text-primary transition-colors">support@bellinzonacredit.com</a>
              </li>
            </ul>
            <div className="mt-4 text-xs text-muted-foreground space-y-1">
              <div>Mon – Fri: 09:00 – 17:00</div>
              <div>Sat: 09:00 – 13:00</div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Newsletter</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe to get the latest updates and news.</p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border"
              />
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? 'Subscribing...' : 'Subscribe Now'}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2026 Bellinzona Credit Union. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
