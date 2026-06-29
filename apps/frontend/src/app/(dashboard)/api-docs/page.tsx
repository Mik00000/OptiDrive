"use client";

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import PageHeading from '@/components/PageHeading';
import { ApiCodePanel } from '@/features/api-docs/ApiCodePanel';
import { DOC_SECTIONS } from '@/features/api-docs/docsData';

const getIconForSection = (id: string) => {
  switch (id) {
    case 'authentication': return 'lucide:key';
    case 'upload': return 'lucide:upload-cloud';
    case 'media': return 'lucide:image';
    case 'folders': return 'lucide:folder';
    case 'tags': return 'lucide:tag';
    case 'trash': return 'lucide:trash-2';
    case 'webhooks': return 'lucide:webhook';
    default: return 'lucide:book-open';
  }
};

export default function ApiDocsPage() {
  const [activeSectionId, setActiveSectionId] = useState('authentication');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState(0);

  // Reset active endpoint index when section changes
  useEffect(() => {
    setActiveEndpointIndex(0);
  }, [activeSectionId]);

  const activeSection = DOC_SECTIONS.find((sec) => sec.id === activeSectionId) || DOC_SECTIONS[0];
  const hasEndpoints = !!(activeSection.endpoints && activeSection.endpoints.length > 0);
  
  // Guard against out-of-bounds index during transition
  const validEndpointIndex = hasEndpoints && activeSection.endpoints && activeEndpointIndex < activeSection.endpoints.length 
    ? activeEndpointIndex 
    : 0;
    
  const activeEndpoint = hasEndpoints ? activeSection.endpoints![validEndpointIndex] : null;

  const codeSnippets = activeEndpoint ? activeEndpoint.codeSnippets : activeSection.codeSnippets!;
  const jsonResponse = activeEndpoint ? activeEndpoint.jsonResponse : activeSection.jsonResponse;

  const renderFormattedText = (text?: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h3 key={i} className="text-base font-semibold text-text-light mt-5 mb-2 first:mt-0">
            {trimmed.replace('###', '').trim()}
          </h3>
        );
      }
      
      const parts = line.split('`');
      if (parts.length > 1) {
        return (
          <p key={i} className="text-text-muted text-sm leading-relaxed mb-2">
            {parts.map((part, index) => {
              if (index % 2 === 1) {
                return (
                  <code key={index} className="bg-bg border border-border text-accent px-1.5 py-0.5 rounded font-mono text-xs">
                    {part}
                  </code>
                );
              }
              return part;
            })}
          </p>
        );
      }
      return <p key={i} className="text-text-muted text-sm leading-relaxed mb-2">{line}</p>;
    });
  };

  return (
    <section className="dashboard-page flex flex-col xl:h-full relative">
      <PageHeading title="API Documentation" />
      
      {/* 3-Column Layout: Sidebar -> Content -> Code Panel */}
      <div className="flex flex-col xl:flex-row xl:flex-1 xl:min-h-0 min-w-0 xl:overflow-hidden">
        
        {/* Left Column: Navigation Sidebar */}
        <div className="flex flex-col gap-1 p-4 xl:w-[260px] xl:shrink-0 xl:border-r xl:border-border xl:overflow-y-auto bg-card/20">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Getting Started
          </div>
          <button
            onClick={() => setActiveSectionId('authentication')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeSectionId === 'authentication'
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-text-muted hover:text-text-light hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon icon={getIconForSection('authentication')} width={18} />
            <span>Authentication</span>
          </button>
          
          <div className="px-3 py-2 mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Core APIs
          </div>
          {DOC_SECTIONS.filter(s => s.id !== 'authentication').map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSectionId(sec.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSectionId === sec.id
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-text-muted hover:text-text-light hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon icon={getIconForSection(sec.id)} width={18} />
              <span>{sec.title}</span>
            </button>
          ))}
        </div>
        
        {/* Center Column: Detailed Documentation Content */}
        <div className="flex-1 p-6 sm:p-8 xl:overflow-y-auto flex flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-2 border-b border-border pb-5">
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
              <h3 className="text-sm font-semibold text-text-light">
                Request Headers
              </h3>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-table-header/35 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3">Header</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-secondary">
                    {activeSection.headers.map((h) => (
                      <tr key={h.name} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-text-light">{h.name}</td>
                        <td className="px-4 py-3 font-mono text-accent">{h.type}</td>
                        <td className="px-4 py-3">
                          {h.required ? (
                            <span className="text-rose-400 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px] border border-rose-500/20">
                              required
                            </span>
                          ) : (
                            <span className="text-text-muted text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-border">
                              optional
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted leading-relaxed">{h.description}</td>
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
              <h3 className="text-sm font-semibold text-text-light">Endpoints</h3>
              <div className="flex flex-col gap-3">
                {activeSection.endpoints!.map((ep, index) => {
                  const isSelected = activeEndpointIndex === index;
                  return (
                    <button
                      key={index}
                      onClick={() => setActiveEndpointIndex(index)}
                      className={`text-left rounded-xl border p-4.5 transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'border-accent/40 bg-accent/18 shadow-md shadow-accent/5'
                          : 'border-border bg-card hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                          ep.method === 'POST' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                          ep.method === 'GET' ? 'bg-sky-500/15 text-sky-400 border-sky-500/25' :
                          ep.method === 'PATCH' ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                          'bg-rose-500/15 text-rose-400 border-rose-500/25'
                        }`}>
                          {ep.method}
                        </span>
                        <code className="text-xs font-mono font-semibold text-text truncate">
                          {ep.path}
                        </code>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {ep.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Endpoint Request Parameters */}
          {activeEndpoint && activeEndpoint.params && activeEndpoint.params.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-text-light">
                Request Parameters ({activeEndpoint.method} {activeEndpoint.path})
              </h3>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-table-header/35 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-secondary">
                    {activeEndpoint.params.map((p) => (
                      <tr key={p.name} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-text-light">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-accent">{p.type}</td>
                        <td className="px-4 py-3">
                          {p.required ? (
                            <span className="text-rose-400 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px] border border-rose-500/20">
                              required
                            </span>
                          ) : (
                            <span className="text-text-muted text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-border">
                              optional
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted leading-relaxed">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Column: Code Panel */}
        <div className="bg-card flex flex-1 min-w-0 border-border border-t xl:border-t-0 xl:border-l xl:min-h-0 xl:max-w-[500px] 2xl:max-w-[600px]">
          <ApiCodePanel 
            codeSnippets={codeSnippets} 
            jsonResponse={jsonResponse} 
          />
        </div>
      </div>
    </section>
  );
}