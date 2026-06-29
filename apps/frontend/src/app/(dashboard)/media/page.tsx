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
  
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
