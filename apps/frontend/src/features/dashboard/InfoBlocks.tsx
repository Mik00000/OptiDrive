import { Icon } from '@iconify/react';
import { WorkspaceStats } from './api';

interface InfoBlocksProps {
  stats: WorkspaceStats;
}

const InfoBlocks = ({ stats }: InfoBlocksProps) => {
  const bytesToGB = (bytes: string | number) => Math.max(0, Number(bytes) / (1024 * 1024 * 1024)).toFixed(2);
  const bytesToMB = (bytes: string | number) => Math.max(0, Number(bytes) / (1024 * 1024)).toFixed(2);
  
  const savedBytes = Math.max(0, Number(stats.totalBytesSaved) || 0);
  const savedText = savedBytes <= 0 ? "0.00 MB" : savedBytes > 1024 * 1024 * 1024 ? `${bytesToGB(savedBytes)} GB` : `${bytesToMB(savedBytes)} MB`;

  const originalBytes = Number(stats.totalOriginalBytes) || 1;
  const optimizedBytes = Number(stats.totalOptimizedBytes) || 0;
  const avgCompression = Math.max(0, Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100));

  return (
    <section className="scrollbar-hide flex gap-6 overflow-x-scroll sm:overflow-x-hidden">
      <div className="border-border bg-card flex h-auto min-w-40 flex-1 flex-col gap-1.5 rounded-2xl border p-4 sm:gap-2 sm:p-5.25">
        <p className="text-text-muted text-xs sm:text-sm">Total Files</p>
        <div className="flex h-auto flex-wrap items-end justify-between gap-1.5 sm:gap-2">
          <p className="text-text-light text-2xl font-bold sm:text-3xl">{stats.totalFiles.toLocaleString()}</p>
          <div className="sm:bg-success/10 flex items-center gap-1 rounded-full sm:px-2 sm:py-1.25 hidden">
            <Icon
              icon="lucide:image"
              width={16}
              height={16}
              className="text-success"
            />
          </div>
        </div>
      </div>
      <div className="border-border bg-card flex h-auto min-w-40 flex-1 flex-col gap-1.5 rounded-2xl border p-4 sm:gap-2 sm:p-5.25">
        <p className="text-text-muted text-xs sm:text-sm">Bandwidth Saved</p>
        <div className="flex h-auto flex-wrap items-end justify-between gap-1.5 sm:gap-2">
          <p className="text-text-light text-2xl font-bold sm:text-3xl">{savedText}</p>
          <p className="text-text-muted font-regular text-xs sm:text-sm">
            {stats.totalFiles > 0 ? `${avgCompression}% Avg. Compression` : 'No files'}
          </p>
        </div>
      </div>
      <div className="border-border bg-card flex h-auto min-w-40 flex-1 flex-col gap-1.5 rounded-2xl border p-4 sm:gap-2 sm:p-5.25">
        <p className="text-text-muted text-xs sm:text-sm">Monthly Optimizations</p>
        <div className="flex h-auto flex-wrap sm:items-end justify-between gap-1.5 sm:gap-2 flex-col sm:flex-row" >
          <p className="text-text-light text-2xl font-bold sm:text-3xl">{stats.monthlyOptimizations.toLocaleString()}</p>
          <p className="text-text-muted font-regular text-xs sm:text-sm">/ {stats.limits.monthlyOptimizations.toLocaleString()}</p>
        </div>
      </div>
    </section>
  );
};

export default InfoBlocks;
