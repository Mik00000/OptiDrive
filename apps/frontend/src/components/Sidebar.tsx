"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { Button } from './Button';
import { twMerge } from 'tailwind-merge';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from './Modal';
import { Input } from './Inputs';
import { UserAvatar } from './UserAvatar';

interface MenuItem {
  text: string;
  link: string;
  icon: string;
}

const menu: MenuItem[] = [
  { text: 'Dashboard', link: '/dashboard', icon: 'lucide:layout-dashboard' },
  { text: 'Analytics', link: '/analytics', icon: 'lucide:bar-chart-2' },
  { text: 'Media Library', link: '/media', icon: 'lucide:image' },
  { text: 'API Keys', link: '/api-keys', icon: 'lucide:key' },
  { text: 'Webhooks', link: '/webhooks', icon: 'lucide:webhook' },
  { text: 'Audit Logs', link: '/audit-logs', icon: 'lucide:file-text' },
  { text: 'Billing', link: '/billing', icon: 'lucide:credit-card' },
  { text: 'Documentation', link: '/api-docs', icon: 'lucide:book' },
  { text: 'Recycle Bin', link: '/trash', icon: 'lucide:trash-2' },
  { text: 'Settings', link: '/settings', icon: 'lucide:settings' },
];

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebar();
  const { createWorkspace, user, workspaces, switchWorkspace, isLoading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);


  const activeWorkspace = workspaces.find(w => w.id === user?.workspaceId) || workspaces[0];

  // Закриття меню при кліку поза його межами
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(event.target as Node)) {
        setIsWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      setCreateError(null);
      setIsCreating(true);
      const newWs = await createWorkspace(newWorkspaceName);
      await switchWorkspace(newWs.id);
      setIsCreateModalOpen(false);
      setNewWorkspaceName('');
      setIsWorkspaceDropdownOpen(false);
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const isAdmin = user?.email === 'mikjarkov@gmail.com' || user?.email?.endsWith('@optidrive.app') || user?.email === 'admin@optidrive.app';
  
  const visibleMenu = [...menu];
  if (user && isAdmin) {
    // Додаємо Admin Panel перед Settings (індекс 9)
    visibleMenu.splice(9, 0, { text: 'Admin Panel', link: '/admin', icon: 'lucide:shield-check' });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside
        className={twMerge(
          'bg-sidebar flex h-screen w-65 shrink-0 flex-col border-r border-border p-4 pt-6.5 print:hidden',
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out',
          'md:sticky md:top-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.svg" alt="Logo" width={32} height={32} />
            <span className="text-lg font-bold text-text-light">OptiDrive</span>
          </div>
          <Button 
            variant="ghost" 
            mobileBehavior="none" 
            className="md:hidden -mr-2"
            onClick={() => setIsOpen(false)}
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </Button>
        </div>
 
        {/* Workspace Switcher */}
        <div className="relative mb-6 px-1" ref={workspaceDropdownRef}>
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border-border bg-slate-900/50 p-2.5 text-left transition-all hover:bg-slate-800/80 hover:border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-indigo-600 text-sm font-bold text-text-light shadow-md shadow-accent/20">
                {activeWorkspace ? activeWorkspace.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-semibold text-text-light flex items-center gap-1.5">
                  {isLoading ? 'Loading...' : (activeWorkspace ? activeWorkspace.name : 'Unknown Workspace')}
                  {activeWorkspace?.isLocked && (
                    <Icon icon="lucide:lock" className="text-red-400 shrink-0" width={12} height={12} />
                  )}
                </span>
                <span className="text-[10px] font-medium text-text-muted flex items-center gap-1">
                  <span className="truncate max-w-[80px]">
                    {activeWorkspace?.role?.name || 'Member'}
                  </span>
                  {activeWorkspace?.plan && (
<span className={twMerge(
  "inline-block rounded px-1.5 flex items-center pt-[2px] h-[11.5px] text-[8px] font-bold tracking-wide uppercase leading-none",
  activeWorkspace.plan === 'PRO' ? "bg-amber-500/20 text-amber-400" :
  activeWorkspace.plan === 'ENTERPRISE' ? "bg-purple-500/20 text-purple-400" :
  "bg-slate-700 text-text-muted"
)}>
  {activeWorkspace.plan}
</span>
                  )}
                  {activeWorkspace?.isLocked && (
                    <span className="inline-block rounded px-1.5 flex items-center pt-[2px] h-[11.5px] text-[8px] font-bold tracking-wide uppercase leading-none bg-red-500/20 text-red-400">
                      Locked
                    </span>
                  )}
                </span>
              </div>
            </div>
            <Icon
              icon="lucide:chevrons-up-down"
              width={16}
              height={16}
              className={twMerge("text-text-muted transition-transform duration-200", isWorkspaceDropdownOpen && "transform rotate-180")}
            />
          </button>
 
          {/* Workspace Dropdown Panel */}
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl border border-border bg-slate-950 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Workspaces
              </div>
              <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
                {workspaces.map((ws) => {
                  const isActive = ws.id === user?.workspaceId;
                  return (
                    <button
                      key={ws.id}
                      onClick={async () => {
                        setIsWorkspaceDropdownOpen(false);
                        if (!isActive) {
                          await switchWorkspace(ws.id);
                        }
                      }}
                      className={twMerge(
                        "flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all cursor-pointer",
                        isActive
                          ? "bg-slate-800/80 text-text-light font-semibold"
                          : "text-text-muted hover:bg-slate-900 hover:text-text-light"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={twMerge(
                          "flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md text-xs font-bold text-text-light transition-colors",
                          isActive
                            ? "bg-gradient-to-br from-accent to-indigo-600 shadow-md shadow-accent/20"
                            : "bg-slate-800"
                        )}>
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-xs font-medium text-text-light flex items-center gap-1">
                            {ws.name}
                            {ws.isLocked && (
                              <Icon icon="lucide:lock" className="text-red-400 shrink-0" width={11} height={11} />
                            )}
                          </span>
                          <span className="text-[9px] text-text-muted flex items-center gap-1">
                            {ws.role?.name || 'Member'}
                            {ws.isLocked && (
                              <span className="text-[8px] font-bold text-red-400 bg-red-400/10 px-1 rounded uppercase">Locked</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <Icon icon="lucide:check" width={16} height={16} className="text-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
                
                <div className="my-1 border-t border-border" />
                
                <button
                  onClick={() => {
                    setIsWorkspaceDropdownOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-all text-text-muted hover:bg-slate-900 hover:text-text-light cursor-pointer"
                >
                  <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-transparent text-xs font-bold text-text-muted transition-colors">
                    <Icon icon="lucide:plus" width={14} height={14} />
                  </div>
                  <span className="truncate text-xs font-medium">Create Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
 
      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {visibleMenu.map((item) => {
            const isActive = pathname.startsWith(item.link);
            return (
              <li key={item.text} className="relative">
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-md"></div>
                )}
                <Link
                  href={item.link}
                  className={twMerge(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200",
                    isActive 
                      ? "bg-slate-800/80 text-text-light font-semibold" 
                      : "text-text-muted hover:bg-slate-800/50 hover:text-text-light"
                  )}
                >
                  <Icon icon={item.icon} width={20} className={isActive ? "text-accent" : ""} />
                  <span className="text-sm font-medium">{item.text}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative mt-auto border-t border-border pt-4" ref={dropdownRef}>
        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-border bg-sidebar p-1.5 shadow-xl z-50">
            <Link
              href="/settings"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-light transition-colors hover:bg-slate-800/50"
            >
              <Icon icon="lucide:settings" width={16} height={16} className="text-text-muted" />
              <span>Profile Settings</span>
            </Link>
            
            <div className="my-1.5 border-t border-border" />
            
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10 cursor-pointer text-left"
            >
              <Icon icon="lucide:log-out" width={16} height={16} className="text-error" />
              <span>Log out</span>
            </button>
          </div>
        )}

        {/* Profile Info Button */}
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-800/50"
        >
          <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size={36} />

          <div className="flex flex-col overflow-hidden text-left flex-1">
            <span className="truncate text-sm font-medium text-text-light">
              {user?.name || 'Гість'}
            </span>
            <span className="truncate text-xs text-text-muted">
              {user?.email || ''}
            </span>
          </div>
          
          <div className="text-text-muted p-1 hover:text-text-light rounded transition-colors">
            <Icon
              icon="lucide:more-vertical"
              width={16}
              height={16}
            />
          </div>
        </div>
      </div>
    </aside>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Workspace"
      >
        <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            A workspace is a dedicated environment for your projects, API keys, and media files. 
            You can invite other users to collaborate later.
          </p>
          {createError && (
            <div className="text-error text-sm bg-error/10 border border-error/20 rounded-lg p-3">
              {createError}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-text-muted text-xs font-semibold uppercase">
              Workspace Name
            </label>
            <Input
              placeholder="e.g. Acme Corp, My Startup..."
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              disabled={isCreating}
              required
              autoFocus
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="bordered"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCreating || !newWorkspaceName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
