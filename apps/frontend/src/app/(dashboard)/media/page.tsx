'use client';

import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import PageHeading from '@/components/PageHeading';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { MediaTable } from '@/features/media/MediaTable';
import { UploadMediaModal } from '@/features/media/UploadMediaModal';

const MediaLibraryPage = () => {
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <section className="dashboard-page relative">
      <PageHeading title="Media Library">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            className="xl:hidden border border-border bg-card"
            onClick={() => setIsSelectionMode(!isSelectionMode)}
          >
            {isSelectionMode ? 'Cancel' : 'Select'}
          </Button>
          <Button variant="accent" mobileBehavior="icon-only" onClick={() => setIsUploadModalOpen(true)}>
            <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
              <Icon icon="lucide:upload" width="100%" height="100%" />
            </div>
            <span>Upload Media</span>
          </Button>
        </div>
      </PageHeading>
      <div className="flex flex-col gap-6 p-8 pb-0">

        <div className='flex flex-col w-full h-fit min-w-0 gap-4 xl:gap-0 xl:bg-card xl:border border-border rounded-2xl '>
          <MediaTable 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
            formatFilter={formatFilter} 
            setFormatFilter={setFormatFilter}
            isSelectionMode={isSelectionMode}
            onSelectionModeChange={setIsSelectionMode}
            refreshKey={refreshKey}
            currentFolderId={currentFolderId}
            onFolderChange={setCurrentFolderId}
          />
        </div>
      </div>
      
      <UploadMediaModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onSuccess={handleUploadSuccess}
        folderId={currentFolderId}
      />
    </section>
  );
};

export default MediaLibraryPage;
