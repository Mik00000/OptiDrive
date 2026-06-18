import { Icon } from "@iconify/react";

export function SecurityNotice() {
  return (
    <div className="border-accent/20 bg-accent/10 flex gap-3 rounded-2xl border p-4 lg:p-5">
      <Icon
        icon="lucide:shield-alert"
        width={20}
        className="text-accent mt-0.5 shrink-0"
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-light">
          Keep your keys secret
        </p>
        <p className="text-sm font-medium text-text-muted">
          API keys grant full access to your OptiDrive account. Do not
          share them publicly or commit them to version control. If a key
          is compromised, revoke it immediately.
        </p>
      </div>
    </div>
  );
}
