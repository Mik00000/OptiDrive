"use client";

import { useState } from 'react';
import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Support',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', topic: 'Support', message: '' });
    }, 1200);
  };

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      <section className="relative px-6 md:px-16 pt-16 pb-20 flex flex-col items-center max-w-7xl mx-auto w-full z-10">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
          <Icon icon="lucide:mail" width={12} height={12} className="text-accent" />
          <span className="text-xs font-semibold text-accent">Contact Team</span>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light leading-tight mb-4 text-center max-w-2xl">
          Get in touch with us
        </h1>
        <p className="text-text-muted max-w-lg text-sm sm:text-base leading-relaxed mb-12 text-center">
          Have questions about pricing, APIs, custom domains, or need enterprise scaling? Drop us a line.
        </p>

        <div className="w-full max-w-lg rounded-2xl border border-border bg-sidebar p-8 shadow-xl shadow-black/25">
          {submitted ? (
            <div className="flex flex-col items-center text-center py-10 gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="size-16 rounded-2xl bg-success/15 border border-success/35 text-success flex items-center justify-center shadow-lg shadow-success/5 animate-bounce">
                <Icon icon="lucide:check" width={28} height={28} />
              </div>
              <h2 className="font-headings font-bold text-xl text-text-light">Message sent successfully!</h2>
              <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                Thank you for reaching out! Our developer support team will get back to you within 24 hours.
              </p>
              <Button
                variant="bordered"
                className="mt-6 border-slate-700 hover:bg-slate-800 text-text-light text-xs font-semibold px-6 py-2.5 rounded-lg"
                onClick={() => setSubmitted(false)}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-text-light">Full Name</label>
                <Input
                  variant="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border-border"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-text-light">Email Address</label>
                <Input
                  variant="text"
                  type="email"
                  required
                  placeholder="e.g. alex@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-900 border-border"
                />
              </div>

              {/* Topic Select */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-text-light">Inquiry Type</label>
                <Input
                  variant="select"
                  direction="bottom"
                  value={formData.topic}
                  onChange={(val) => setFormData({ ...formData, topic: val })}
                  options={[
                    { value: 'Support', label: 'Technical Support & Integrations' },
                    { value: 'Billing', label: 'Billing & Plan Limits' },
                    { value: 'Enterprise', label: 'Enterprise Plans & Custom SLAs' },
                    { value: 'General', label: 'General / Partnership Proposals' },
                  ]}
                  className="w-full bg-slate-900 border-border"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-text-light">Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell us how we can help..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-lg border border-border bg-slate-900 px-4 py-2.5 text-sm text-text-light placeholder-text-muted/60 outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="accent"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl shadow-md shadow-accent/20"
              >
                {loading ? (
                  <>
                    <Icon icon="lucide:loader-2" className="animate-spin" width={16} />
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:send" width={14} />
                    <span>Send Message</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
