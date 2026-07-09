"use client";

import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: 'We collect data necessary to provide and improve the OptiDrive services. This includes personal information (such as your name, email, billing details) and technical asset metadata (such as file sizes, compression statistics, image dimensions, and referrers for optimized image delivery).'
    },
    {
      title: '2. How We Use Information',
      content: 'We use the information collected to optimize your images, configure custom delivery paths, secure API keys, prevent malicious activity or workspace abuse, and calculate billing quotas. We do not sell your personal data or your uploaded media assets to third parties.'
    },
    {
      title: '3. Media Cache & Storage',
      content: 'If you use OptiDrive default storage, your uploaded master assets are kept in secure regional storage buckets. Deleting files immediately schedules them for permanent deletion. For Pro accounts connecting custom S3 storage, master assets reside in your own infrastructure, and we only cache delivery assets temporarily for performance optimization.'
    },
    {
      title: '4. Third-Party Services',
      content: 'We use Stripe for payment processing and do not store credit card information on our servers. Uptime and delivery metrics are processed globally via global Edge CDN partners.'
    }
  ];

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      <section className="relative px-6 md:px-16 pt-16 pb-20 max-w-4xl mx-auto w-full z-10 text-left">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
          <Icon icon="lucide:shield-check" width={12} height={12} className="text-accent" />
          <span className="text-xs font-semibold text-accent">Legal Agreement</span>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light leading-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-text-muted text-sm sm:text-base mb-12 border-b border-border pb-8">
          Last updated: July 09, 2026. This policy outlines how OptiDrive collected information is processed.
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
