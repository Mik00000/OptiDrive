import { WorkspaceStats } from './api';

interface StorageUsedBarProps {
  stats: WorkspaceStats;
}

const StorageUsedBar = ({ stats }: StorageUsedBarProps) => {
  const bytesToGB = (bytes: string | number) => (Number(bytes) / (1024 * 1024 * 1024)).toFixed(2);
  
  // Storage Calculations
  const usedGB = bytesToGB(stats.storageUsed);
  const limitGB = bytesToGB(stats.limits.storageBytes);
  const percentage = Math.min(100, Math.round((Number(stats.storageUsed) / Number(stats.limits.storageBytes)) * 100));

  // Bandwidth Calculations
  const bandwidthUsedGB = bytesToGB(stats.bandwidthUsed);
  const bandwidthLimitGB = bytesToGB(stats.limits.bandwidthBytes);
  const bandwidthPercentage = Math.min(100, Math.round((Number(stats.bandwidthUsed) / Number(stats.limits.bandwidthBytes)) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {/* Storage Bar */}
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

      {/* Bandwidth Bar */}
      <section className="border-border bg-card flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border p-5.25">
        <div className="flex items-center justify-between">
          <p className="text-text-light text-sm font-medium">Bandwidth Used ({stats.plan} Plan)</p>
          <p className="text-text-muted font-regular text-sm font-mono">
            {bandwidthUsedGB} GB / {bandwidthLimitGB} GB
          </p>
        </div>
        <div className="bg-bg border-border h-2 w-full rounded-full border">
          <div 
            className="bg-gradient-to-r from-purple to-accent h-full rounded-full" 
            style={{ width: `${bandwidthPercentage}%` }}
          ></div>
        </div>
      </section>
    </div>
  );
};

export default StorageUsedBar;

