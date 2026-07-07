"use client";

import Link from 'next/link';
import { Icon } from '@iconify/react';
import LandingNav from '@/components/LandingNav';
import FeatureCard from '@/components/FeatureCard';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col bg-bg text-text-light font-sans w-full min-h-screen overflow-x-hidden selection:bg-accent selection:text-white">
      {/* ─── НАВІГАЦІЯ ──────────────────────────────────────────────── */}
      <LandingNav />

      {/* ─── HERO СЕКЦІЯ ────────────────────────────────────────────── */}
      <section className="relative px-6 md:px-16 pt-20 md:pt-28 pb-20 md:pb-24 flex flex-col xl:flex-row items-center gap-12 xl:gap-16 max-w-7xl mx-auto w-full">
        {/* М'яке радіальне світіння за Hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] xl:w-[900px] h-[300px] sm:h-[500px] rounded-full bg-accent/10 opacity-60 blur-3xl pointer-events-none" />

        {/* Ліва частина: Текст */}
        <div className="flex-1 flex flex-col gap-6 md:gap-7 z-10 text-center xl:text-left items-center xl:items-start">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-full px-4 py-1.5 w-fit animate-fade-in">
            <div className="size-1.5 rounded-full bg-accent animate-pulse"></div>
            <span className="text-xs font-semibold text-accent">Over 10 billion images monthly</span>
          </div>

          <h1 className="font-headings font-bold text-4xl sm:text-5xl md:text-[56px] leading-[1.1] text-text-light tracking-tight">
            Lightning-fast
            <br />
            <span className="text-accent bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple">media optimization</span>
            <br />
            and delivery
          </h1>

          <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-lg">
            Upload, compress, and deliver images globally in milliseconds. Built for modern developers who need speed, flexibility, and simplicity.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 bg-accent hover:brightness-110 active:scale-95 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-accent/20 cursor-pointer">
                <span>{isAuthenticated ? 'Dashboard' : 'Start for Free'}</span>
                <Icon icon="lucide:arrow-right" width={16} height={16} />
              </button>
            </Link>
            <Link href="/api-docs" className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 border border-border text-text-light font-semibold px-7 py-3.5 rounded-xl text-sm bg-sidebar hover:bg-slate-800/50 hover:border-text-muted active:scale-95 transition-all cursor-pointer">
                <Icon icon="lucide:book" width={16} height={16} className="text-text-muted" />
                <span>Documentation</span>
              </button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-2 text-text-muted">
            {['No credit card required', 'Free plan forever', 'Integration in minutes'].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <Icon icon="lucide:check" width={14} height={14} className="text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Права частина: Мокап дашборду */}
        <div className="flex-1 z-10 w-full max-w-2xl xl:max-w-none">
          {/* Світіння під карткою */}
          <div className="relative bg-sidebar border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/40 group hover:border-accent/30 transition-colors duration-300">
            {/* Верхня панель мокапу */}
            <div className="bg-[#0a1020] px-5 py-3.5 flex items-center gap-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-error opacity-70"></div>
                <div className="size-3 rounded-full bg-yellow-500 opacity-70"></div>
                <div className="size-3 rounded-full bg-success opacity-70"></div>
              </div>
              <div className="flex-1 mx-4 bg-[#111827] border border-border rounded-md px-3 py-1 text-xs text-text-muted text-center select-none font-mono">
                app.optidrive.com/media
              </div>
            </div>

            {/* Вміст мокапу */}
            <div className="flex min-h-[300px]">
              {/* Міні-сайдбар */}
              <div className="w-14 bg-[#0a1020] border-r border-border flex flex-col items-center py-4 gap-5 select-none shrink-0">
                <div className="size-7 bg-accent rounded-md flex items-center justify-center shadow-md shadow-accent/20">
                  <Icon icon="lucide:zap" width={14} height={14} className="text-white" />
                </div>
                {['layout-dashboard', 'image', 'key', 'book', 'settings'].map((ic, i) => (
                  <div key={i} className={`size-8 rounded-lg flex items-center justify-center transition-colors ${i === 1 ? 'bg-accent/20 text-accent' : 'text-text-muted'}`}>
                    <Icon icon={`lucide:${ic}`} width={16} />
                  </div>
                ))}
              </div>

              {/* Зона контенту */}
              <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-text-light">Media Library</span>
                  <div className="flex items-center gap-1.5 text-xs bg-accent text-white px-3 py-1.5 rounded-lg shadow-sm">
                    <Icon icon="lucide:upload" width={12} height={12} />
                    <span>Upload</span>
                  </div>
                </div>

                {/* Таблиця файлів */}
                <div className="bg-bg rounded-xl border border-border overflow-x-auto">
                  <div className="min-w-[460px]">
                    <div className="flex items-center px-4 py-2.5 border-b border-border gap-3 bg-[#0f172a]/40 text-xs font-semibold text-text-muted">
                      <div className="size-3 rounded bg-border"></div>
                      <div className="flex-1">File Name</div>
                      <div className="w-16">Format</div>
                      <div className="w-16">Original</div>
                      <div className="w-16">Optimized</div>
                      <div className="w-16 text-right text-success">Savings</div>
                    </div>
                    {[
                      ['hero-banner.png', 'WebP', '2.4 MB', '450 KB', '-81%'],
                      ['product-shot.jpg', 'AVIF', '1.2 MB', '150 KB', '-87%'],
                      ['logo-mark.png', 'PNG', '300 KB', '85 KB', '-71%'],
                      ['bg-pattern.svg', 'SVG', '45 KB', '12 KB', '-73%'],
                    ].map(([name, fmt, orig, opt, sav], ri) => (
                      <div key={ri} className="flex items-center px-4 py-3 border-b border-border/40 gap-3 last:border-0 hover:bg-sidebar/30 transition-colors">
                        <div className="size-3 rounded-sm border border-border"></div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="size-5 rounded bg-[#111827] border border-border flex items-center justify-center shrink-0">
                            <Icon icon="lucide:image" width={10} className="text-text-muted" />
                          </div>
                          <span className="text-[11px] text-text-light font-medium truncate">{name}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-text-muted px-1.5 py-0.5 rounded font-mono w-16 text-center">{fmt}</span>
                        <span className="text-[10px] text-text-muted w-16 font-mono">{orig}</span>
                        <span className="text-[10px] text-text-light w-16 font-mono">{opt}</span>
                        <span className="text-[10px] text-success font-semibold font-mono w-16 text-right">{sav}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── СЕКЦІЯ ЛОГОТИПІВ ────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-12 border-y border-border bg-sidebar/30 select-none">
        <div className="max-w-7xl mx-auto w-full">
          <p className="text-center text-xs font-semibold text-text-muted uppercase tracking-widest mb-8">
            Optimizing media for modern development teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-40">
            {['Vercel', 'Netlify', 'Stripe', 'Linear', 'Planetscale', 'Railway'].map((co, i) => (
              <div key={i} className="font-headings font-bold text-lg md:text-xl text-text-light tracking-tight hover:opacity-100 transition-opacity">
                {co}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── СЕКЦІЯ МОЖЛИВОСТЕЙ (FEATURES) ──────────────────────────── */}
      <section id="features" className="px-6 md:px-16 py-20 md:py-24 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="text-center mb-16 flex flex-col gap-4 items-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5">
            <Icon icon="lucide:sparkles" width={12} height={12} className="text-accent" />
            <span className="text-xs font-semibold text-accent">Why OptiDrive?</span>
          </div>
          <h2 className="font-headings font-bold text-3xl md:text-4xl text-text-light leading-tight">
            Everything you need for your media files,
            <br />
            and nothing you don&apos;t
          </h2>
          <p className="text-text-muted max-w-lg text-sm sm:text-base leading-relaxed">
            A complete and reliable media pipeline for fast-moving development teams that need high performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon="globe" 
            title="Global CDN" 
            description="Instant delivery of optimized images from 200+ edge locations worldwide. Guaranteed sub-50ms response times." 
          />
          <FeatureCard 
            icon="image" 
            title="Smart Optimization" 
            description="Automatic lossless compression, conversion to WebP/AVIF, and on-the-fly resizing based on the device." 
          />
          <FeatureCard 
            icon="code-2" 
            title="SDKs & Developer API" 
            description="Flexible REST API with ready-to-use client libraries for Node, Python, Go, and more. Integrate in minutes." 
          />
          <FeatureCard 
            icon="users" 
            title="Team Workspace" 
            description="Shared media libraries, role-based access control, and comprehensive audit logs for security." 
          />
          <FeatureCard 
            icon="shield-check" 
            title="Enterprise-grade Security" 
            description="Data encryption, signed URLs for private access, and security tokens to protect your media assets." 
          />
          <FeatureCard 
            icon="bar-chart-2" 
            title="Detailed Analytics" 
            description="Analyze request volume, bandwidth savings, and cache hit rates in real-time." 
          />
        </div>
      </section>

      {/* ─── СЕКЦІЯ ДЛЯ РОЗРОБНИКІВ ─────────────────────────────────── */}
      <section id="developer" className="px-6 md:px-16 py-20 md:py-24 bg-sidebar border-y border-border scroll-mt-20">
        <div className="max-w-7xl mx-auto w-full flex flex-col xl:flex-row items-center gap-12 xl:gap-20">
          {/* Ліва сторона: Текст */}
          <div className="flex-1 flex flex-col gap-6 md:gap-7 items-center xl:items-start text-center xl:text-left">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 w-fit">
              <Icon icon="lucide:terminal" width={12} height={12} className="text-accent" />
              <span className="text-xs font-semibold text-accent">Built for Developers</span>
            </div>
            <h2 className="font-headings font-bold text-3xl md:text-4xl text-text-light leading-tight">
              Simple integration in minutes,
              <br />
              not days
            </h2>
            <p className="text-text-muted leading-relaxed text-sm sm:text-base max-w-xl">
              Transparent and predictable REST API that easily fits into any tech stack. Just upload an image and get a link to a fast CDN. No complex configurations.
            </p>
            <div className="flex flex-col gap-3.5 text-left w-full max-w-md">
              {[
                'Full TypeScript SDK with typed responses',
                'Webhook support for asynchronous processing tasks',
                'OpenAPI specification — one-click import to Postman'
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-text-muted">
                  <Icon icon="lucide:check-circle" width={16} height={16} className="text-success mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Link href="/api-docs">
                <button className="flex items-center gap-2 border border-border text-text-light font-semibold px-5 py-3 rounded-xl text-sm bg-bg hover:bg-slate-800/50 hover:border-text-muted active:scale-95 transition-all cursor-pointer">
                  <Icon icon="lucide:book-open" width={15} className="text-text-muted" />
                  <span>Explore API Reference</span>
                  <Icon icon="lucide:arrow-right" width={14} className="text-text-muted" />
                </button>
              </Link>
            </div>
          </div>

          {/* Права сторона: Блок коду */}
          <div className="flex-1 w-full max-w-2xl bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            {/* Заголовок редактора коду */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 bg-[#0a0a0f] select-none">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-error opacity-70"></div>
                <div className="size-3 rounded-full bg-yellow-500 opacity-70"></div>
                <div className="size-3 rounded-full bg-success opacity-70"></div>
              </div>
              <div className="flex gap-3 ml-4">
                <span className="text-xs text-gray-400 bg-gray-900 border border-gray-700 rounded px-2 py-1 font-mono">upload.ts</span>
                <span className="text-xs text-gray-600 px-2 py-1 font-mono">result.json</span>
              </div>
            </div>
            
            {/* Тіло коду */}
            <div className="p-6 flex flex-col gap-1 text-xs md:text-[13px] font-mono leading-6 overflow-x-auto text-left select-none">
              <div><span className="text-purple-400">import</span><span className="text-gray-300"> {"{ OptiDrive }"} </span><span className="text-purple-400">from</span><span className="text-green-400"> {"'optidrive'"}</span><span className="text-gray-300">;</span></div>
              <div className="h-1"></div>
              <div><span className="text-blue-400">const</span><span className="text-gray-300"> client </span><span className="text-blue-300">=</span><span className="text-blue-400"> new</span><span className="text-yellow-300"> OptiDrive</span><span className="text-gray-300">{"({"}</span></div>
              <div><span className="text-gray-300">{"  "}</span><span className="text-sky-300">apiKey</span><span className="text-gray-300">: </span><span className="text-green-400">process.env.OPTIDRIVE_KEY</span></div>
              <div><span className="text-gray-300">{"});"}</span></div>
              <div className="h-1"></div>
              <div><span className="text-blue-400">const</span><span className="text-gray-300"> result </span><span className="text-blue-300">=</span><span className="text-purple-400"> await</span><span className="text-gray-300"> client.</span><span className="text-yellow-300">upload</span><span className="text-gray-300">{"({"}</span></div>
              <div><span className="text-gray-300">{"  "}</span><span className="text-sky-300">file</span><span className="text-gray-300">: imagePath,</span></div>
              <div><span className="text-gray-300">{"  "}</span><span className="text-sky-300">format</span><span className="text-gray-300">: </span><span className="text-green-400">{"'webp'"}</span><span className="text-gray-300">,</span></div>
              <div><span className="text-gray-300">{"  "}</span><span className="text-sky-300">quality</span><span className="text-gray-300">: </span><span className="text-orange-400">85</span></div>
              <div><span className="text-gray-300">{"});"}</span></div>
              <div className="h-2"></div>
              <div><span className="text-gray-500">{"// → { url: 'https://cdn.optidrive.com/img_9x2.webp',"}</span></div>
              <div><span className="text-gray-500">{"//     savings: '81%', width: 1200, height: 628 }"}</span></div>
            </div>

            {/* Результат завантаження */}
            <div className="mx-6 mb-6 flex items-center gap-3 bg-success/10 border border-success/20 rounded-lg px-4 py-3 select-none">
              <Icon icon="lucide:check-circle" width={16} className="text-success" />
              <span className="text-xs font-semibold text-success">Uploaded in 142 ms</span>
              <span className="ml-auto text-xs text-text-muted font-mono">Compressed by 81%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── СЕКЦІЯ ТАРИФІВ (PRICING) ───────────────────────────────── */}
      <section id="pricing" className="px-6 md:px-16 py-20 md:py-24 max-w-7xl mx-auto w-full scroll-mt-20">
        <div className="text-center mb-16 flex flex-col gap-4 items-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5">
            <Icon icon="lucide:credit-card" width={12} height={12} className="text-accent" />
            <span className="text-xs font-semibold text-accent">Simple Pricing</span>
          </div>
          <h2 className="font-headings font-bold text-3xl md:text-4xl text-text-light leading-tight">
            Choose your optimization plan
          </h2>
          <p className="text-text-muted max-w-lg text-sm sm:text-base leading-relaxed">
            Start for free and scale as your project grows. No hidden fees.
          </p>
        </div>

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
                  <span>1 GB Storage</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>10 GB Bandwidth/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>500 Optimizations/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>1 API Key & 2 Members</span>
                </li>
              </ul>
            </div>
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full mt-8">
              <button className="w-full py-3 px-4 rounded-xl border border-border hover:bg-slate-800 text-xs font-semibold text-text-light transition-colors cursor-pointer">
                Get Started
              </button>
            </Link>
          </div>

          {/* Pro Plan (Popular) */}
          <div className="bg-sidebar border-2 border-accent rounded-2xl p-8 flex flex-col justify-between relative shadow-xl shadow-accent/5 hover:shadow-accent/10 transition-shadow">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-accent text-white px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Popular
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-text-light">Pro</h3>
                <p className="text-xs text-text-muted mt-1">For startups and growing websites</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text-light">$29</span>
                <span className="text-xs text-text-muted">/ month</span>
              </div>
              <div className="my-2 border-t border-border" />
              <ul className="flex flex-col gap-3 text-xs text-text-muted">
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-accent" width={16} />
                  <span className="text-text-light"><strong>50 GB</strong> Storage</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-accent" width={16} />
                  <span className="text-text-light"><strong>500 GB</strong> Bandwidth/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-accent" width={16} />
                  <span className="text-text-light"><strong>10,000</strong> Optimizations/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-accent" width={16} />
                  <span>10 API Keys & 10 Members</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-accent" width={16} />
                  <span>1 Custom Domain & 5 Webhooks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-accent" width={16} />
                  <span>Watermarking, WebP & AVIF</span>
                </li>
              </ul>
            </div>
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full mt-8">
              <button className="w-full py-3 px-4 rounded-xl bg-accent hover:brightness-110 active:scale-95 text-xs font-semibold text-white transition-all shadow-md shadow-accent/20 cursor-pointer">
                Try Pro
              </button>
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-sidebar border border-border rounded-2xl p-8 flex flex-col justify-between hover:border-text-muted transition-colors duration-300">
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-lg font-bold text-text-light">Enterprise</h3>
                <p className="text-xs text-text-muted mt-1">For scale-ups and custom setups</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-text-light">Custom</span>
                <span className="text-xs text-text-muted">/ from $99/mo</span>
              </div>
              <div className="my-2 border-t border-border" />
              <ul className="flex flex-col gap-3 text-xs text-text-muted">
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span><strong>250 GB+</strong> Storage (scalable)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span><strong>2 TB+</strong> Bandwidth/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span className="text-indigo-400 font-semibold">Bring your own S3 storage (BYOS)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Unlimited Custom Domains & Webhooks</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Audit Logs & Custom RBAC Roles</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="text-success" width={16} />
                  <span>Dedicated Support (SLA)</span>
                </li>
              </ul>
            </div>
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="w-full mt-8">
              <button className="w-full py-3 px-4 rounded-xl border border-border hover:bg-slate-800 text-xs font-semibold text-text-light transition-colors cursor-pointer">
                Contact Sales
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── СТАТИСТИЧНА СМУГА (STATS) ───────────────────────────────── */}
      <section className="px-6 md:px-16 py-16 flex flex-col md:flex-row items-center justify-around border-y border-border bg-sidebar/10 gap-10 md:gap-4 max-w-screen mx-auto w-full select-none">
        {[
          { val: '10B+', label: 'Images Monthly' },
          { val: '200+', label: 'Global CDN Edge Locations' },
          { val: '99.99%', label: 'Guaranteed Uptime' },
          { val: '< 50 ms', label: 'Server Response Time' },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 text-center">
            <span className="font-headings font-black text-3xl sm:text-4xl text-text-light">{stat.val}</span>
            <span className="text-xs sm:text-sm text-text-muted font-medium">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* ─── НИЖНІЙ CTA БЛОК ─────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-20 md:py-28 flex flex-col items-center justify-center text-center relative overflow-hidden max-w-screen mx-auto w-full">
        <div className="absolute inset-0 bg-accent/[0.02] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[150px] sm:h-[300px] rounded-full bg-accent/5 opacity-50 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 md:gap-7 max-w-2xl">
          <h2 className="font-headings font-bold text-3xl sm:text-4xl md:text-5xl text-text-light leading-tight">
            Ready to optimize your
            <br />
            <span className="text-accent bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple">media pipeline?</span>
          </h2>
          <p className="text-text-muted text-sm sm:text-lg">
            Join thousands of developers and companies who trust OptiDrive for fast and reliable image delivery.
          </p>
          <Link href={isAuthenticated ? "/dashboard" : "/register"} className="mt-2 w-full sm:w-auto">
            <button className="flex w-full items-center justify-center gap-2 bg-accent hover:brightness-110 active:scale-95 text-white font-semibold px-8 py-4 rounded-xl text-sm sm:text-base transition-all shadow-lg shadow-accent/25 cursor-pointer">
              <span>Create a Free Account</span>
              <Icon icon="lucide:arrow-right" width={18} height={18} />
            </button>
          </Link>
          <span className="text-[11px] text-text-muted font-medium">
            No credit card required · Free plan includes 5 GB storage and 50 GB bandwidth
          </span>
        </div>
      </section>

      {/* ─── ФУТЕР (FOOTER) ─────────────────────────────────────────── */}
      <footer className="bg-sidebar border-t border-border px-6 md:px-16 pt-14 pb-8 w-full mt-auto">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-14">
            {/* Опис компанії */}
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
                {['github', 'twitter', 'linkedin'].map((sn, i) => (
                  <a key={i} href="#" className="size-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-light hover:border-text-muted transition-colors cursor-pointer">
                    <Icon icon={`lucide:${sn}`} width={16} height={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Списки посилань */}
            {[
              { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { heading: 'Resources', links: ['Documentation', 'API Reference', 'System Status', 'SDK Libraries'] },
              { heading: 'Company', links: ['About Us', 'Blog', 'Careers', 'Contact'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'DPA', 'Security'] },
            ].map((col, i) => (
              <div key={i} className="flex-1 flex flex-col gap-4">
                <span className="text-sm font-semibold text-text-light">{col.heading}</span>
                <div className="flex flex-col gap-3">
                  {col.links.map((link, j) => (
                    <a key={j} href="#" className="text-sm text-text-muted hover:text-text-light transition-colors cursor-pointer">{link}</a>
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
    </div>
  );
}
