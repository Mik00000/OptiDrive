"use client";

import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Introduction and Scope',
      content: 'OptiDrive ("we", "us", or "our") respects your privacy and is committed to protecting your personal data and uploaded media assets. This Privacy Policy explains how we collect, process, share, and protect your information when you register for an account, access our dashboard, or utilize our global image optimization APIs and content delivery networks (CDN).'
    },
    {
      title: '2. Information We Collect',
      content: 'We collect several types of information to provide high-performance asset delivery services:\n\n• Account Credentials: Name, email address, password hashes, and profile avatars.\n• Billing & Payment Data: Payment methods and subscription histories processed securely via Stripe. We do not store full credit card details on our servers.\n• Media Files & Assets: Images, vectors, and other files uploaded to our cloud buckets. For "Bring Your Own Storage" (BYOS) accounts, we do not store master assets but temporarily cache processed assets.\n• Technical Metadata: File sizes, mime-types, optimization rates, original file names, image dimensions, and URL paths.\n• API & Client Logs: Request IP addresses, HTTP headers, request paths, API keys used, bandwidth consumption, and response statuses.'
    },
    {
      title: '3. Legal Basis for Processing (GDPR/CCPA)',
      content: 'If you reside in the European Economic Area (EEA) or California, our processing of your data is grounded on: (a) Performance of a contract to deliver our optimization services; (b) Compliance with legal obligations (e.g. tax laws); and (c) Our legitimate business interests, including service security, prevention of API key abuse, and performance analytics.'
    },
    {
      title: '4. Data Retention and Deletion Policy',
      content: 'We adhere to strict data minimization guidelines:\n\n• Account Data: Maintained as long as your account remains active. Upon workspace deletion, account details are purged within 30 days.\n• Master Media Files: Retained until you trigger a deletion via our API or Dashboard. Once deleted, files are immediately scheduled for permanent erasure from physical cloud buckets within 24 hours.\n• Edge CDN Cache: Optimized copies cached at global edge locations expire based on your cache headers or can be purged instantly using the Cache Purge API.\n• Access Logs: Security and performance logs are rotated and deleted automatically after 90 days.'
    },
    {
      title: '5. Security of Your Credentials & Data',
      content: 'We implement industry-standard security protocols to protect your workspace settings and credentials. All traffic to our API gateways and control panels is encrypted using TLS (HTTPS). S3 storage credentials (access keys, secrets) for BYOS configurations are encrypted at rest using AES-256 algorithms. Developer API keys are stored in hashed formats to prevent unauthorized read access.'
    },
    {
      title: '6. Sharing & Third-Party Processors',
      content: 'We do not sell, rent, or trade your personal data or uploaded media assets. We only share information with trusted sub-processors necessary to run the platform:\n\n• Infrastructure Providers: Cloud hosting and object storage providers (e.g., AWS, Neon, Vercel).\n• Payment Gateways: Stripe, for billing and processing subscriptions.\n• Communication Tools: Email delivery servers (e.g., Resend, Nodemailer) for system warnings and transaction updates.'
    },
    {
      title: '7. Your Rights and Choices',
      content: 'Depending on your location, you hold legal rights regarding your information: the right to access the personal data we hold about you, request corrections, request deletion, limit processing, or request a portable copy of your account profile. To exercise these rights, please contact our support desk at troutundefined5894@gmail.com.'
    }
  ];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white print:bg-white print:text-black">
      <div className="print:hidden">
        <LandingNav />
      </div>

      <section className="relative px-6 md:px-16 pt-16 pb-20 max-w-4xl mx-auto w-full z-10 text-left print:pt-4 print:pb-4">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none print:hidden" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 self-start">
            <Icon icon="lucide:shield-check" width={12} height={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400">Legal Agreement</span>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-xs font-semibold text-text-muted hover:text-text-light transition-all cursor-pointer self-start sm:self-auto"
            title="Print this agreement for your compliance records"
          >
            <Icon icon="lucide:printer" width={14} />
            <span>Print Policy</span>
          </button>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light print:text-black leading-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-text-muted text-sm sm:text-base mb-12 border-b border-slate-800 print:border-black/20 pb-8">
          Last updated: July 09, 2026. This policy outlines how OptiDrive collects, processes, and stores data.
        </p>

        <div className="flex flex-col gap-10 max-w-3xl">
          {sections.map((sect, i) => (
            <div key={i} className="flex flex-col gap-3 break-inside-avoid">
              <h2 className="font-headings font-bold text-lg sm:text-xl text-text-light print:text-black border-l-2 border-indigo-550 pl-4">{sect.title}</h2>
              <p className="text-xs sm:text-sm text-text-muted print:text-black/85 leading-relaxed whitespace-pre-line">{sect.content}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
