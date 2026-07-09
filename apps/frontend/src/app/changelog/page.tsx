"use client";

import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Icon } from '@iconify/react';

export default function ChangelogPage() {
  const releases = [
    {
      version: 'v1.2.0',
      date: 'July 8, 2026',
      title: 'Advanced Rate Limiters & Public API Expansion',
      description: 'We have updated our internal and public APIs to support secure, scoped tokens with fine-grained rate limits.',
      tags: ['API', 'Security', 'Features'],
      changes: [
        'Implemented global rate limiting middleware: 100 requests/min for Free workspaces, 1000 requests/min for Pro workspaces.',
        'Added dynamic fallback for Custom Domains verification to allow direct edge deliveries.',
        'Upgraded dashboard core rendering: pre-compiled and bundled SVG assets locally to eliminate FCP network delays.',
        'Fixed historical session restoration bug (bfcache) which occasionally froze the dashboard in loading states.'
      ]
    },
    {
      version: 'v1.1.0',
      date: 'June 20, 2026',
      title: 'Custom Storage Integration & Webhooks Engine',
      description: 'Users can now bring their own AWS S3, Cloudflare R2, or Backblaze B2 storage containers, with automated workspace migration.',
      tags: ['Storage', 'Webhooks', 'Cloud'],
      changes: [
        'Added full custom S3 compatibility support to store master images in your own cloud accounts.',
        'Built background workspace S3 migration engine: move media assets from OptiDrive default storage to custom S3 securely with zero downtime.',
        'Introduced real-time webhooks integration: receive payloads upon successful image compression or optimization errors.',
        'Launched real-time bandwidth & storage alerts in the side panel for Pro workspaces.'
      ]
    },
    {
      version: 'v1.0.0',
      date: 'June 01, 2026',
      title: 'OptiDrive Platform Public Launch',
      description: 'The smart asset pipeline for developers and media-heavy applications is now live.',
      tags: ['General', 'Launch'],
      changes: [
        'Launched modern developer dashboard with active compression ratio statistics.',
        'Built real-time image compression engine supporting WebP, AVIF, JPEG, and PNG conversions.',
        'Integrated OpenAPI-compliant API Explorer for test queries from the browser.',
        'Enabled automatic metadata stripping, size bounding, and format-auto-negotiation headers.'
      ]
    }
  ];

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative px-6 md:px-16 pt-16 pb-12 flex flex-col items-center text-center max-w-7xl mx-auto w-full z-10">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-accent/10 opacity-55 blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-6">
          <Icon icon="lucide:book-open" width={12} height={12} className="text-accent" />
          <span className="text-xs font-semibold text-accent">Product Updates</span>
        </div>

        <h1 className="font-headings font-bold text-4xl md:text-5xl text-text-light leading-tight mb-4 max-w-2xl">
          Changelog & Release Notes
        </h1>
        <p className="text-text-muted max-w-lg text-sm sm:text-base leading-relaxed mb-8">
          Follow the progress and new capabilities we regularly ship to OptiDrive.
        </p>
      </section>

      {/* Changelog Timeline */}
      <section className="px-6 md:px-16 pb-20 max-w-3xl mx-auto w-full z-10">
        <div className="relative border-l border-border pl-6 sm:pl-8 ml-2 sm:ml-4 flex flex-col gap-16">
          {releases.map((release, i) => (
            <div key={i} className="relative">
              {/* Timeline marker */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 size-4 rounded-full border-4 border-bg bg-accent ring-4 ring-accent/10" />

              {/* Card info */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="bg-accent/10 border border-accent/20 text-accent text-xs font-bold px-2.5 py-1 rounded-md">
                    {release.version}
                  </span>
                  <span className="text-xs text-text-muted">{release.date}</span>
                </div>

                <h2 className="font-headings font-bold text-xl md:text-2xl text-text-light mt-1">
                  {release.title}
                </h2>
                
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
                  {release.description}
                </p>

                {/* Tags */}
                <div className="flex gap-1.5 mt-1">
                  {release.tags.map((tag, j) => (
                    <span key={j} className="text-[10px] bg-slate-800 text-text-light font-medium px-2 py-0.5 rounded border border-border/40">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="bg-sidebar border border-border/80 rounded-xl p-5 sm:p-6 mt-4">
                  <span className="text-xs font-bold text-text-light uppercase tracking-wider block mb-3">Key Changes:</span>
                  <ul className="flex flex-col gap-3">
                    {release.changes.map((change, k) => (
                      <li key={k} className="flex items-start gap-2.5 text-xs text-text-muted leading-relaxed">
                        <Icon icon="lucide:check-circle" className="text-success shrink-0 mt-0.5" width={14} />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
