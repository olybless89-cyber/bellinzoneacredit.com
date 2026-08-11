import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitContactMessage } from '@/services/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitContactMessage(form);
      toast.success('Message sent! We\'ll respond within 24 hours.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-[#0a1c50] via-[#0f172a] to-[#0f172a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Get In Touch</div>
          <h1 className="text-5xl font-extrabold text-white mb-6">We're Here to Help</h1>
          <p className="text-white/70 max-w-xl mx-auto">Our expert banking team is available 24/7 to answer your questions and guide your financial journey.</p>
        </div>
      </section>

      <section className="py-20 section-muted">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold text-foreground mb-6">Contact Information</h2>
                <div className="space-y-5">
                  {[
                    { icon: MapPin, label: 'Head Office', value: 'Via Giovanni Nizzola 1, 6500 Bellinzona, Switzerland' },
                    { icon: Phone, label: 'Phone Number', value: '+8801682648101' },
                    { icon: Mail, label: 'Email Address', value: 'support@bellinzoneacredit.com' },
                    { icon: Clock, label: 'Business Hours', value: 'Mon – Fri: 09:00 – 17:00\nSat: 09:00 – 13:00' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{label}</div>
                        <div className="text-muted-foreground text-sm whitespace-pre-line">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-border">
                <h3 className="font-bold text-foreground mb-3">Priority Support Channels</h3>
                <div className="space-y-3">
                  {['24/7 Live Chat Support', 'Dedicated Relationship Manager', 'In-App Video Banking', 'Branch Appointments Available'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="glass-card rounded-2xl p-8 border border-border">
              <h2 className="text-xl font-bold text-foreground mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                    <Input placeholder="John Smith" value={form.name} onChange={(e) => set('name', e.target.value)} className="bg-secondary border-border" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email</label>
                    <Input type="email" placeholder="john@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} className="bg-secondary border-border" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject</label>
                  <Input placeholder="Account Inquiry" value={form.subject} onChange={(e) => set('subject', e.target.value)} className="bg-secondary border-border" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message</label>
                  <Textarea placeholder="Tell us how we can help you..." value={form.message} onChange={(e) => set('message', e.target.value)} className="bg-secondary border-border min-h-32 resize-none" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
