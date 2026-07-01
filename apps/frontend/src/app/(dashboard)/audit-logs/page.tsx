'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import PageHeading from '@/components/PageHeading';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { UserAvatar } from '@/components/UserAvatar';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
}

interface PaginationData {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

const ACTION_BADGES: Record<string, { bg: string; text: string; icon: string }> = {
  FILE_UPLOADED: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', text: 'Upload', icon: 'lucide:upload' },
  FILE_DELETED: { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', text: 'Delete', icon: 'lucide:trash-2' },
  KEY_GENERATED: { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', text: 'Key Created', icon: 'lucide:key' },
  KEY_REVOKED: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', text: 'Key Revoked', icon: 'lucide:key-round' },
  PLAN_UPGRADED: { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', text: 'Plan Upgrade', icon: 'lucide:trending-up' },
  SETTING_CHANGED: { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', text: 'Setting', icon: 'lucide:settings' },
  MEMBER_INVITED: { bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400', text: 'Invite', icon: 'lucide:user-plus' },
  MEMBER_JOINED: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', text: 'Member Join', icon: 'lucide:user-check' },
  MEMBER_REMOVED: { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', text: 'Member Remove', icon: 'lucide:user-minus' },
  MEMBER_LEFT: { bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400', text: 'Member Left', icon: 'lucide:log-out' },
  OWNERSHIP_TRANSFERRED: { bg: 'bg-violet-500/10 border-violet-500/20 text-violet-400', text: 'Ownership', icon: 'lucide:arrow-right-left' },
  WORKSPACE_CREATED: { bg: 'bg-teal-500/10 border-teal-500/20 text-teal-400', text: 'Create WS', icon: 'lucide:plus-circle' },
};

export default function AuditLogsPage() {
  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find(w => w.id === user?.workspaceId) || workspaces[0];
  const isEnterprise = activeWorkspace?.plan === 'ENTERPRISE';

  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async (currentPage = 1) => {
    if (!isEnterprise) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        type,
        search,
        startDate,
        endDate
      });
      const response = await apiClient.get<{ success: boolean; data: { logs: AuditLog[], pagination: PaginationData } }>(
        `/api/internal/workspace/audit-logs?${queryParams.toString()}`
      );
      if (response.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.data?.error || err.message || 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, type, startDate, endDate, isEnterprise]);

  // Handle Search Apply
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Render Lock/Paywall Screen
  if (!isEnterprise) {
    return (
      <section className="dashboard-page flex flex-col items-center justify-center p-8 min-h-[80vh] relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-indigo-500/5 -z-10" />
        
        <div className="max-w-md w-full bg-card/60 backdrop-blur-md border border-border p-8 rounded-2xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-accent/25 mb-6 animate-pulse">
            <Icon icon="lucide:shield-alert" width={32} />
          </div>
          
          <h2 className="text-xl font-bold text-text-light">Workspace Audit Logs</h2>
          <span className="inline-block mt-2 px-2.5 py-1 text-[10px] font-extrabold uppercase bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-md tracking-wider">
            Enterprise Plan Feature
          </span>

          <p className="text-sm text-text-muted mt-4 leading-relaxed">
            Gain full visibility into team actions, uploads, setting updates, API key generations, and configuration changes with OptiDrive security auditing.
          </p>

          <div className="w-full flex flex-col gap-3.5 my-6 text-left text-xs bg-slate-950/40 border border-border p-4.5 rounded-xl text-text-muted">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:check" className="text-accent shrink-0" width={16} />
              <span>Full immutable activity history log</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:check" className="text-accent shrink-0" width={16} />
              <span>Filter by actor (member), action type, and date</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:check" className="text-accent shrink-0" width={16} />
              <span>Compliance-ready CSV and JSON log export</span>
            </div>
          </div>

          <Button
            variant="accent"
            className="w-full justify-center py-2.5 font-bold"
            onClick={() => window.location.href = '/billing'}
          >
            Upgrade Workspace
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page relative pb-12">
      <PageHeading title="Workspace Audit Logs">
        <div className="flex items-center gap-2.5">
          <Button
            variant="bordered"
            onClick={() => fetchLogs(page)}
            className="p-2.5 h-9 w-9 flex items-center justify-center border-border bg-card hover:bg-slate-800 text-text-muted hover:text-text-light"
          >
            <Icon icon="lucide:refresh-cw" className={isLoading ? 'animate-spin' : ''} width={16} />
          </Button>
        </div>
      </PageHeading>

      <div className="flex flex-col gap-6 p-8">
        {/* Filters Panel */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-card border border-border p-5 rounded-2xl shadow-lg">
          <div className="flex flex-col gap-1.5 sm:col-span-2 md:col-span-2 lg:col-span-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Search description</label>
            <div className="relative">
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-8 text-xs text-text-light bg-slate-950/20 h-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-light"
                >
                  <Icon icon="lucide:x" width={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1 md:col-span-1 lg:col-span-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Action Type</label>
            <Input
              variant="select"
              value={type}
              onChange={(val) => setType(val)}
              className="w-full text-xs min-w-0 h-9"
              options={[
                { label: "All Actions", value: "" },
                { label: "File Uploaded", value: "FILE_UPLOADED" },
                { label: "File Deleted", value: "FILE_DELETED" },
                { label: "API Key Created", value: "KEY_GENERATED" },
                { label: "API Key Revoked", value: "KEY_REVOKED" },
                { label: "Setting Changed", value: "SETTING_CHANGED" },
                { label: "Member Invited", value: "MEMBER_INVITED" },
                { label: "Member Joined", value: "MEMBER_JOINED" },
                { label: "Member Removed", value: "MEMBER_REMOVED" },
                { label: "Ownership Transferred", value: "OWNERSHIP_TRANSFERRED" }
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2 md:col-span-2 lg:col-span-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Date range</label>
            <div className="flex gap-2 items-center min-w-0 h-9">
              <Input
                variant="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs min-w-0 h-9"
              />
              <span className="text-xs text-text-muted shrink-0">to</span>
              <Input
                variant="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs min-w-0 h-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-1 md:col-span-1 lg:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider invisible">Buttons</span>
            <div className="flex gap-2.5 w-full">
              <Button type="submit" variant="accent" className="flex-1 justify-center text-xs font-semibold h-9">
                Apply
              </Button>
              <Button
                type="button"
                variant="bordered"
                onClick={handleResetFilters}
                className="text-xs font-semibold border-border bg-card text-text-muted hover:text-text-light h-9 flex-1 justify-center"
              >
                Reset
              </Button>
            </div>
          </div>
        </form>

        {/* Audit Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg p-4 md:p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-text-muted font-bold">
                  <th className="p-4 pl-6">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 pr-6">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-text-muted">
                      <div className="flex justify-center items-center gap-2">
                        <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={18} />
                        <span>Loading audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-rose-400 font-semibold">{errorMsg}</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-text-muted">No activity logs recorded.</td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const badge = ACTION_BADGES[log.type] || {
                      bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
                      text: log.type,
                      icon: 'lucide:info'
                    };
                    return (
                      <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6 text-text-muted font-mono whitespace-nowrap">
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${badge.bg}`}>
                            <Icon icon={badge.icon} width={11} />
                            {badge.text}
                          </span>
                        </td>
                        <td className="p-4 text-text-light font-medium max-w-sm sm:max-w-md truncate" title={log.description}>
                          {log.description}
                        </td>
                        <td className="p-4 pr-6">
                          {log.user ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatar name={log.user.name} avatarUrl={log.user.avatarUrl} size={24} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-text-light truncate font-semibold">
                                  {log.user.name || 'User'}
                                </span>
                                <span className="text-[10px] text-text-muted truncate">
                                  {log.user.email}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-text-muted">
                              <Icon icon="lucide:monitor-play" width={16} />
                              <span>System (API Key)</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden flex flex-col gap-4">
            {isLoading ? (
              <div className="py-16 text-center text-text-muted flex justify-center items-center gap-2">
                <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={18} />
                <span>Loading audit logs...</span>
              </div>
            ) : errorMsg ? (
              <div className="py-16 text-center text-rose-400 font-semibold">{errorMsg}</div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-text-muted">No activity logs recorded.</div>
            ) : (
              logs.map((log) => {
                const badge = ACTION_BADGES[log.type] || {
                  bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
                  text: log.type,
                  icon: 'lucide:info'
                };
                return (
                  <div key={log.id} className="bg-card border border-border p-4 rounded-xl flex flex-col gap-3 shadow-sm hover:bg-slate-900/10 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold shrink-0 ${badge.bg}`}>
                        <Icon icon={badge.icon} width={11} />
                        {badge.text}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-text-light font-medium leading-relaxed break-words">
                      {log.description}
                    </p>
                    
                    <div className="border-t border-border/50 pt-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Actor</span>
                      {log.user ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <UserAvatar name={log.user.name} avatarUrl={log.user.avatarUrl} size={22} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-text-light truncate font-semibold">
                              {log.user.name || 'User'}
                            </span>
                            <span className="text-[9px] text-text-muted truncate">
                              {log.user.email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-text-muted text-xs">
                          <Icon icon="lucide:monitor-play" width={14} />
                          <span>System (API Key)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="border-t border-border/40 p-4.5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs mt-4 md:mt-0">
              <span className="text-text-muted text-center sm:text-left">
                Showing page <strong>{pagination.page}</strong> of {pagination.pages} ({pagination.total} total logs)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="bordered"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1 || isLoading}
                  className="px-2.5 py-1.5 text-[11px]"
                >
                  Previous
                </Button>
                <div className="hidden sm:flex items-center gap-1.5">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      disabled={isLoading}
                      className={`h-7 w-7 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        page === i + 1
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-slate-900/20 text-text-muted hover:text-text-light'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <span className="sm:hidden text-text-muted text-xs font-semibold px-2">
                  {page} / {pagination.pages}
                </span>
                <Button
                  variant="bordered"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages || isLoading}
                  className="px-2.5 py-1.5 text-[11px]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
