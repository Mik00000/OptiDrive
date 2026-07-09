"use client";

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { SOCIAL_LINKS } from '@optidrive/shared';

export default function Footer() {
  return (
    <footer className="bg-sidebar border-t border-border px-6 md:px-16 pt-14 pb-8 w-full mt-auto">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-14">
          {/* Company Info */}
          <div className="flex-[2] flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="size-8 bg-accent rounded-md flex items-center justify-center shadow-md shadow-accent/20">
                <Icon icon="lucide:zap" width={15} height={15} className="text-white" />
              </div>
              <span className="font-headings font-bold text-base text-text-light">OptiDrive</span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed max-w-xs">
              The modern platform for optimizing, compressing, and globally delivering media for developers and businesses.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="size-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-light hover:border-text-muted transition-colors cursor-pointer"
                >
                  <Icon icon={social.iconName} width={16} height={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links Column */}
          {[
            {
              heading: 'Product',
              links: [
                { name: 'Features', href: '/#features' },
                { name: 'Pricing', href: '/pricing' },
                { name: 'Changelog', href: '/changelog' },
              ]
            },
            {
              heading: 'Resources',
              links: [
                { name: 'Documentation', href: '/api-docs' },
                { name: 'API Reference', href: '/api-docs' },
                { name: 'System Status', href: '/status' },
              ]
            },
            {
              heading: 'Company',
              links: [
                { name: 'Contact', href: '/contact' },
              ]
            },
            {
              heading: 'Legal',
              links: [
                { name: 'Privacy Policy', href: '/privacy' },
                { name: 'Terms of Service', href: '/terms' },
                { name: 'DPA', href: '/dpa' },
              ]
            },
          ].map((col, i) => (
            <div key={i} className="flex-1 flex flex-col gap-4">
              <span className="text-sm font-semibold text-text-light">{col.heading}</span>
              <div className="flex flex-col gap-3">
                {col.links.map((link, j) => (
                  <Link
                    key={j}
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-light transition-colors cursor-pointer"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-text-muted">© 2026 OptiDrive, Inc. All rights reserved.</span>
          <span className="text-xs text-text-muted">Made with ♥ for developers worldwide</span>
        </div>
      </div>
    </footer>
  );
}
