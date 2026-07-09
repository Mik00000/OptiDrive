"use client";

import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By registering for an account or using the OptiDrive media delivery API, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the platform.'
    },
    {
      title: '2. User Accounts & Keys',
      content: 'You are responsible for safeguarding your API keys and client credentials. Any actions performed using your API keys will be attributed to your account. Sharing credentials across multiple users to circumvent workspace limits is prohibited.'
    },
    {
      title: '3. Acceptable Use Policy',
      content: 'You may not upload, optimize, or deliver media assets that violate any copyright laws, contain explicit content without appropriate age-gating, propagate malicious scripts, or attempt to compromise our global Edge CDN infrastructure. We reserve the right to immediately suspend accounts violating these conditions.'
    },
    {
      title: '4. Fees & Billing',
      content: 'Billing is calculated on a subscription model based on your selected plan. Quotas (Storage, Bandwidth, and Optimizations) reset on a monthly basis. All sales are final. Unused allocations do not roll over to the next billing cycle.'
    }
  ];

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      <section className="relative px-6 md:px-16 pt-16 pb-20 max-w-4xl mx-auto w-full z-10 text-left">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
          <Icon icon="lucide:file-text" width={12} height={12} className="text-accent" />
          <span className="text-xs font-semibold text-accent">Legal Agreement</span>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light leading-tight mb-4">
          Terms of Service
        </h1>
        <p className="text-text-muted text-sm sm:text-base mb-12 border-b border-border pb-8">
          Last updated: July 09, 2026. Please read these terms carefully before utilizing our optimization gateway.
        </p>

        <div className="flex flex-col gap-10 max-w-3xl">
          {sections.map((sect, i) => (
            <div key={i} className="flex flex-col gap-3">
              <h2 className="font-headings font-bold text-xl text-text-light">{sect.title}</h2>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{sect.content}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
