import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Globe, BarChart3, Zap, Lock, CreditCard, HeadphonesIcon, ChevronRight, ArrowRight, Star, TrendingUp, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const heroSlides = [
  {
    title: 'Future-Ready',
    highlight: 'Digital Banking',
    subtitle: 'Manage your wealth with secure, next-gen digital tools trusted by 500K+ global investors.',
    image: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_f23cce90-591a-449c-80da-626b8d39fab6.jpg',
  },
  {
    title: 'Seamless',
    highlight: 'Wealth Management',
    subtitle: 'Grow your financial future with expert-backed guidance and AI-driven portfolio insights.',
    image: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_2cc48c0c-575c-4d86-99fc-9c79a3f0f441.jpg',
  },
  {
    title: 'Smarter',
    highlight: 'Investing Solutions',
    subtitle: 'Access global markets and expand your portfolio with institutional-grade tools.',
    image: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_83a64425-f590-4b95-9e80-b03a63fd68d6.jpg',
  },
  {
    title: 'Secure',
    highlight: 'Mobile Banking',
    subtitle: 'Bank anywhere with our award-winning app. Zero fees, real-time alerts, full control.',
    image: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_87c54803-70be-47f9-b860-74eb8c4ce48e.jpg',
  },
  {
    title: 'Premium',
    highlight: 'Digital Finance',
    subtitle: 'Experience the next generation of private banking with unmatched security and speed.',
    image: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_afaa7a9c-c1d8-4945-b324-fc5a666b7ef5.jpg',
  },
];

const features = [
  { icon: Shield, title: 'Wealth Protection', desc: 'Multi-layered institutional security protocols and encryption protecting your global assets 24/7.' },
  { icon: Globe, title: 'Global Connectivity', desc: 'Instant cross-border transactions and multi-currency accounts accessible from anywhere in the world.' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'AI-driven financial insights and automated portfolio management to maximize your investment potential.' },
];

const investmentPlans = [
  { name: 'Micro Tier', roi: '150%', min: '$500', max: '$2,999', duration: '5 Days', tag: 'Entry Level' },
  { name: 'Growth Plus', roi: '16%', min: '$100', max: '$25,000', duration: '60 Days', tag: 'Recommended', featured: true },
  { name: 'Alpha Elite', roi: '2.5%', min: '$25,000', max: '$100,000', duration: '60 Days', tag: 'Institutional' },
];

const stats = [
  { value: '$2.4B+', label: 'Assets Under Management' },
  { value: '500K+', label: 'Active Global Investors' },
  { value: '120+', label: 'Countries Reached' },
  { value: '99.9%', label: 'Transaction Uptime' },
];

const testimonials = [
  { name: 'Jameson Thorne', role: 'Portfolio Manager, London', text: 'The institutional-grade tools and white-glove service at Bellinzona are unparalleled. My portfolio has never been more secure or more productive.' },
  { name: 'Elena Rodriguez', role: 'Global Logistics CEO', text: 'Switching to their digital core was a game changer for my global transactions. Speed, security, and absolute transparency.' },
  { name: 'Dr. Alan Grant', role: 'Fintech Researcher', text: 'Bellinzona represents the future of institutional finance. Their focus on digital innovation and user experience is unmatched.' },
  { name: 'Robert Ford', role: 'Manager, London', text: 'I appreciate the transparency. No hidden fees, great rates, and a support team that actually cares about your financial success.' },
  { name: 'Linda Garcia', role: 'Global Logistics', text: 'The international wire transfer speed is unmatched. I can move funds to my overseas partners instantly. Highly recommended.' },
];

