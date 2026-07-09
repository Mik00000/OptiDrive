'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import PageHeading from '@/components/PageHeading';
import LandingNav from '@/components/LandingNav';
import Footer from '@/components/Footer';
import { ApiCodePanel } from '@/features/api-docs/ApiCodePanel';
import { DOC_SECTIONS } from '@/features/api-docs/docsData';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import Header from '@/components/Header';

const getIconForSection = (id: string) => {
  switch (id) {
    case 'authentication':
      return 'lucide:key';
    case 'system':
      return 'lucide:activity';
    case 'upload':
      return 'lucide:upload-cloud';
    case 'media':
      return 'lucide:image';
    case 'folders':
      return 'lucide:folder';
    case 'tags':
      return 'lucide:tag';
    case 'trash':
      return 'lucide:trash-2';
    case 'webhooks':
      return 'lucide:webhook';
    case 'analytics':
      return 'lucide:bar-chart-3';
    case 'dynamic-transformations':
      return 'lucide:crop';
    case 'custom-domains':
      return 'lucide:globe';
    default:
      return 'lucide:book-open';
  }
};

export default function ApiDocsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeSectionId, setActiveSectionId] = useState('authentication');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState(0);

  // Reset active endpoint index when section changes
  useEffect(() => {
    setActiveEndpointIndex(0);
  }, [activeSectionId]);

  const activeSection =
    DOC_SECTIONS.find((sec) => sec.id === activeSectionId) || DOC_SECTIONS[0];
  const hasEndpoints = !!(
    activeSection.endpoints && activeSection.endpoints.length > 0
  );

  // Guard against out-of-bounds index during transition
  const validEndpointIndex =
    hasEndpoints &&
    activeSection.endpoints &&
    activeEndpointIndex < activeSection.endpoints.length
      ? activeEndpointIndex
      : 0;

  const activeEndpoint = hasEndpoints
    ? activeSection.endpoints![validEndpointIndex]
    : null;

  const codeSnippets = activeEndpoint
    ? activeEndpoint.codeSnippets
    : activeSection.codeSnippets!;
  const jsonResponse = activeEndpoint
    ? activeEndpoint.jsonResponse
    : activeSection.jsonResponse;

  const renderFormattedText = (text?: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h3
            key={i}
            className="text-text-light mt-5 mb-2 text-base font-semibold first:mt-0"
          >
            {trimmed.replace('###', '').trim()}
          </h3>
        );
      }

      const parts = line.split('`');
      if (parts.length > 1) {
        return (
          <p key={i} className="text-text-muted mb-2 text-sm leading-relaxed">
            {parts.map((part, index) => {
              if (index % 2 === 1) {
                return (
                  <code
                    key={index}
                    className="bg-bg border-border text-accent rounded border px-1.5 py-0.5 font-mono text-xs"
                  >
                    {part}
                  </code>
                );
              }
              return part;
            })}
          </p>
        );
      }
      return (
        <p key={i} className="text-text-muted mb-2 text-sm leading-relaxed">
          {line}
        </p>
      );
    });
  };

  const renderContent = () => {
    return (
      <div className="flex w-full min-w-0 flex-col xl:min-h-0 xl:flex-1 xl:flex-row xl:overflow-hidden">
        {/* Left Column: Navigation Sidebar */}
        <div className="xl:border-border bg-card/20 flex flex-col gap-1 p-4 text-left xl:w-[260px] xl:shrink-0 xl:overflow-y-auto xl:border-r">
          <div className="text-text-muted px-3 py-2 text-xs font-semibold tracking-wider uppercase">
            Getting Started
          </div>
          <button
            onClick={() => setActiveSectionId('authentication')}
            className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              activeSectionId === 'authentication'
                ? 'bg-accent/15 text-accent border-accent/20 border font-bold'
                : 'text-text-muted hover:text-text-light border border-transparent hover:bg-white/5'
            }`}
          >
            <Icon icon={getIconForSection('authentication')} width={18} />
            <span>Authentication</span>
          </button>

          <div className="text-text-muted mt-4 px-3 py-2 text-xs font-semibold tracking-wider uppercase">
            Core APIs
          </div>
          {DOC_SECTIONS.filter((s) => s.id !== 'authentication').map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                activeSectionId === sec.id
                  ? 'bg-accent/15 text-accent border-accent/20 border font-bold'
                  : 'text-text-muted hover:text-text-light border border-transparent hover:bg-white/5'
              }`}
            >
              <Icon icon={getIconForSection(sec.id)} width={18} />
              <span>{sec.title}</span>
            </button>
          ))}
        </div>

        {/* Center Column: Detailed Documentation Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 text-left sm:p-8 xl:overflow-y-auto">
          <div className="border-border flex flex-col gap-2 border-b pb-5">
            <h2 className="text-text-light text-2xl font-bold">
              {activeSection.title}
            </h2>
            <p className="text-text-muted text-sm leading-relaxed">
              {activeSection.description}
            </p>
          </div>

          {/* General Guide for Sections */}
          {activeSection.generalGuide && (
            <div className="flex flex-col gap-1.5">
              {renderFormattedText(activeSection.generalGuide)}
            </div>
          )}

          {/* Global Headers List */}
          {activeSection.headers && activeSection.headers.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-text-light text-sm font-semibold">
                Request Headers
              </h3>
              <div className="border-border bg-card overflow-hidden rounded-xl border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-border bg-table-header/35 text-text-muted border-b text-[10px] font-semibold tracking-wider uppercase">
                      <th className="px-4 py-3">Header</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border text-text-secondary divide-y">
                    {activeSection.headers.map((h) => (
                      <tr
                        key={h.name}
                        className="transition-colors hover:bg-white/5"
                      >
                        <td className="text-text-light px-4 py-3 font-mono font-semibold">
                          {h.name}
                        </td>
                        <td className="text-accent px-4 py-3 font-mono">
                          {h.type}
                        </td>
                        <td className="px-4 py-3">
                          {h.required ? (
                            <span className="rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                              required
                            </span>
                          ) : (
                            <span className="text-text-muted border-border rounded border bg-white/5 px-1.5 py-0.5 text-[10px]">
                              optional
                            </span>
                          )}
                        </td>
                        <td className="text-text-muted px-4 py-3 leading-relaxed">
                          {h.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* List of Endpoints inside the Section */}
          {hasEndpoints && (
            <div className="flex flex-col gap-4">
              <h3 className="text-text-light text-sm font-semibold">
                Endpoints
              </h3>
              <div className="flex flex-col gap-3">
                {activeSection.endpoints!.map((ep, index) => {
                  const isSelected = activeEndpointIndex === index;
                  return (
                    <button
                      key={index}
                      onClick={() => setActiveEndpointIndex(index)}
                      className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4.5 text-left transition-all ${
                        isSelected
                          ? 'border-accent/40 bg-accent/18 shadow-accent/5 shadow-md'
                          : 'border-border bg-card hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                            ep.method === 'POST'
                              ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-400'
                              : ep.method === 'GET'
                                ? 'border-sky-500/25 bg-sky-500/15 text-sky-400'
                                : ep.method === 'PATCH'
                                  ? 'border-amber-500/25 bg-amber-500/15 text-amber-400'
                                  : 'border-rose-500/25 bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <code className="text-text truncate font-mono text-xs font-semibold">
                          {ep.path}
                        </code>
                      </div>
                      <p className="text-text-muted text-xs leading-relaxed">
                        {ep.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Endpoint Request Parameters */}
          {activeEndpoint &&
            activeEndpoint.params &&
            activeEndpoint.params.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-text-light text-sm font-semibold">
                  Request Parameters ({activeEndpoint.method}{' '}
                  {activeEndpoint.path})
                </h3>
                <div className="border-border bg-card overflow-hidden rounded-xl border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-border bg-table-header/35 text-text-muted border-b text-[10px] font-semibold tracking-wider uppercase">
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Required</th>
                        <th className="px-4 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border text-text-secondary divide-y">
                      {activeEndpoint.params.map((p) => (
                        <tr
                          key={p.name}
                          className="transition-colors hover:bg-white/5"
                        >
                          <td className="text-text-light px-4 py-3 font-mono font-semibold">
                            {p.name}
                          </td>
                          <td className="text-accent px-4 py-3 font-mono">
                            {p.type}
                          </td>
                          <td className="px-4 py-3">
                            {p.required ? (
                              <span className="rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                                required
                              </span>
                            ) : (
                              <span className="text-text-muted border-border rounded border bg-white/5 px-1.5 py-0.5 text-[10px]">
                                optional
                              </span>
                            )}
                          </td>
                          <td className="text-text-muted px-4 py-3 leading-relaxed">
                            {p.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

        {/* Right Column: Code Panel */}
        <div className="bg-card border-border flex min-w-0 flex-1 border-t text-left xl:min-h-0 xl:max-w-[500px] xl:border-t-0 xl:border-l 2xl:max-w-[600px]">
          <ApiCodePanel
            codeSnippets={codeSnippets}
            jsonResponse={jsonResponse}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-bg text-text-light flex min-h-screen items-center justify-center">
        <Icon
          icon="lucide:loader-2"
          className="text-accent animate-spin"
          width={36}
        />
      </div>
    );
  }

  // 1. Logged-in developer view: wrapped inside Dashboard layout structure
  if (isAuthenticated) {
    return (
      <SidebarProvider>
        <div className="text-text-light bg-bg flex min-h-screen font-sans xl:h-screen xl:overflow-hidden">
          <Sidebar />
          <main className="relative flex w-full min-w-0 flex-1 flex-col xl:h-full xl:overflow-y-auto">
            <Header className="md:hidden" />
            <div className="flex min-h-0 flex-1 flex-col">
              <PageHeading title="API Documentation" />
              {renderContent()}
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // 2. Public visitor view: wrapped inside public Navbar & Footer
  return (
    <div className="bg-bg text-text-light selection:bg-accent flex min-h-screen w-full flex-col font-sans selection:text-white xl:h-screen xl:overflow-hidden">
      <LandingNav />
      <div className="flex min-h-0 flex-1 flex-col pt-6 xl:h-[calc(100vh-73px)] xl:overflow-hidden">
        <div className="border-border mx-auto w-full shrink-0 border-b px-6 pb-4 md:px-8">
          <div className="max-w-7xl flex flex-col justify-center">
            <h1 className="font-headings text-text-light text-left text-3xl font-bold">
              API Documentation
            </h1>
            <p className="text-text-muted mt-1 text-left text-xs">
              Developer reference and integration guide for OptiDrive APIs
            </p>
          </div>
        </div>
        {renderContent()}
      </div>
      <div className="xl:hidden">
        <Footer />
      </div>
    </div>
  );
}
