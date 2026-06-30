"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { Icon } from '@iconify/react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@optidrive/shared';
import { getDomainsApi, createDomainApi, deleteDomainApi, verifyDomainApi, CustomDomain } from '../api';

export const DomainsTab = () => {
  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const isOwner = activeWorkspace?.role?.name === 'Owner';
  const canManageWorkspace = isOwner || activeWorkspace?.role?.permissions?.includes(Permission.MANAGE_WORKSPACE);

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [domainToDelete, setDomainToDelete] = useState<CustomDomain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Копіювання записів DNS
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchDomains = async () => {
    try {
      setIsLoading(true);
      const data = await getDomainsApi();
      setDomains(data);
    } catch (error: any) {
      console.error('Failed to fetch domains', error);
      setErrorMessage(error.message || 'Failed to fetch domains');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(key);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    if (!canManageWorkspace) {
      showFeedback('You do not have permission to manage workspace domains', 'error');
      return;
    }

    try {
      setIsAdding(true);
      setErrorMessage('');
      const created = await createDomainApi(newDomain.trim());
      setDomains((prev) => [created, ...prev]);
      setNewDomain('');
      showFeedback('Domain added successfully. Please configure DNS records.');
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.data?.error || error.message || 'Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domainObj: CustomDomain) => {
    try {
      setVerifyingId(domainObj.id);
      showFeedback(`Verifying DNS records for ${domainObj.domain}...`, 'info');
      
      const response = await verifyDomainApi(domainObj.id);
      
      setDomains((prev) =>
        prev.map((d) => (d.id === domainObj.id ? response.data : d))
      );

      if (response.verified) {
        showFeedback(`Domain ${domainObj.domain} successfully connected! ✓`, 'success');
      } else {
        showFeedback(response.errorDetail || 'Verification failed. Please check your DNS setup.', 'error');
      }
    } catch (error: any) {
      console.error(error);
      showFeedback(error.data?.error || error.message || 'Verification error', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async () => {
    if (!domainToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDomainApi(domainToDelete.id);
      setDomains((prev) => prev.filter((d) => d.id !== domainToDelete.id));
      setDomainToDelete(null);
      showFeedback('Domain deleted successfully');
    } catch (error: any) {
      console.error(error);
      showFeedback(error.data?.error || error.message || 'Failed to delete domain', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const cnameValue = 'cname.optidrive.com';

  return (
    <div className="flex max-w-4xl flex-col pb-8 relative">
      
      {/* Оверлей для користувачів без прав */}
      {!canManageWorkspace && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-card/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center bg-card p-6 rounded-2xl border border-border shadow-lg max-w-sm text-center">
            <div className="h-12 w-12 rounded-full bg-border/50 flex items-center justify-center mb-4">
              <Icon icon="lucide:lock" className="text-text-muted" width={24} />
            </div>
            <h3 className="text-lg font-semibold text-text-light">Access Restricted</h3>
            <p className="text-sm text-text-muted mt-2">
              You don't have permission to manage custom domains. Please contact your workspace owner for access.
            </p>
          </div>
        </div>
      )}

      {/* Контент вкладки (змінюємо прозорість та блокуємо кліки, якщо немає прав) */}
      <div className={`flex flex-col gap-6 lg:gap-8 transition-opacity duration-300 ${!canManageWorkspace ? 'opacity-40 pointer-events-none select-none' : ''}`}>
        
        {/* Форма додавання домену */}
        <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
          <div className="border-border border-b px-4 py-4 sm:px-6">
            <span className="text-text-light text-lg font-semibold">
              Custom Domains
            </span>
            <p className="text-text-muted mt-1 text-sm">
              Point your own domains or subdomains to share media with your brand.
            </p>
          </div>

          <form onSubmit={handleAddDomain} className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="domain" className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Add Custom Domain
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    variant="text"
                    name="domain"
                    id="domain"
                    className="rounded-lg w-full"
                    placeholder="e.g. media.mycompany.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    disabled={isAdding}
                  />
                </div>
                <Button
                  type="submit"
                  variant="accent"
                  className="w-full sm:w-auto px-5 shrink-0 justify-center"
                  disabled={!newDomain.trim() || isAdding}
                >
                  {isAdding ? (
                    <><Icon icon="lucide:loader-2" className="animate-spin" width={16} /> Adding...</>
                  ) : 'Add Domain'}
                </Button>
              </div>
            </div>
            {errorMessage && (
              <p className="text-error text-sm flex items-center gap-1.5">
                <Icon icon="lucide:alert-circle" width={16} />
                {errorMessage}
              </p>
            )}
          </form>
        </div>

        {/* Список підключених доменів */}
        <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
          <div className="border-border border-b px-4 py-4 sm:px-6 flex justify-between items-center">
            <div>
              <span className="text-text-light text-base font-semibold">
                Configured Domains
              </span>
              <p className="text-text-muted text-xs mt-0.5">
                Manage your domain configuration and verification statuses.
              </p>
            </div>
            {isLoading && (
              <Icon icon="lucide:loader-2" className="animate-spin text-text-muted" width={18} />
            )}
          </div>

          <div className="flex flex-col">
            {isLoading ? (
              <div className="p-8 text-center text-text-muted">Loading configured domains...</div>
            ) : domains.length === 0 ? (
              <div className="p-8 text-center text-text-muted flex flex-col items-center gap-2">
                <Icon icon="lucide:globe" className="text-text-muted/40" width={32} />
                <span>No custom domains configured yet. Add one above.</span>
              </div>
            ) : (
              domains.map((dom) => (
                <div key={dom.id} className="border-border border-b last:border-b-0 p-4 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-row justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-text-light font-semibold text-lg">{dom.domain}</span>
                        
                        {/* Badge статусу */}
                        {dom.status === 'ACTIVE' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        )}
                        {dom.status === 'PENDING' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/25 text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pending DNS
                          </span>
                        )}
                        {dom.status === 'ERROR' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/25 text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            DNS Error
                          </span>
                        )}
                      </div>
                      <span className="text-text-muted text-xs">
                        Added on {new Date(dom.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {dom.status !== 'ACTIVE' && (
                        <Button
                          variant="primary"
                          onClick={() => handleVerify(dom)}
                          disabled={verifyingId === dom.id}
                          className="py-1 px-3 text-xs"
                        >
                          {verifyingId === dom.id ? (
                            <><Icon icon="lucide:loader-2" className="animate-spin" width={12} /> Verifying</>
                          ) : (
                            <><Icon icon="lucide:refresh-cw" width={12} /> Verify Setup</>
                          )}
                        </Button>
                      )}
                      <button
                        onClick={() => setDomainToDelete(dom)}
                        className="text-text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10"
                        title="Remove Domain"
                      >
                        <Icon icon="lucide:trash-2" width={16} />
                      </button>
                    </div>
                  </div>

                  {/* DNS Instructions panel */}
                  {dom.status !== 'ACTIVE' && (
                    <div className="rounded-xl bg-white/5 border border-border p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-text-light uppercase tracking-wide">
                        <Icon icon="lucide:dns" className="text-accent" width={16} />
                        Configure DNS Records
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Go to your DNS provider (e.g. Cloudflare, GoDaddy) and add the following CNAME record to point your domain to OptiDrive:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="bg-bg rounded-lg p-2.5 border border-border flex flex-col gap-1 relative group">
                          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wide">Record Type</span>
                          <div className="flex justify-between items-center">
                            <code className="text-xs text-text-light font-mono font-bold">CNAME</code>
                            <button
                              onClick={() => handleCopy('CNAME', `${dom.id}-type`)}
                              className="text-text-muted hover:text-text-light transition-colors"
                            >
                              <Icon icon={copiedValue === `${dom.id}-type` ? "lucide:check" : "lucide:copy"} width={14} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-bg rounded-lg p-2.5 border border-border flex flex-col gap-1 relative group">
                          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wide">Host / Name</span>
                          <div className="flex justify-between items-center gap-1">
                            <code className="text-xs text-text-light font-mono truncate">{dom.domain.split('.')[0]}</code>
                            <button
                              onClick={() => handleCopy(dom.domain.split('.')[0], `${dom.id}-host`)}
                              className="text-text-muted hover:text-text-light transition-colors"
                            >
                              <Icon icon={copiedValue === `${dom.id}-host` ? "lucide:check" : "lucide:copy"} width={14} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-bg rounded-lg p-2.5 border border-border flex flex-col gap-1 relative group">
                          <span className="text-[10px] uppercase font-bold text-text-muted tracking-wide">Target / Value</span>
                          <div className="flex justify-between items-center gap-1">
                            <code className="text-xs text-text-light font-mono truncate">{cnameValue}</code>
                            <button
                              onClick={() => handleCopy(cnameValue, `${dom.id}-value`)}
                              className="text-text-muted hover:text-text-light transition-colors"
                            >
                              <Icon icon={copiedValue === `${dom.id}-value` ? "lucide:check" : "lucide:copy"} width={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Модалка підтвердження видалення */}
      <ConfirmModal
        isOpen={!!domainToDelete}
        onClose={() => setDomainToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Custom Domain"
        description={domainToDelete ? `Are you sure you want to remove the domain ${domainToDelete.domain}? Branded links using this domain will stop working.` : ''}
        confirmText={isDeleting ? 'Deleting...' : 'Remove Domain'}
        variant="danger"
        icon="lucide:globe"
      />

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : feedback.type === 'info'
              ? 'bg-accent/10 border-accent/20 text-accent'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
        } animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={feedback.type === 'success' ? 'lucide:check-circle' : feedback.type === 'info' ? 'lucide:info' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};