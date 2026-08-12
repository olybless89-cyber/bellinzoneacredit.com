import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, Monitor, Lock, Bell, CreditCard, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileWebBankingPage() {
  return (
    <div className="min-h-screen pt-20">
      <section className="py-20 bg-gradient-to-br from-[#0a1c50] via-[#0f172a] to-[#0f172a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Omnichannel Banking</div>
          <h1 className="text-5xl font-extrabold text-white mb-6">Bank Everywhere, Anytime</h1>
          <p className="text-white/70 max-w-2xl mx-auto mb-8">From mobile to desktop, enjoy the same premium experience across all your devices with seamless synchronization.</p>
          <Link to="/register"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
        </div>
      </section>
      <section className="py-20 section-muted">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Smartphone className="w-6 h-6 text-primary" /></div>
                <h2 className="text-3xl font-extrabold text-foreground">Mobile Banking App</h2>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">Full-featured iOS and Android app with biometric authentication, instant push notifications, and real-time portfolio tracking.</p>
              {['Face ID & fingerprint login', 'Real-time transaction alerts', 'QR code payments', 'Card freeze/unfreeze instantly', 'Location-based security'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-foreground mb-3">
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><ArrowRight className="w-2 h-2 text-primary" /></div>{f}
                </div>
              ))}
            </div>
            <div className="glass-card rounded-2xl p-8 border border-border text-center">
              <div className="w-32 h-64 bg-gradient-to-b from-secondary to-card rounded-3xl border-4 border-border mx-auto flex flex-col items-center justify-center gap-4">
                <Smartphone className="w-12 h-12 text-primary" />
                <div className="text-xs text-muted-foreground">Bellinzona App</div>
                <div className="px-3 py-1 bg-primary rounded-full text-primary-foreground text-xs">Available</div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="glass-card rounded-2xl p-8 border border-border text-center">
              <div className="w-48 h-32 bg-gradient-to-b from-secondary to-card rounded-xl border-2 border-border mx-auto flex items-center justify-center">
                <Monitor className="w-16 h-16 text-primary" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Monitor className="w-6 h-6 text-primary" /></div>
                <h2 className="text-3xl font-extrabold text-foreground">Web Banking Portal</h2>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">Advanced desktop dashboard with in-depth analytics, bulk transfers, and complete account management tools.</p>
              {['Advanced portfolio analytics', 'Bulk payment processing', 'Customizable dashboards', 'Multi-account overview', 'Statement downloads'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-foreground mb-3">
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><ArrowRight className="w-2 h-2 text-primary" /></div>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-6">
          {[
            { icon: Lock, title: 'End-to-End Encryption', desc: 'Military-grade security on all channels' },
            { icon: Bell, title: 'Real-Time Sync', desc: 'Instant updates across all devices' },
            { icon: CreditCard, title: 'Card Controls', desc: 'Freeze, limit, and manage all cards' },
            { icon: Globe, title: 'Global Access', desc: '24/7 access from 120+ countries' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card rounded-2xl p-6 text-center hover:-translate-y-2 transition-transform">
              <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="font-bold text-foreground mb-1">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