export default function HomePage() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const current = heroSlides[slide];

  return (
    <div className="w-full">
      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Sliding background images */}
        {heroSlides.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === slide ? 1 : 0 }}
          >
            <img
              src={s.image}
              alt={s.highlight}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 hero-overlay" />
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-24 pb-16 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/25 text-white/90 text-xs font-medium mb-6 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
              World-Class Digital Banking Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
              {heroSlides[slide].title}{' '}
              <span className="text-blue-300">{heroSlides[slide].highlight}</span>
            </h1>
            <p className="text-xl text-white/80 mb-10 max-w-lg drop-shadow">{heroSlides[slide].subtitle}</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 shadow-lg shadow-primary/30">
                  Open Account <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="ghost" className="border border-white/30 text-white hover:bg-white/10 text-base px-8 backdrop-blur-sm">
                  Account Login
                </Button>
              </Link>
            </div>
          </div>

          {/* Slide controls */}
          <div className="flex items-center gap-4 mt-12">
            <button
              onClick={() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 border border-white/20 flex items-center justify-center transition-all backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="flex gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={cn('h-1.5 rounded-full transition-all duration-300', i === slide ? 'bg-white w-8' : 'bg-white/40 w-4')}
                />
              ))}
            </div>
            <button
              onClick={() => setSlide((s) => (s + 1) % heroSlides.length)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 border border-white/20 flex items-center justify-center transition-all backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            <span className="text-white/50 text-xs ml-2">{slide + 1} / {heroSlides.length}</span>
          </div>
        </div>
      </section>

      {/* ─── Feature Cards ─── */}
      <section className="section-muted py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card rounded-3xl p-10 text-center group hover:-translate-y-4 transition-transform duration-500">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary transition-colors duration-500">
                  <Icon className="w-9 h-9 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About / Experience ─── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Digital-First Experience</div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">Modern Banking,<br />Redefined for You</h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">We've engineered a global banking architecture that fuses institutional strength with a friction-less digital interface.</p>
              <ul className="space-y-4 mb-8">
                {['Instant Global Fund Transfers', 'AI-Powered Investment Insights', 'Multi-Currency Virtual Cards', '24/7 Priority Concierge Support'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <ChevronRight className="w-3 h-3 text-primary" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/digital-banking">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Discover More Features <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: 'Instant Pay', sub: 'Global execution' },
                { icon: Lock, label: 'Bank-Grade', sub: 'Institutional Security' },
                { icon: CreditCard, label: 'Virtual Cards', sub: 'Multi-currency' },
                { icon: HeadphonesIcon, label: '24/7 Support', sub: 'Priority Concierge' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="font-bold text-foreground text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Investment Plans ─── */}
      <section className="section-muted py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Investment Portfolios</div>
            <h2 className="text-4xl font-extrabold text-foreground mb-4">Elite Wealth Plans</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Choose from our institutional-grade investment strategies designed to maximize your global returns.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {investmentPlans.map((plan) => (
              <div key={plan.name} className={cn('rounded-2xl p-8 border transition-all hover:-translate-y-2 duration-300', plan.featured ? 'bg-primary border-primary teal-glow' : 'glass-card border-border')}>
                <div className={cn('text-xs font-semibold uppercase tracking-wider mb-3', plan.featured ? 'text-primary-foreground/70' : 'text-primary')}>{plan.tag}</div>
                <div className={cn('text-5xl font-extrabold mb-1', plan.featured ? 'text-primary-foreground' : 'text-foreground')}>{plan.roi}</div>
                <div className={cn('text-sm mb-6', plan.featured ? 'text-primary-foreground/70' : 'text-muted-foreground')}>ROI • {plan.duration}</div>
                <div className="font-bold text-2xl mb-6">{plan.name}</div>
                <div className={cn('text-sm space-y-2 mb-8', plan.featured ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  <div>Min: {plan.min}</div>
                  <div>Max: {plan.max}</div>
                </div>
                <Link to="/investment">
                  <Button className={cn('w-full', plan.featured ? 'bg-white text-primary hover:bg-white/90' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/investment">
              <Button variant="ghost" className="border border-border text-muted-foreground hover:text-primary hover:border-primary">
                View All Portfolios <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20 bg-gradient-to-r from-[#0a1c50] to-[#1e40af]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-3">Institutional Trust</div>
            <h2 className="text-4xl font-extrabold text-white mb-4">Scaling Your Global Future</h2>
            <p className="text-white/70 max-w-lg mx-auto text-sm">We manage billions in assets across the globe, providing the liquidity and stability required for high-performance.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-extrabold text-white mb-2">{value}</div>
                <div className="text-sm text-white/70">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="section-muted py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Social Proof</div>
            <h2 className="text-4xl font-extrabold text-foreground mb-4">Trusted Globally</h2>
            <p className="text-muted-foreground">Join the world's most sophisticated investors who have redefined their wealth journey.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-8 relative">
                <div className="absolute top-6 right-8 text-5xl text-primary/20 font-serif leading-none">"</div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{t.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="glass-card rounded-3xl p-12 border border-primary/20 teal-glow">
            <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-4">Smart. Secure. Reliable.</div>
            <h2 className="text-4xl font-extrabold text-foreground mb-4">Open an account in minutes</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Manage your wealth seamlessly and secure your financial future with next-gen digital tools.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="ghost" className="border border-border text-muted-foreground hover:text-primary hover:border-primary px-8">
                  Talk to an Expert
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
