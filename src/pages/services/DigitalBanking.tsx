import { Link } from 'react-router-dom';
import { Bell, Globe, Lock, Smartphone, Monitor, ArrowRight, Shield, Zap, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QUICK_ACTIONS: [string, LucideIcon][] = [
  ['Send', ArrowRight],
  ['Top Up', Zap],
  ['Pay', Shield],
];

export default function DigitalBankingPage() {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-[#0a1c50] via-[#0f172a] to-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Digital Core Banking</div>
            <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
              Bank Smarter,<br /><span className="text-primary">Not Harder</span>
            </h1>
            <p className="text-white/70 mb-8 leading-relaxed">Experience institutional-grade digital banking with real-time controls, multi-currency access, and intelligent security—all in one seamless platform.</p>
            <Link to="/register"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Open Digital Account <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          </div>
          {/* Mock card UI */}
          <div className="glass-card rounded-3xl p-8 border border-white/10">
            <div className="bg-gradient-to-br from-primary to-[#0a1c50] rounded-2xl p-6 mb-4 teal-glow">
              <div className="text-white/60 text-xs mb-1">Available Balance</div>
              <div className="text-white text-3xl font-extrabold mb-4">$84,950.40</div>
              <div className="flex justify-between text-white/60 text-xs">
                <span>BZC•••• 9870</span>
                <span>VISA Platinum</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_ACTIONS.map(([label, Icon]) => (
                <div key={label} className="bg-secondary rounded-xl p-3 text-center">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 section-muted">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-foreground mb-4">Core Digital Features</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Bell, title: 'Instant Notifications', desc: 'Real-time push and SMS alerts for every transaction, login attempt, and account activity.' },
              { icon: Globe, title: 'Multi-Currency Access', desc: 'Hold, exchange, and send money in 50+ currencies with competitive institutional rates.' },
              { icon: Lock, title: 'Smart Safe Vaults', desc: 'Military-grade encrypted virtual vaults to protect and organize your digital assets.' },
              { icon: Smartphone, title: 'Mobile Banking', desc: 'Full-featured banking on any device. iOS and Android apps with biometric authentication.' },
              { icon: Monitor, title: 'Web Dashboard', desc: 'Comprehensive desktop portal with advanced analytics, reporting, and account controls.' },
              { icon: Shield, title: 'Fraud Protection', desc: 'AI-powered anomaly detection that monitors and blocks suspicious transactions instantly.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card rounded-2xl p-8 group hover:-translate-y-2 transition-transform duration-300">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                  <Icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
