"use client";

import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By creating an account, invoking our image delivery APIs, or integrating our Edge CDN SDKs, you agree to be contractually bound by these Terms of Service, all applicable laws, and regulations. If you do not accept these terms in their entirety, you must immediately cease all access and utilization of the OptiDrive platform.'
    },
    {
      title: '2. Workspace Accounts and API Credentials',
      content: 'To access our optimization and delivery dashboards, you must register a workspace. You agree to:\n\n• Maintain strict confidentiality of your API keys and workspace tokens.\n• Take full responsibility for all activities, files uploaded, and bandwidth consumption billed to your account keys.\n• Notify us immediately of any unauthorized access, token leakage, or credential security breaches.\n\nSharing developer account credentials or building intermediate proxies to circumvent monthly optimization quota limits is strictly prohibited.'
    },
    {
      title: '3. License to Media Content',
      content: 'You retain full ownership, copyrights, and intellectual property rights of all media files you upload to OptiDrive. You hereby grant OptiDrive a worldwide, non-exclusive, royalty-free, limited license to process, transcode, cache, resize, adjust formatting, and transmit your media assets solely for the purpose of executing optimization services and delivering assets to your end-users via CDN.'
    },
    {
      title: '4. Acceptable Use and Content Policies',
      content: 'You agree not to use OptiDrive to store, optimize, or distribute any media assets that:\n\n• Infringe on third-party intellectual property, trademarks, or copyrights.\n• Depict illegal acts, explicit graphic content, or materials violating minor safety regulations.\n• Contain malware, malicious scripts, virus exploits, or executables intended to damage user systems.\n• Interfere with, bypass quotas, or attempt to disrupt the performance of our global CDN infrastructure.\n\nWe reserve the right to audit file headers and immediately suspend or delete accounts violating these safety terms without notice.'
    },
    {
      title: '5. Subscription Billing, Upgrades, and Quotas',
      content: 'Our services are billed on a recurring subscription model (Free, Pro, and custom Enterprise agreements) processed through Stripe. Monthly limits (Storage, Bandwidth, and Optimization counts) reset at the start of each billing cycle. Unused quotas do not carry over to the next month.\n\nIf you exceed your plan thresholds, we will notify you and reserve the right to throttle optimization requests or require an upgrade. Payments are non-refundable, and cancellations will apply to the next billing period.'
    },
    {
      title: '6. Account Delinquency & Workspace Locking',
      content: 'If subscription payments fail, a 7-day grace period is provided. After this period, delinquent workspaces will be locked. A locked workspace denies write operations (uploading and editing assets) and limits api delivery bandwidth, though master files are preserved. Failure to resolve billing within 30 days of locking may result in permanent workspace termination and file erasure.'
    },
    {
      title: '7. Disclaimer of Warranties & Liability limits',
      content: 'OptiDrive services are provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied, including merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that services will be uninterrupted, error-free, or completely secure from external zero-day exploits.\n\nIn no event shall OptiDrive or its operators be liable for any direct, indirect, incidental, or consequential damages resulting from data loss, server downtime, or asset delivery failures. Our maximum aggregate liability is capped at the amount paid by you to OptiDrive during the 12 months preceding the claim.'
    },
    {
      title: '8. Termination and Governing Law',
      content: 'We reserve the right to terminate your access to the platform for any breach of these Terms. These terms shall be governed by and construed in accordance with the laws of the jurisdiction of our business operations, without giving effect to conflicts of law principles. If you have questions regarding these terms, contact us at troutundefined5894@gmail.com.'
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
            <Icon icon="lucide:file-text" width={12} height={12} className="text-indigo-400" />
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
          Terms of Service
        </h1>
        <p className="text-text-muted text-sm sm:text-base mb-12 border-b border-slate-800 print:border-black/20 pb-8">
          Last updated: July 09, 2026. Please read these terms carefully before utilizing our optimization gateway.
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
