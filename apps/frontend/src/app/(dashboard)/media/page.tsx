'use client';

import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useState, useEffect } from 'react';
import { MediaTable } from '@/features/media/MediaTable';
import { UploadMediaModal } from '@/features/media/UploadMediaModal';
import { getWorkspaceStatsApi, WorkspaceStats } from '@/features/dashboard/api';
import QuotaAlerts from '@/features/dashboard/QuotaAlerts';
import { useAuth } from '@/contexts/AuthContext';

const MediaLibraryPage = () => {
  const { workspaces, user, login } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const isMigrating = activeWorkspace?.migrationStatus === 'MIGRATING' || activeWorkspace?.migrationStatus === 'REVERTING';

  const [isStartingMigration, setIsStartingMigration] = useState(false);

  const handleStartMigration = async () => {
    setIsStartingMigration(true);
    try {
      const { startWorkspaceMigrationApi } = await import('@/features/settings/api');
      const res = await startWorkspaceMigrationApi();
      if (res.success) {
        if (user) {
          const token = localStorage.getItem('optidrive_token') || '';
          login(token, { ...user }, true);
        }
      }
    } catch (err: any) {
      console.error('Failed to start migration:', err);
    } finally {
      setIsStartingMigration(false);
    }
  };

  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const [stats, setStats] = useState<WorkspaceStats | null>(null);

  useEffect(() => {
    getWorkspaceStatsApi().then(setStats).catch(console.error);
  }, [refreshKey]);

  const isUploadBlocked = isMigrating || (stats
    ? Number(stats.storageUsed) >= Number(stats.limits.storageBytes) ||
      Number(stats.bandwidthUsed) >= Number(stats.limits.bandwidthBytes) ||
      stats.monthlyOptimizations >= stats.limits.monthlyOptimizations
    : false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploadBlocked || isMigrating) return;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOverPage(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverPage(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverPage(false);
    if (isUploadBlocked || isMigrating) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDroppedFile(e.dataTransfer.files[0]);
      setIsUploadModalOpen(true);
    }
  };

  return (
    <div 
      className="relative flex h-full w-full flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOverPage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl m-4 pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-card p-6 rounded-2xl shadow-xl">
            <Icon icon="lucide:upload-cloud" width={48} className="text-blue-500" />
            <h2 className="text-xl font-semibold text-text-light">Drop file to upload</h2>
          </div>
        </div>
      )}
      
      <section className="dashboard-page relative">
        <PageHeading title="Media Library">
          <div className="flex items-center gap-2 w-fit ">
            <Link href="/settings/compression" title="Configure Compression Defaults" className="shrink-0">
              <Button variant="bordered" className="p-2.5 h-10 w-10 flex items-center justify-center border-border bg-card text-text-muted hover:text-text-light">
                <Icon icon="lucide:settings-2" width={18} height={18} />
              </Button>
            </Link>

            <Button 
              variant={isUploadBlocked ? 'bordered' : 'accent'} 
              onClick={() => setIsUploadModalOpen(true)}
              disabled={isUploadBlocked}
              className={`flex items-center justify-center p-2.5 h-10 w-10 md:w-auto md:px-4 ${isUploadBlocked ? 'opacity-50 border-dashed border-red-500/30 text-red-400 bg-red-950/10 cursor-not-allowed hover:scale-100 hover:brightness-100 active:scale-100' : ''}`}
            >
              <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4 shrink-0">
                <Icon icon={isUploadBlocked ? "lucide:lock" : "lucide:upload"} width="100%" height="100%" />
              </div>
              <span className="hidden md:inline ml-2">{isUploadBlocked ? 'Upload Blocked' : 'Upload Media'}</span>
            </Button>
          </div>
        </PageHeading>

        {/* Mobile FAB */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          disabled={isUploadBlocked}
          className={`md:hidden fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${isUploadBlocked ? 'bg-red-950/80 text-red-400 border border-red-500/30' : 'bg-accent text-white'}`}
        >
          <Icon icon={isUploadBlocked ? "lucide:lock" : "lucide:upload"} width={24} />
        </button>
        <div className="flex flex-col gap-6 p-8 pb-0">
          <QuotaAlerts />

          {activeWorkspace?.migrationStatus === 'MIGRATION_REQUIRED' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="lucide:arrow-right-left" className="text-amber-400" width={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-sm font-semibold text-text-light">Custom Storage Activation Required</h4>
                  <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
                    Your custom S3 storage is connected, but not active. You must migrate your existing files to activate custom S3. Currently, all new files are still uploaded to the default storage.
                  </p>
                </div>
              </div>
              <Button
                variant="accent"
                className="w-full sm:w-auto h-10 px-5 shrink-0 justify-center font-semibold text-sm hover:scale-102 transition-transform duration-200"
                onClick={handleStartMigration}
                disabled={isStartingMigration}
              >
                {isStartingMigration ? 'Starting...' : 'Migrate Now'}
              </Button>
            </div>
          )}

          {isMigrating ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-2xl animate-fadeIn">
              <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Icon icon="line-md:loading-twotone-loop" className="text-blue-400" width={26} />
              </div>
              <h3 className="text-lg font-semibold text-text-light">
                {activeWorkspace?.migrationStatus === 'REVERTING' ? 'Reverting Storage...' : 'Migration in Progress...'}
              </h3>
              <p className="text-sm text-text-muted mt-2 max-w-lg leading-relaxed">
                OptiDrive is transferring files for this workspace ({activeWorkspace?.migrationProgress || '0%'}). All media library write operations (uploads, deletes, folder creation) are temporarily locked to prevent data corruption.
              </p>
              <Link href="/settings/project" className="mt-5">
                <Button variant="bordered">Check Migration Status</Button>
              </Link>
            </div>
          ) : (
            <div className='flex flex-col w-full h-fit min-w-0 gap-4 xl:gap-0 xl:bg-card xl:border border-border rounded-2xl '>
              <MediaTable 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery}
                formatFilter={formatFilter} 
                setFormatFilter={setFormatFilter}
                refreshKey={refreshKey}
                currentFolderId={currentFolderId}
                onFolderChange={setCurrentFolderId}
              />
            </div>
          )}
        </div>
        
        <UploadMediaModal 
          isOpen={isUploadModalOpen} 
          onClose={() => {
            setIsUploadModalOpen(false);
            setDroppedFile(null);
          }} 
          onSuccess={handleUploadSuccess}
          folderId={currentFolderId}
          initialFile={droppedFile}
        />
      </section>
    </div>
  );
};

export default MediaLibraryPage;
