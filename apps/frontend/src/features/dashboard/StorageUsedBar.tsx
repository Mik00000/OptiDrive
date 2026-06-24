import { WorkspaceStats } from './api';

interface StorageUsedBarProps {
  stats: WorkspaceStats;
}

const StorageUsedBar = ({ stats }: StorageUsedBarProps) => {
  const bytesToGB = (bytes: string | number) => (Number(bytes) / (1024 * 1024 * 1024)).toFixed(2);
  const usedGB = bytesToGB(stats.storageUsed);
  const limitGB = bytesToGB(stats.limits.storageBytes);
  const percentage = Math.min(100, Math.round((Number(stats.storageUsed) / Number(stats.limits.storageBytes)) * 100));

  return (
    <section className="border-border bg-card flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border p-5.25">
      <div className="flex items-center justify-between">
        <p className="text-text-light text-sm font-medium">Storage Used ({stats.plan} Plan)</p>
        <p className="text-text-muted font-regular text-sm font-mono">
          {usedGB} GB / {limitGB} GB
        </p>
      </div>
      <div className="bg-bg border-border h-2 w-full rounded-full border">
        <div 
          className="bg-chart-gradient h-full rounded-full" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </section>
  )
}

export default StorageUsedBar
