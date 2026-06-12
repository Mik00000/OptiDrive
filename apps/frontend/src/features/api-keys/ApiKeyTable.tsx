import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { type ApiKey, PERMISSION_BADGE } from "./types";

interface ApiKeyTableRowProps {
  apiKey:   ApiKey;
  onRevoke: (id: string) => void;
  onCopy:   (id: string, token: string) => void;
  copiedId: string | null;
}

/** Один рядок таблиці API ключів (десктопна версія) */
function ApiKeyTableRow({
  apiKey,
  onRevoke,
  onCopy,
  copiedId,
}: ApiKeyTableRowProps) {
  const isCopied = copiedId === apiKey.id;

  return (
    <tr className="border-b border-border last:border-0 transition-colors hover:bg-white/[0.02]">
      {/* Name */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Icon
            icon="lucide:key-round"
            className="text-accent shrink-0"
            width={16}
          />
          <span className="text-sm font-semibold text-text-light">
            {apiKey.name}
          </span>
        </div>
      </td>

      {/* Token */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <code className="rounded-md border border-border bg-white/5 px-2.5 py-1 font-mono text-xs text-text-muted">
            {apiKey.token}
          </code>
          <button
            onClick={() => onCopy(apiKey.id, apiKey.token)}
            title="Copy token"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-all hover:bg-white/10 hover:text-text-light active:scale-90"
          >
            <Icon
              icon={isCopied ? "lucide:check" : "lucide:copy"}
              width={14}
              className={isCopied ? "text-success" : ""}
            />
          </button>
        </div>
      </td>

      {/* Permissions */}
      <td className="px-5 py-4">
        <span
          className={`text-sm font-medium ${PERMISSION_BADGE[apiKey.permissions]}`}
        >
          {apiKey.permissions}
        </span>
      </td>

      {/* Created */}
      <td className="px-5 py-4">
        <span className="text-sm text-text-muted">{apiKey.createdAt}</span>
      </td>

      {/* Last Used */}
      <td className="px-5 py-4">
        <span className="text-sm text-text-muted">{apiKey.lastUsed}</span>
      </td>

      {/* Action */}
<td className="px-5 py-4">
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
</td>
    </tr>
  );
}

/* ─── Заголовки таблиці ─── */
const TABLE_COLS = [
  "Key Name",
  "Token",
  "Permissions",
  "Created",
  "Last Used",
  "Action",
] as const;

interface ApiKeyTableProps {
  keys:     ApiKey[];
  onRevoke: (id: string) => void;
  onCopy:   (id: string, token: string) => void;
  copiedId: string | null;
  emptySlot: React.ReactNode;
}

/** Таблиця API ключів — видима лише на десктопі (lg+) */
export function ApiKeyTable({
  keys,
  onRevoke,
  onCopy,
  copiedId,
  emptySlot,
}: ApiKeyTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
      {keys.length === 0 ? (
        emptySlot
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {TABLE_COLS.map((col, i) => (
                <th
                  key={col}
                  className={`px-5 py-3.5 text-xs font-semibold tracking-wide text-text-muted uppercase ${
                    i === TABLE_COLS.length - 1 ? "text-right" : "text-left"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <ApiKeyTableRow
                key={key.id}
                apiKey={key}
                onRevoke={onRevoke}
                onCopy={onCopy}
                copiedId={copiedId}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
