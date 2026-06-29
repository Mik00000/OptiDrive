'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

type Language = 'JavaScript' | 'cURL' | 'Python' | 'Go';

interface ApiCodePanelProps {
  codeSnippets: {
    JavaScript: string;
    cURL: string;
    Python: string;
    Go: string;
  };
  jsonResponse?: string;
}

export const ApiCodePanel = ({ codeSnippets, jsonResponse }: ApiCodePanelProps) => {
  const [activeTab, setActiveTab] = useState<Language>('JavaScript');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: Language[] = ['JavaScript', 'cURL', 'Python', 'Go'];

  return (
    <div className="flex w-full min-w-0 flex-col xl:h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border sm:px-8">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-light/80 hover:text-text-light hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Button variant="ghost" onClick={handleCopy}>
          <div className="flex items-center gap-2">
            <Icon
              icon={copied ? 'lucide:check' : 'lucide:copy'}
              className="h-4 w-4"
            />
            <span className="hidden md:block">
              {copied ? 'Copied!' : 'Copy Code'}
            </span>
          </div>
        </Button>
      </div>

      <div className="px-5 py-6 sm:px-8 xl:min-h-0 min-w-0 xl:flex-1 xl:overflow-y-auto flex flex-col gap-6">
        <div className="bg-bg border-border relative flex-1 min-h-[250px] overflow-auto rounded-xl border p-4">
          <pre className="text-text-light font-mono text-sm leading-relaxed whitespace-pre">
            <code>{codeSnippets ? codeSnippets[activeTab] : 'Loading code snippets...'}</code>
          </pre>
        </div>

        {jsonResponse && (
          <div>
            <h3 className="text-text-muted mb-3 text-sm font-medium">
              Expected JSON Response
            </h3>
            <div className="bg-bg border-border overflow-auto rounded-xl border p-4 max-h-[300px]">
              <pre className="text-text-light font-mono text-sm leading-relaxed whitespace-pre">
                <code>{jsonResponse}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
