/* ─── Типи для API ключів ─── */

export type Permission = "Full Access" | "Read-only" | "Upload Only";

export interface ApiKey {
  id: string;
  name: string;
  token: string;
  permissions: Permission;
  createdAt: string;
  lastUsed: string;
}

/** Колір тексту для кожного типу прав доступу */
export const PERMISSION_BADGE: Record<Permission, string> = {
  "Full Access": "text-accent",
  "Read-only":  "text-text-muted",
  "Upload Only": "text-purple",
};

/** Конфігурація варіантів прав доступу для форми */
export const PERMISSION_OPTIONS = [
  {
    value:  "Full Access" as Permission,
    icon:   "lucide:shield",
    desc:   "Full read/write access to all resources",
    color:  "text-accent",
    bg:     "bg-accent/10 border-accent/30",
  },
  {
    value:  "Read-only" as Permission,
    icon:   "lucide:eye",
    desc:   "View files and metadata only",
    color:  "text-text-muted",
    bg:     "bg-white/5 border-border",
  },
  {
    value:  "Upload Only" as Permission,
    icon:   "lucide:upload",
    desc:   "Upload new files only",
    color:  "text-purple",
    bg:     "bg-purple/10 border-purple/30",
  },
] as const;

/** Початкові мок-дані */
export const MOCK_KEYS: ApiKey[] = [
  {
    id:          "1",
    name:        "Production-Backend",
    token:       "op_live_••••••••3x9q",
    permissions: "Full Access",
    createdAt:   "Oct 12, 2023",
    lastUsed:    "2 mins ago",
  },
  {
    id:          "2",
    name:        "Staging-Environment",
    token:       "op_test_••••••••m2p1",
    permissions: "Read-only",
    createdAt:   "Nov 05, 2023",
    lastUsed:    "5 hours ago",
  },
  {
    id:          "3",
    name:        "Vercel-Integration",
    token:       "op_live_••••••••k8f4",
    permissions: "Upload Only",
    createdAt:   "Jan 22, 2024",
    lastUsed:    "1 day ago",
  },
];
