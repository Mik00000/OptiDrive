import { Icon } from "@iconify/react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white/5">
        <Icon icon="lucide:key-round" width={24} className="opacity-40" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-text-light">No active keys</p>
        <p className="text-xs text-text-muted">
          Click &quot;Generate New Key&quot; to create your first one
        </p>
      </div>
    </div>
  );
}
