import { Icon } from '@iconify/react';

const InfoBlocks = () => {
  return (
    <section className="scrollbar-hide flex gap-6 overflow-x-scroll sm:overflow-x-hidden">
      <div className="border-border bg-card flex h-auto min-w-40 flex-1 flex-col gap-1.5 rounded-2xl border p-4 sm:gap-2 sm:p-5.25">
        <p className="text-text-muted text-xs sm:text-sm">Total Requests</p>
        <div className="flex h-auto flex-wrap items-end justify-between gap-1.5 sm:gap-2">
          <p className="text-text-light text-2xl font-bold sm:text-3xl">1,234</p>
          <div className="sm:bg-success/10 flex items-center gap-1 rounded-full sm:px-2 sm:py-1.25">
            <Icon
              icon="lucide:trending-up"
              width={16}
              height={16}
              className="text-success"
            />
            <p className="text-success text-xs font-medium">+12.5%</p>
          </div>
        </div>
      </div>
      <div className="border-border bg-card flex h-auto min-w-40 flex-1 flex-col gap-1.5 rounded-2xl border p-4 sm:gap-2 sm:p-5.25">
        <p className="text-text-muted text-xs sm:text-sm">Bandwidth Saved</p>
        <div className="flex h-auto flex-wrap items-end justify-between gap-1.5 sm:gap-2">
          <p className="text-text-light text-2xl font-bold sm:text-3xl">1.2 TB</p>
          <p className="text-text-muted font-regular text-xs sm:text-sm">
            72% compression
          </p>
        </div>
      </div>
      <div className="border-border bg-card flex h-auto min-w-40 flex-1 flex-col gap-1.5 rounded-2xl border p-4 sm:gap-2 sm:p-5.25">
        <p className="text-text-muted text-xs sm:text-sm">Active API Keys</p>
        <div className="flex h-auto flex-wrap sm:items-end justify-between gap-1.5 sm:gap-2 flex-col sm:flex-row" >
          <p className="text-text-light text-2xl font-bold sm:text-3xl">3</p>
          <p className="text-text-muted font-regular text-xs sm:text-sm">/ 5 Limit</p>
        </div>
      </div>
    </section>
  );
};

export default InfoBlocks;
