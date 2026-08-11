import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Shield, Clock, BarChart3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLANS = [
  { name: 'Micro Tier', tag: 'Entry Level', roi: '150%', type: 'Total Return', min: '$500', max: '$2,999', duration: '5 Days', color: 'from-[#1a3a5c] to-[#0f172a]', features: ['$500 min investment', '5-day cycle', 'Auto-reinvest option', 'Email notifications'] },
  { name: 'Growth Plus', tag: 'Most Popular', roi: '16%', type: 'Daily ROI', min: '$100', max: '$25,000', duration: '60 Days', color: 'from-primary to-[#0a1c50]', featured: true, features: ['$100 min investment', 'Daily profit release', 'Portfolio dashboard', 'Priority support'] },
  { name: 'Standard Alpha', tag: 'Institutional', roi: '2.5%', type: 'Daily ROI', min: '$25,000', max: '$100,000', duration: '60 Days', color: 'from-[#2d1a5c] to-[#0f172a]', features: ['$25,000 min investment', 'Dedicated RM', 'Real-time tracking', 'Weekly reports'] },
  { name: 'Gold Premium', tag: 'Elite Wealth', roi: '5%', type: 'Daily ROI', min: '$100,000', max: '$500,000', duration: '90 Days', color: 'from-[#3d3a02] to-[#0f172a]', features: ['$100,000 min investment', 'Private wealth team', 'Custom allocation', 'Quarterly review'] },
];

export default function InvestmentPage() {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-[#0a1c50] via-[#0f172a] to-[#0f172a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Wealth Engine</div>
          <h1 className="text-5xl font-extrabold text-white mb-6">Invest With Confidence</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">Access institutional-grade investment vehicles with transparent returns, real-time tracking, and zero lock-in surprises.</p>
          <Link to="/register"><Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">Start Investing <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gradient-to-r from-primary to-[#0a1c50]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[['$2.4B+', 'Assets Managed'], ['500K+', 'Active Investors'], ['99.98%', 'On-Time Payouts'], ['120+', 'Countries']].map(([val, lbl]) => (
              <div key={lbl}><div className="text-3xl font-extrabold text-white">{val}</div><div className="text-white/60 text-sm">{lbl}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 section-muted">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-foreground mb-4">Choose Your Portfolio</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">All plans include institutional oversight, transparent reporting, and guaranteed payout timelines.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.name} className={cn('rounded-2xl overflow-hidden border', plan.featured ? 'border-primary teal-glow' : 'border-border glass-card')}>
                <div className={`bg-gradient-to-br ${plan.color} p-8`}>
                  {plan.featured && <div className="inline-flex mb-3 px-2 py-1 rounded-full bg-white text-primary text-xs font-bold">Most Popular</div>}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white/60 text-xs mb-1">{plan.tag}</div>
                      <div className="text-white font-extrabold text-3xl">{plan.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-4xl font-extrabold">{plan.roi}</div>
                      <div className="text-white/60 text-xs">{plan.type}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-sm text-white/70">
                    <span>Min: {plan.min}</span>
                    <span>·</span>
                    <span>Max: {plan.max}</span>
                    <span>·</span>
                    <span>{plan.duration}</span>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/login">
                    <Button className={cn('w-full', plan.featured ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors')}>
                      Invest Now <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground mb-4">Why Invest With Bellinzone?</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Capital Protection', desc: 'All investments are backed by institutional reserves and multi-layer risk controls.' },
              { icon: TrendingUp, title: 'Consistent Returns', desc: 'Transparent ROI delivered on time, every time—no surprises.' },
              { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track your portfolio growth live with detailed dashboards.' },
              { icon: Clock, title: 'Flexible Terms', desc: 'From 5-day sprints to 90-day cycles—invest on your schedule.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card rounded-2xl p-6 text-center hover:-translate-y-2 transition-transform">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
