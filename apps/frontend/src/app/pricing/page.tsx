"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const faqs = [
    {
      q: 'What is considered bandwidth usage?',
      a: 'Bandwidth is the total data transferred when users fetch your optimized media via our global Edge CDN. OptiDrive compresses images by up to 80%+, which significantly decreases your bandwidth consumption.'
    },
    {
      q: 'Can I connect my own S3 bucket?',
      a: 'Yes! Custom S3 integration is available starting from the Pro plan. You can plug in AWS S3, Cloudflare R2, or any S3-compatible storage and keep full ownership of your master files.'
    },
    {
      q: 'How do Custom Domains work?',
      a: 'With the Pro and Enterprise plans, you can configure your own subdomain (e.g. assets.mywebsite.com) to deliver optimized assets instead of using the default OptiDrive domain.'
    },
    {
      q: 'What happens if I exceed my plan limits?',
      a: 'We do not hard-block your images immediately if you go over your monthly limit. You will receive an email warning, and we will offer a smooth upgrade path. Enterprise plans support auto-scaling.'
    }
  ];

  const pricingFeatures = [
    { name: 'Monthly Optimizations', free: '500', pro: '50,000', enterprise: 'Unlimited' },
    { name: 'Edge CDN Bandwidth', free: '10 GB', pro: '250 GB', enterprise: 'Custom' },
    { name: 'SSD Cloud Storage', free: '1 GB', pro: '50 GB', enterprise: 'Custom' },
    { name: 'Custom S3 Storage', free: false, pro: true, enterprise: true },
    { name: 'Custom Delivery Domains', free: false, pro: 'Up to 3', enterprise: 'Unlimited' },
    { name: 'Smart Cache Retention', free: '7 days', pro: '30 days', enterprise: 'Unlimited' },
    { name: 'Webhooks & Watermarking', free: false, pro: true, enterprise: true },
    { name: 'Support', free: 'Community', pro: 'Priority Email', enterprise: '24/7 SLA' },
  ];

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative px-6 md:px-16 pt-16 pb-12 flex flex-col items-center text-center max-w-7xl mx-auto w-full z-10">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
          <Icon icon="lucide:credit-card" width={12} height={12} className="text-accent" />
          <span className="text-xs font-semibold text-accent">Transparent Pricing</span>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light leading-tight mb-4 max-w-2xl">
          Choose a plan that fits your growth
        </h1>
        <p className="text-text-muted max-w-lg text-sm sm:text-base leading-relaxed mb-8">
          Optimize, store, and serve your media assets globally. Start free, upgrade as you scale.
        </p>

        {/* Monthly/Yearly Switch */}
        <div className="flex items-center gap-3 bg-sidebar border border-border p-1 rounded-xl mb-12">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              billingPeriod === 'monthly' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-light'
            }`}
          >
            Monthly billing
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              billingPeriod === 'yearly' ? 'bg-accent text-white shadow-md' : 'text-text-muted hover:text-text-light'
            }`}
          >
            <span>Yearly billing</span>
            <span className="bg-success/20 text-success text-[10px] px-2 py-0.5 rounded-full font-bold">Save 20%</span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 md:px-16 pb-20 max-w-7xl mx-auto w-full z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-sidebar border border-border rounded-2xl p-8 flex flex-col justify-between hover:border-text-muted transition-colors duration-300">
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-text-light">Free</h3>
                <p className="text-xs text-text-muted mt-1">For personal projects and testing</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text-light">$0</span>
                <span className="text-xs text-text-muted">/ forever</span>
              </div>
              <div className="my-2 border-t border-border" />
              <ul className="flex flex-col gap-3 text-xs text-text-muted">
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>1 GB Storage & 10 GB Bandwidth</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>500 Optimizations/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>7 days trash retention</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Standard CDN speed</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-40 line-through">
                  <Icon icon="lucide:x" className="text-text-muted" width={16} />
                  <span>Watermarks & Webhooks</span>
                </li>
              </ul>
            </div>
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full mt-8">
              <Button variant="bordered" className="w-full py-3 px-4 rounded-xl text-xs font-semibold">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-sidebar border-2 border-accent rounded-2xl p-8 flex flex-col justify-between relative shadow-xl shadow-accent/5">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-text-light">Pro</h3>
                <p className="text-xs text-text-muted mt-1">For production sites and growing businesses</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text-light">
                  {billingPeriod === 'monthly' ? '$29' : '$23'}
                </span>
                <span className="text-xs text-text-muted">/ month</span>
              </div>
              <div className="my-2 border-t border-border" />
              <ul className="flex flex-col gap-3 text-xs text-text-muted">
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span className="text-text-light font-medium">50 GB Storage & 250 GB Bandwidth</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span className="text-text-light font-medium">50,000 Optimizations/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>30 days trash retention</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Custom S3 Bucket Support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Up to 3 Custom Domains</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Watermarks, Webhooks & APIs</span>
                </li>
              </ul>
            </div>
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full mt-8">
              <Button variant="accent" className="w-full py-3 px-4 rounded-xl text-xs font-semibold shadow-md shadow-accent/20">
                Upgrade to Pro
              </Button>
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-sidebar border border-border rounded-2xl p-8 flex flex-col justify-between hover:border-text-muted transition-colors duration-300">
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-text-light">Enterprise</h3>
                <p className="text-xs text-text-muted mt-1">For heavy media workloads and platforms</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text-light">Custom</span>
                <span className="text-xs text-text-muted">/ tailored pricing</span>
              </div>
              <div className="my-2 border-t border-border" />
              <ul className="flex flex-col gap-3 text-xs text-text-muted">
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span className="text-text-light font-medium">Custom Storage & Bandwidth</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span className="text-text-light font-medium">Unlimited Optimizations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Dedicated S3 cluster support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Unlimited Custom Domains</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Dedicated IP addresses & SLAs</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Priority 24/7 Slack support</span>
                </li>
              </ul>
            </div>
            <Link href="/contact" className="w-full mt-8">
              <Button variant="bordered" className="w-full py-3 px-4 rounded-xl text-xs font-semibold">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="px-6 md:px-16 py-16 max-w-5xl mx-auto w-full z-10">
        <h3 className="font-headings font-bold text-2xl text-text-light mb-8 text-center">Compare Plan Features</h3>
        <div className="overflow-x-auto border border-border rounded-xl bg-sidebar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-slate-900/50">
                <th className="p-4 text-xs font-semibold text-text-light">Feature</th>
                <th className="p-4 text-xs font-semibold text-text-light">Free</th>
                <th className="p-4 text-xs font-semibold text-text-light">Pro</th>
                <th className="p-4 text-xs font-semibold text-text-light">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {pricingFeatures.map((feat, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-slate-900/35 transition-colors">
                  <td className="p-4 text-xs font-medium text-text-light">{feat.name}</td>
                  <td className="p-4 text-xs text-text-muted">
                    {typeof feat.free === 'boolean' ? (feat.free ? <Icon icon="lucide:check" className="text-success" width={14} /> : <Icon icon="lucide:x" className="text-error" width={14} />) : feat.free}
                  </td>
                  <td className="p-4 text-xs text-text-muted">
                    {typeof feat.pro === 'boolean' ? (feat.pro ? <Icon icon="lucide:check" className="text-success" width={14} /> : <Icon icon="lucide:x" className="text-error" width={14} />) : feat.pro}
                  </td>
                  <td className="p-4 text-xs text-text-muted">
                    {typeof feat.enterprise === 'boolean' ? (feat.enterprise ? <Icon icon="lucide:check" className="text-success" width={14} /> : <Icon icon="lucide:x" className="text-error" width={14} />) : feat.enterprise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 md:px-16 py-16 max-w-4xl mx-auto w-full z-10">
        <h3 className="font-headings font-bold text-2xl text-text-light mb-10 text-center">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {faqs.map((faq, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <span className="font-semibold text-sm text-text-light">{faq.q}</span>
              <p className="text-xs text-text-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
