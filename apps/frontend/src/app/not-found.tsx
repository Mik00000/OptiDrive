"use client";

import Link from 'next/link';
import { Icon } from '@iconify/react';
import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { Button } from '@/components/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      <LandingNav />

      <section className="relative px-6 md:px-16 py-28 flex flex-col items-center justify-center text-center max-w-7xl mx-auto w-full flex-1 z-10">
        {/* Neon Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[300px] rounded-full bg-accent/10 opacity-60 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg">
          {/* Animated Glow Circle with Icon */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute inset-0 rounded-full blur-xl bg-accent/20 animate-pulse" />
            <div className="size-20 rounded-2xl bg-gradient-to-tr from-accent to-accent/50 shadow-2xl shadow-accent/20 flex items-center justify-center animate-bounce">
              <Icon icon="lucide:alert-triangle" width={36} height={36} className="text-white drop-shadow-md" />
            </div>
          </div>

          <h1 className="font-headings font-black text-6xl sm:text-7xl text-text-light leading-none tracking-tight">
            404
          </h1>
          
          <h2 className="font-headings font-bold text-xl sm:text-2xl text-text-light leading-snug">
            Page Not Found
          </h2>
          
          <p className="text-text-muted text-xs sm:text-sm leading-relaxed max-w-xs sm:max-w-sm">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full sm:w-auto">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="accent" className="w-full px-6 py-3 rounded-xl">
                <Icon icon="lucide:home" width={16} />
                <span>Go Back Home</span>
              </Button>
            </Link>
            <Link href="/status" className="w-full sm:w-auto">
              <Button variant="bordered" className="w-full px-6 py-3 rounded-xl border border-border hover:bg-slate-800">
                <Icon icon="lucide:activity" width={16} className="text-text-muted" />
                <span>Check Status</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
