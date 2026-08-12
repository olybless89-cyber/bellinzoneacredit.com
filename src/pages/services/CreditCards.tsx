import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const CARDS = [
  { name: 'Bellinzona Classic', tier: 'Standard', color: 'from-gray-600 to-gray-900', features: ['1% cashback all purchases', 'Zero annual fee', 'Contactless payments', '24/7 fraud monitoring'] },
  { name: 'Bellinzona Prestige', tier: 'Premium', color: 'from-primary to-[#0a1c50]', features: ['4% dining cashback', '3% travel cashback', '2% grocery cashback', 'Airport lounge access', 'Concierge service'], featured: true },
  { name: 'Bellinzona Infinite', tier: 'Luxury', color: 'from-[#1a1a2e] to-[#000]', features: ['Unlimited cash back', 'No foreign transaction fees', 'Global Priority Pass', 'Personal financial advisor', 'Metal card'] },
];

const MATERIALS = ['Standard PVC', 'Metal Titanium', 'Carbon Fiber', 'Recycled Ocean Plastic'];

export default function CreditCardsPage() {
  const [cardName, setCardName] = useState('');
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [dining, setDining] = useState([3000]);
  const [travel, setTravel] = useState([2000]);
  const [shopping, setShopping] = useState([1500]);

  const cashback = (dining[0] * 0.04) + (travel[0] * 0.03) + (shopping[0] * 0.015);

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-[#0a1c50] via-[#0f172a] to-[#0f172a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Premium Card Collection</div>
          <h1 className="text-5xl font-extrabold text-white mb-6">Cards That Work As Hard As You Do</h1>
          <p className="text-white/70 max-w-2xl mx-auto">Unlimited cashback, global acceptance, and institutional perks—designed for the world's most discerning clients.</p>
        </div>
      </section>

      {/* Card Plans */}
      <section className="py-20 section-muted">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {CARDS.map((card) => (
              <div key={card.name} className={cn('rounded-2xl overflow-hidden border transition-all hover:-translate-y-2 duration-300', card.featured ? 'border-primary teal-glow' : 'border-border glass-card')}>
                {/* Card visual */}
                <div className={`bg-gradient-to-br ${card.color} p-8 h-40 relative`}>
                  {card.featured && <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-white text-primary text-xs font-bold">Most Popular</div>}
                  <div className="absolute bottom-6 left-8">
                    <div className="text-white/60 text-xs mb-1">{card.tier}</div>
                    <div className="text-white font-bold text-lg">{card.name}</div>
                  </div>
                  <div className="absolute bottom-6 right-8 text-white/60 text-sm font-mono">•••• 4521</div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {card.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button className={cn('w-full', card.featured ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground')}>
                      Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Customizer */}
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Personalize */}
            <div className="glass-card rounded-2xl p-8 border border-border">
              <h3 className="font-bold text-foreground text-xl mb-6">Personalize Your Card</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Name on Card</label>
                  <input
                    type="text"
                    placeholder="YOUR NAME"
                    maxLength={26}
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="w-full h-12 px-4 rounded-xl bg-secondary border border-border text-foreground text-sm tracking-widest outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Card Material</label>
                  <div className="grid grid-cols-2 gap-3">
                    {MATERIALS.map((m) => (
                      <button key={m} onClick={() => setMaterial(m)} className={cn('px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all', material === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Preview card */}
              <div className="mt-6">
                <div className="bg-gradient-to-br from-primary to-[#0a1c50] rounded-2xl p-6 teal-glow">
                  <div className="flex justify-between mb-6">
                    <span className="text-white/60 text-xs">Bellinzona Prestige</span>
                    <span className="text-white/60 text-xs">{material}</span>
                  </div>
                  <div className="text-white font-mono text-sm mb-4">•••• •••• •••• 4521</div>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-white/60 text-xs">Cardholder</div>
                      <div className="text-white font-semibold tracking-widest text-sm">{cardName || 'YOUR NAME'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs">Expires</div>
                      <div className="text-white text-sm">12/29</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cashback Calculator */}
            <div className="glass-card rounded-2xl p-8 border border-border">
              <h3 className="font-bold text-foreground text-xl mb-2">Cashback Calculator</h3>
              <p className="text-muted-foreground text-sm mb-6">Estimate your monthly cashback rewards</p>
              <div className="space-y-6">
                {[
                  { label: 'Dining', rate: '4%', value: dining, setter: setDining, max: 10000 },
                  { label: 'Travel', rate: '3%', value: travel, setter: setTravel, max: 10000 },
                  { label: 'Shopping', rate: '1.5%', value: shopping, setter: setShopping, max: 10000 },
                ].map(({ label, rate, value, setter, max }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-foreground">{label} <span className="text-primary font-bold">{rate}</span></span>
                      <span className="text-muted-foreground">${value[0].toLocaleString()}/mo</span>
                    </div>
                    <Slider value={value} onValueChange={setter} max={max} step={100} className="w-full" />
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary to-[#0a1c50] text-center teal-glow">
                <div className="text-white/70 text-sm mb-1">Monthly Estimated Cashback</div>
                <div className="text-white text-4xl font-extrabold">${cashback.toFixed(2)}</div>
                <div className="text-white/60 text-xs mt-1">${(cashback * 12).toFixed(2)} per year</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
