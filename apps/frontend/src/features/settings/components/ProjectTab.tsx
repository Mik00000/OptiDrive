"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { Icon } from '@iconify/react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { updateWorkspaceApi, deleteWorkspaceApi, leaveWorkspaceApi, testS3ConnectionApi, startWorkspaceMigrationApi } from '../api';
import { useRef } from 'react';

export const ProjectTab = () => {
  const router = useRouter();
  const { user, workspaces, login } = useAuth();
  
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const isOwner = activeWorkspace?.role?.name === 'Owner';
  const isOnlyMember = activeWorkspace?.membersCount === 1;
  const isEnterprise = activeWorkspace?.plan === 'ENTERPRISE';
  
  const [name, setName] = useState(activeWorkspace?.name || '');
  const [slug, setSlug] = useState(activeWorkspace?.slug || '');
  
  // Custom S3 Storage states
  const [customS3Enabled, setCustomS3Enabled] = useState(activeWorkspace?.customS3Enabled || false);
  const [s3AccessKeyId, setS3AccessKeyId] = useState(activeWorkspace?.s3AccessKeyId || '');
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState(activeWorkspace?.s3Endpoint || '');
  const [s3BucketName, setS3BucketName] = useState(activeWorkspace?.s3BucketName || '');
  const [s3Region, setS3Region] = useState(activeWorkspace?.s3Region || 'auto');
  const [s3PublicUrl, setS3PublicUrl] = useState(activeWorkspace?.s3PublicUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isSaveChangesModalOpen, setIsSaveChangesModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // S3 test and migration states
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isStartingMigration, setIsStartingMigration] = useState(false);
  
  const prevStatusRef = useRef(activeWorkspace?.migrationStatus);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setSlug(activeWorkspace.slug);
      
      if (activeWorkspace.migrationStatus === 'REVERTING') {
        setCustomS3Enabled(false);
      } else if (activeWorkspace.migrationStatus === 'MIGRATING') {
        setCustomS3Enabled(true);
      } else {
        setCustomS3Enabled(activeWorkspace.customS3Enabled || false);
      }

      setS3AccessKeyId(activeWorkspace.s3AccessKeyId || '');
      setS3Endpoint(activeWorkspace.s3Endpoint || '');
      setS3BucketName(activeWorkspace.s3BucketName || '');
      setS3Region(activeWorkspace.s3Region || 'auto');
      setS3PublicUrl(activeWorkspace.s3PublicUrl || '');
    }
  }, [activeWorkspace]);

  // Migration finished notification
  useEffect(() => {
    if (prevStatusRef.current === 'MIGRATING' && activeWorkspace?.migrationStatus === 'COMPLETED') {
      showFeedback('Міграція завершена! Усі файли перенесені у ваше безпечне сховище.', 'success');
    }
    prevStatusRef.current = activeWorkspace?.migrationStatus;
  }, [activeWorkspace?.migrationStatus]);

  // Migration status polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeWorkspace?.migrationStatus === 'MIGRATING') {
      interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('optidrive_token') || '';
          if (user && token) {
            login(token, { ...user }, true);
          }
        } catch (e) {
          console.error('Failed to poll migration progress:', e);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkspace?.migrationStatus, user]);

  const handleTestConnection = async () => {
    const hasSavedS3 = activeWorkspace?.s3AccessKeyId && activeWorkspace?.s3BucketName;
    if (!hasSavedS3) {
      if (!s3BucketName.trim() || !s3AccessKeyId.trim() || !s3SecretAccessKey.trim()) {
        showFeedback('S3 Bucket Name, Access Key ID, and Secret Access Key are required to test connection', 'error');
        return;
      }
    } else {
      if (!s3BucketName.trim() || !s3AccessKeyId.trim()) {
        showFeedback('S3 Bucket Name and Access Key ID are required to test connection', 'error');
        return;
      }
    }

    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testS3ConnectionApi({
        s3BucketName: s3BucketName.trim() || undefined,
        s3AccessKeyId: s3AccessKeyId.trim() || undefined,
        s3SecretAccessKey: s3SecretAccessKey.trim() || undefined,
        s3Endpoint: s3Endpoint.trim() || undefined,
        s3Region: s3Region.trim() || undefined
      } as any);
      if (res.success) {
        setTestResult({ success: true, message: 'Successfully connected to S3 bucket!' });
        showFeedback('Connection test passed!', 'success');
      } else {
        setTestResult({ success: false, message: res.error || 'Connection failed' });
        showFeedback('Connection test failed', 'error');
      }
    } catch (err: any) {
      const errMsg = err.data?.error || err.response?.data?.error || err.message || 'Connection test failed';
      setTestResult({ success: false, message: errMsg });
      showFeedback('Connection test failed', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleStartMigration = async () => {
    setIsStartingMigration(true);
    try {
      const res = await startWorkspaceMigrationApi();
      if (res.success) {
        showFeedback('Migration started in the background', 'success');
        if (user) {
          const token = localStorage.getItem('optidrive_token') || '';
          login(token, { ...user }, true);
        }
      }
    } catch (err: any) {
      const errMsg = err.data?.error || err.response?.data?.error || err.message || 'Failed to start migration';
      setErrorMessage(errMsg);
    } finally {
      setIsStartingMigration(false);
    }
  };

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback({ message, type });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 5000);
  };

  const handleCopyId = () => {
    if (activeWorkspace?.id) {
      navigator.clipboard.writeText(activeWorkspace.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      setErrorMessage('Workspace Name is required');
      setIsSaveChangesModalOpen(false);
      return;
    }
    
    try {
      setIsSaving(true);
      setErrorMessage('');
      const customS3Data: any = {
        customS3Enabled
      };
      
      if (customS3Enabled) {
        customS3Data.s3AccessKeyId = s3AccessKeyId.trim();
        if (s3SecretAccessKey.trim()) {
          customS3Data.s3SecretAccessKey = s3SecretAccessKey.trim();
        }
        customS3Data.s3Endpoint = s3Endpoint.trim();
        customS3Data.s3BucketName = s3BucketName.trim();
        customS3Data.s3Region = s3Region.trim();
        customS3Data.s3PublicUrl = s3PublicUrl.trim();
      }

      const response = await updateWorkspaceApi(
        name.trim(),
        slug.trim() || undefined,
        customS3Data
      );
      
      // Update details in AuthContext
      if (user) {
        // Trigger workspace reload in AuthContext
        const token = localStorage.getItem('optidrive_token') || '';
        login(token, { ...user }, true);
      }
      
      setIsSaveChangesModalOpen(false);
      setS3SecretAccessKey('');
      showFeedback('Workspace preferences saved');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to save changes');
      setIsSaveChangesModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    try {
      setIsLeaving(true);
      setErrorMessage('');
      const res = await leaveWorkspaceApi();
      if (res.success && res.token && user) {
        login(res.token, { ...user, workspaceId: res.workspaceId }, true);
        setIsLeaveModalOpen(false);
        router.push('/dashboard');
        showFeedback('Workspace left successfully');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to leave workspace');
      setIsLeaveModalOpen(false);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage('');
      const res = await deleteWorkspaceApi();
      if (res.success && res.token && user) {
        // Switch workspace to the new one or null
        login(res.token, { ...user, workspaceId: res.switchWorkspaceId || undefined }, true);
        setIsDeleteModalOpen(false);
        router.push('/dashboard');
        showFeedback('Workspace deleted successfully');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to delete workspace');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        
        {/* Header */}
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Workspace Preferences
          </span>
          <p className="text-text-muted text-sm mt-1">
            Configure global settings and metadata for your active workspace.
          </p>
        </div>
        
        {/* Fields */}
        <div className="border-border flex flex-col gap-5 border-b p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="projectName" className="fz-13 fw-500 text-text-light">
              Workspace Name
            </label>
            <Input
              variant="text"
              name="projectName"
              id="projectName"
              className="rounded-lg"
              placeholder="e.g. My Workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slug" className="fz-13 fw-500 text-text-light">
              Workspace Slug (URL Identifier)
            </label>
            <Input
              variant="text"
              name="slug"
              id="slug"
              className="rounded-lg"
              placeholder="e.g. my-workspace"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1 leading-normal">
              Slugs identify your workspace uniquely. Avoid special characters. Your CDN links use this slug.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="fz-13 fw-500 text-text-light">
              Workspace ID
            </label>
            <div className="flex gap-2 items-center">
              <Input
                variant="text"
                className="rounded-lg flex-1 font-mono text-xs bg-bg/50 text-text-muted"
                value={activeWorkspace?.id || ''}
                readOnly
                disabled
              />
              <Button
                variant="bordered"
                type="button"
                onClick={handleCopyId}
                className="shrink-0 h-10 px-3 flex items-center justify-center"
              >
                <Icon
                  icon={copiedId ? "lucide:check" : "lucide:copy"}
                  className={copiedId ? "text-emerald-500" : ""}
                  width="16"
                  height="16"
                />
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1 leading-normal">
              This is the unique identifier for your workspace. You may need it for API integrations.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6">
          <Button 
            variant="accent" 
            className="w-full sm:w-auto justify-center"
            onClick={() => setIsSaveChangesModalOpen(true)}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Custom Enterprise Storage (BYOS) */}
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        {/* Header */}
        <div className="border-border border-b px-4 py-4 sm:px-6 flex justify-between items-center">
          <div>
            <span className="text-text-light text-lg font-semibold flex items-center gap-2">
              <Icon icon="lucide:database" className="text-accent" width={20} />
              Custom Enterprise Storage (BYOS)
            </span>
            <p className="text-text-muted text-sm mt-1">
              Store optimized media directly in your own AWS S3, Cloudflare R2, or custom storage buckets.
            </p>
          </div>
          {!isEnterprise && (
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Icon icon="lucide:lock" width={12} /> Enterprise
            </span>
          )}
        </div>

        {/* Lock Banner or Form fields */}
        <div>
          {!isEnterprise ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 border border-dashed border-border rounded-xl m-4 sm:m-6">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <Icon icon="lucide:lock" className="text-amber-400" width={18} />
              </div>
              <h4 className="text-sm font-semibold text-text-light">Enterprise Storage Locked</h4>
              <p className="text-xs text-text-muted mt-1.5 max-w-md leading-relaxed">
                Bring Your Own Storage (BYOS) is only available on Enterprise plans. Upgrade your plan to store your optimized media directly in your own AWS S3, Cloudflare R2, or custom storage buckets.
              </p>
            </div>
          ) : (
            /* Form fields */
            <div className="flex flex-col">
              {/* Migration In Progress Card */}
              {activeWorkspace?.migrationStatus === 'MIGRATING' && (
                <div className="mx-4 sm:mx-6 mt-4 p-4 sm:p-5 rounded-xl border border-blue-500/20 bg-blue-950/10 flex flex-col gap-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-text-light text-sm font-semibold flex items-center gap-2">
                      <Icon icon="line-md:loading-twotone-loop" className="text-blue-400" width={18} />
                      Data Migration in progress...
                    </span>
                    <span className="text-blue-400 text-xs font-mono font-medium bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {activeWorkspace?.migrationProgress || '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ 
                        width: activeWorkspace?.migrationProgress && activeWorkspace.migrationProgress.includes('(')
                          ? `${activeWorkspace.migrationProgress.split('(')[1]?.replace(')', '') || '0%'}` 
                          : '0%' 
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    We are transferring your existing optimized files to your custom S3 storage. You don't need to stay on this page. All links and previews will remain fully active.
                  </p>
                </div>
              )}

              {(activeWorkspace?.migrationStatus === 'MIGRATING' || activeWorkspace?.migrationStatus === 'REVERTING') && (
                <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-950/10 flex items-start gap-3 animate-fadeIn">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon icon="line-md:loading-twotone-loop" className="text-blue-400" width={18} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-text-light">
                      {activeWorkspace?.migrationStatus === 'REVERTING' 
                        ? 'Storage Settings Locked (Reversion Active)' 
                        : 'Storage Settings Locked (Migration Active)'}
                    </span>
                    <span className="text-[11px] text-text-muted leading-relaxed">
                      S3 configurations cannot be edited while files are being transferred between buckets to ensure data integrity and prevent connection loss.
                    </span>
                  </div>
                </div>
              )}

              {/* Migration Completed Box */}
              {customS3Enabled && activeWorkspace?.migrationStatus === 'COMPLETED' && (
                <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon icon="lucide:check-circle" className="text-emerald-400" width={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-text-light">Migration Completed</span>
                    <span className="text-[11px] text-text-muted mt-0.5">All your files are safely migrated and stored in your custom S3 bucket.</span>
                  </div>
                </div>
              )}

              {/* Start Migration Required Box */}
              {activeWorkspace?.customS3Enabled && (!activeWorkspace?.migrationStatus || activeWorkspace.migrationStatus === 'NONE' || activeWorkspace.migrationStatus === 'FAILED') && (
                <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl border border-border/50 bg-card/30 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-text-light flex items-center gap-1.5">
                      <Icon icon="lucide:arrow-right-left" width={16} className="text-accent" />
                      Data Migration Required
                    </span>
                    <span className="text-xs text-text-muted">
                      You have connected your custom S3 storage. Click below to transfer your existing files from OptiDrive default storage to your new bucket.
                    </span>
                  </div>
                  <Button
                    variant="bordered"
                    className="w-fit h-9 text-xs border-accent/20 hover:bg-accent/5 hover:border-accent text-accent"
                    onClick={handleStartMigration}
                    disabled={isStartingMigration}
                  >
                    {isStartingMigration ? 'Starting...' : 'Start Data Migration'}
                  </Button>
                </div>
              )}

              {/* Form Input fields */}
              <div className={`p-4 sm:p-6 flex flex-col gap-5 ${(activeWorkspace?.migrationStatus === 'MIGRATING' || activeWorkspace?.migrationStatus === 'REVERTING') ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                {/* Toggle S3 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-light">Enable Custom Storage</span>
                    <span className="text-xs text-text-muted">Route all new file uploads to your own S3 bucket.</span>
                  </div>
                  <button
                    type="button"
                    disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                    onClick={() => setCustomS3Enabled(!customS3Enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${customS3Enabled ? 'bg-accent' : 'bg-border'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${customS3Enabled ? 'translate-x-5 bg-bg' : 'translate-x-0 bg-text-muted'}`} />
                  </button>
                </div>

                {customS3Enabled && (
                  <div className="flex flex-col gap-4 pt-3 border-t border-border/50 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="s3BucketName" className="fz-13 fw-500 text-text-light">S3 Bucket Name</label>
                        <Input
                          variant="text"
                          name="s3BucketName"
                          id="s3BucketName"
                          placeholder="e.g. my-optidrive-bucket"
                          value={s3BucketName}
                          onChange={(e) => setS3BucketName(e.target.value)}
                          autoComplete="new-password"
                          disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="s3Region" className="fz-13 fw-500 text-text-light">S3 Region</label>
                        <Input
                          variant="text"
                          name="s3Region"
                          id="s3Region"
                          placeholder="e.g. us-east-1 (or 'auto')"
                          value={s3Region}
                          onChange={(e) => setS3Region(e.target.value)}
                          autoComplete="new-password"
                          disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="s3Endpoint" className="fz-13 fw-500 text-text-light">S3 Endpoint URL (Optional)</label>
                      <Input
                        variant="text"
                        name="s3Endpoint"
                        id="s3Endpoint"
                        placeholder="e.g. https://<id>.r2.cloudflarestorage.com or https://s3.amazonaws.com"
                        value={s3Endpoint}
                        onChange={(e) => setS3Endpoint(e.target.value)}
                        autoComplete="new-password"
                        disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                      />
                      <p className="text-[11px] text-text-muted leading-relaxed">Required if you use Cloudflare R2, MinIO, or custom S3-compatible storage providers.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="s3AccessKeyId" className="fz-13 fw-500 text-text-light">S3 Access Key ID</label>
                        <Input
                          variant="text"
                          name="s3AccessKeyId"
                          id="s3AccessKeyId"
                          placeholder="e.g. AKIAIOSFODNN7EXAMPLE"
                          value={s3AccessKeyId}
                          onChange={(e) => setS3AccessKeyId(e.target.value)}
                          autoComplete="new-password"
                          disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="s3SecretAccessKey" className="fz-13 fw-500 text-text-light">S3 Secret Access Key</label>
                        <Input
                          variant="password"
                          name="s3SecretAccessKey"
                          id="s3SecretAccessKey"
                          placeholder={activeWorkspace?.s3AccessKeyId ? "••••••••••••••••" : "Enter S3 secret key"}
                          value={s3SecretAccessKey}
                          onChange={(e) => setS3SecretAccessKey(e.target.value)}
                          autoComplete="new-password"
                          disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="s3PublicUrl" className="fz-13 fw-500 text-text-light">Public CDN URL (Optional)</label>
                      <Input
                        variant="text"
                        name="s3PublicUrl"
                        id="s3PublicUrl"
                        placeholder="e.g. https://cdn.mycompany.com"
                        value={s3PublicUrl}
                        onChange={(e) => setS3PublicUrl(e.target.value)}
                        autoComplete="new-password"
                        disabled={activeWorkspace?.migrationStatus === 'MIGRATING'}
                      />
                      <p className="text-[11px] text-text-muted leading-relaxed">If configured, OptiDrive will use this URL as the base domain for your optimized images (highly recommended for SEO and performance).</p>
                    </div>

                    {/* S3 Connection Test results */}
                    {testResult && (
                      <div className={`mt-3 p-3 rounded-lg border text-xs ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Icon icon={testResult.success ? "lucide:check-circle" : "lucide:alert-triangle"} width={16} />
                          {testResult.success ? 'Test connection successful!' : 'Test connection failed'}
                        </div>
                        <p className="mt-1 leading-normal opacity-90">{testResult.message}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save & Test Connection buttons */}
        {isEnterprise && activeWorkspace?.migrationStatus !== 'MIGRATING' && activeWorkspace?.migrationStatus !== 'REVERTING' && (
          <div className="bg-bg flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 sm:px-6 border-t border-border/50">
            {customS3Enabled ? (
              <Button
                variant="bordered"
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="w-full sm:w-auto h-10 px-4 justify-center"
              >
                {isTestingConnection ? 'Testing Connection...' : 'Test Connection'}
              </Button>
            ) : <div />}
            <Button 
              variant="accent" 
              className="w-full sm:w-auto h-10 px-4 justify-center"
              onClick={() => setIsSaveChangesModalOpen(true)}
            >
              Save Storage Settings
            </Button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="border-error/30 bg-error/5 flex flex-col overflow-hidden rounded-2xl border">
        <div className="flex items-center gap-2 p-4 pb-2 sm:p-6 sm:pb-4">
          <Icon
            icon="lucide:triangle-alert"
            className="text-error shrink-0"
            width="18"
            height="18"
          />
          <span className="text-error text-lg font-semibold">
            Danger Zone
          </span>
        </div>

        <div className="flex flex-col">
          {isOwner ? (
            <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="text-text-light text-base font-medium">
                  Delete Workspace
                </span>
                <p className="text-text-muted text-sm">
                  Permanently delete this workspace and all its optimized media, tags, webhooks, and team settings. This action is irreversible.
                </p>
              </div>
              <Button
                variant="danger"
                className="w-full shrink-0 justify-center sm:w-auto"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Icon icon="lucide:trash-2" width={16} height={16} className="mr-2" />
                Delete Workspace
              </Button>
            </div>
          ) : (
            <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="text-text-light text-base font-medium">
                  Leave Workspace
                </span>
                <p className="text-text-muted text-sm">
                  Leave this workspace. You will lose access to its files and CDN credentials.
                </p>
              </div>
              <Button
                variant="danger"
                className="w-full shrink-0 justify-center sm:w-auto"
                onClick={() => setIsLeaveModalOpen(true)}
              >
                <Icon icon="lucide:square-arrow-right-exit" width={16} height={16} className="mr-2" />
                Leave Workspace
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={isSaveChangesModalOpen}
        onClose={() => setIsSaveChangesModalOpen(false)}
        onConfirm={handleSaveChanges}
        title="Save Workspace Preferences"
        description="Are you sure you want to update the workspace configurations?"
        confirmText={isSaving ? "Saving..." : "Save"}
        variant="accent"
        icon="lucide:save"
      />

      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleLeaveWorkspace}
        title="Leave Workspace"
        description="Are you sure you want to leave this workspace? You will lose access to all its content."
        confirmText={isLeaving ? "Leaving..." : "Leave Workspace"}
        variant="danger"
        icon="lucide:door-open"
        requiredInputText="LEAVE WORKSPACE"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteWorkspace}
        title="Delete Workspace"
        description="Are you sure you want to permanently delete this workspace? All S3 storage will be wiped out and all keys revoked."
        confirmText={isDeleting ? "Deleting..." : "Delete Workspace"}
        variant="danger"
        icon="lucide:trash-2"
        requiredInputText="DELETE WORKSPACE"
      />

      <ConfirmModal
        isOpen={!!errorMessage}
        onClose={() => setErrorMessage('')}
        onConfirm={() => setErrorMessage('')}
        title="Error"
        description={errorMessage}
        confirmText="OK"
        cancelText=""
        variant="danger"
        icon="lucide:alert-circle"
      />

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={feedback.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
