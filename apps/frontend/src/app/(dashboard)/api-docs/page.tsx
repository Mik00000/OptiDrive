"use client";

import { ReactNode, useState } from 'react';
import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import { Icon } from '@iconify/react';
import { ApiCodePanel } from '../../../features/api-docs/ApiCodePanel';
import { FullReferenceModal } from '@/features/api-docs/FullReferenceModal';

const CodeBadge = ({ children }: { children: ReactNode }) => (
  <span className="bg-card border-border text-text-light rounded-lg border px-1.5 py-[1.5px] font-mono">
    {children}
  </span>
);

const API_STEPS = [
  {
    title: 'Authentication',
    description: (
      <>
        All API requests require an API key to be passed in the headers. Generate
        a key from the API Keys dashboard and include it using the{' '}
        <CodeBadge>x-api-key</CodeBadge> header.
      </>
    ),
  },
  {
    title: 'Prepare FormData',
    description: (
      <>
        We accept multipart/form-data for file uploads. Attach your file under
        the <CodeBadge>image</CodeBadge> field. You can also pass optional
        parameters like <CodeBadge>format</CodeBadge> (webp, avif, png, jpeg) or{' '}
        <CodeBadge>quality</CodeBadge> (1-100).
      </>
    ),
  },
  {
    title: 'Make the Request',
    description: (
      <>
        Send a POST request to our upload endpoint. The response will contain the
        CDN URL of your newly optimized image, ready to be served to your users.
      </>
    ),
  },
];

const ApiDocsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="dashboard-page flex flex-col xl:h-full relative">
      <PageHeading title="API Documentation">
        <Button variant="accent" mobileBehavior="icon-only" onClick={() => setIsModalOpen(true)}>
          <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
            <Icon icon="lucide:external-link" width="100%" height="100%" />
          </div>
          <span>Full Reference</span>
        </Button>
      </PageHeading>
      
      {/* На екранах < xl — колонка; на xl+ — рядок з фіксованою висотою */}
      <div className="flex flex-col xl:flex-row xl:flex-1 xl:min-h-0 min-w-0 xl:overflow-hidden">
        
        {/* Ліва колонка: кроки */}
        <div className="flex flex-col gap-2 p-6 sm:p-8 xl:w-[450px] 2xl:w-[500px] xl:shrink-0 xl:overflow-y-auto">
          <h2 className="text-text-light text-2xl font-bold">
            Upload &amp; Optimize
          </h2>
          <p className="text-text-muted text-sm">
            Learn how to upload images to OptiDrive and receive optimized CDN URLs
            instantly.
          </p>
          
          <ol className="flex flex-col gap-6 py-4 sm:gap-8 sm:py-6 [counter-reset:section]">
            {API_STEPS.map((step, index) => (
              <li key={index} className="bg-card border-border flex gap-4 rounded-2xl border p-4 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0">
                <div className="text-accent bg-accent/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm leading-none font-semibold [counter-increment:section] before:content-[counter(section)]"></div>
                <div className="flex flex-col gap-2">
                  <p className="text-text-light text-base font-medium sm:text-lg">
                    {step.title}
                  </p>
                  <p className="text-text-muted text-sm font-medium">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        
        {/* Права колонка: панель коду */}
        <div className="bg-card flex flex-1 min-w-0 border-border border-t xl:border-t-0 xl:border-l xl:min-h-0">
          <ApiCodePanel />
        </div>
      </div>
      
      <FullReferenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default ApiDocsPage;