import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { type ApiKey, PERMISSION_BADGE } from "./types";

interface ApiKeyCardProps {
  apiKey:   ApiKey;
  onRevoke: (id: string) => void;
  onCopy:   (id: string, token: string) => void;
  copiedId: string | null;
}

/** Картка одного API ключа — мобільна версія */
export function ApiKeyCard({
  apiKey,
  onRevoke,
  onCopy,
  copiedId,
}: ApiKeyCardProps) {
  const isCopied = copiedId === apiKey.id;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      {/* Header: name + permission badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:key-round" className="text-accent" width={16} />
          <span className="text-sm font-semibold text-text-light">
            {apiKey.name}
          </span>
        </div>
        <span
          className={`text-xs font-semibold ${PERMISSION_BADGE[apiKey.permissions]}`}
        >
          {apiKey.permissions}
        </span>
      </div>

      {/* Token + copy button */}
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-border bg-white/5 px-3 py-2 font-mono text-xs text-text-muted">
          {apiKey.token}
        </code>
        <button
          onClick={() => onCopy(apiKey.id, apiKey.token)}
          title="Copy token"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-white/5 text-text-muted transition-all hover:bg-white/10 hover:text-text-light active:scale-90"
        >
          <Icon
            icon={isCopied ? "lucide:check" : "lucide:copy"}
            width={15}
            className={isCopied ? "text-success" : ""}
          />
        </button>
      </div>

      {/* Meta: created + last used */}
      <div className="grid grid-cols-2 gap-1">
        <div>
          <p className="text-[11px] text-text-muted">Created</p>
          <p className="text-xs font-medium text-text-light">
            {apiKey.createdAt}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-muted">Last Used</p>
          <p className="text-xs font-medium text-text-light">
            {apiKey.lastUsed}
          </p>
        </div>
      </div>

      {/* Revoke action */}
      <div className="flex justify-end">
        <Button
          variant="danger"
          onClick={() => onRevoke(apiKey.id)}
          className="gap-1.5 px-3 py-2 text-xs"
        >
          <Icon icon="lucide:trash-2" width={13} />
          Revoke
        </Button>
      </div>
    </div>
  );
}
