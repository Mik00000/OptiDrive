'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import React from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { Modal } from '@/components/Modal';
import {
  getMediaFilesApi,
  deleteMediaFileApi,
  MediaFile,
  downloadMediaFileClientApi,
  Folder,
  createFolderApi,
  renameFolderApi,
  deleteFolderApi,
  moveItemsApi,
  getFolderNavigationPathApi,
  getFoldersApi,
  downloadFolderClientApi,
  getWorkspaceTagsApi,
  updateMediaFileApi,
  Tag,
} from './api';
import { MediaPreviewModal } from './MediaPreviewModal';
import { ShareModal } from '../share/ShareModal';

const SavingsTooltip = ({ children }: { children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < 70;

    setPos({
      top: flip ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      flip,
    });
    setShow(true);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      className="inline-flex cursor-help"
    >
      {children}
      {show && (
        <div
          className="pointer-events-none fixed z-[10000] w-44"
          style={{
            top: pos.top,
            left: pos.left,
            transform: pos.flip
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
          }}
        >
          <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs leading-relaxed text-slate-200 shadow-xl">
            Size increased due to format conversion (e.g. to PNG) or quality
            settings.
          </div>
          <div
            className={`absolute left-1/2 -ml-1.5 border-[6px] border-transparent ${pos.flip ? 'top-full border-t-slate-700' : 'bottom-full border-b-slate-700'}`}
          />
          <div
            className={`absolute left-1/2 -ml-1.5 border-[6px] border-transparent ${pos.flip ? 'top-full -mt-px border-t-slate-800' : 'bottom-full -mb-px border-b-slate-800'}`}
          />
        </div>
      )}
    </div>
  );
};

const FOLDER_COLORS = [
  { name: 'Default', value: null },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Gray', value: '#64748b' },
];

const truncateMiddle = (text: string, maxLength = 24) => {
  if (text.length <= maxLength) return text;
  const charsToShow = maxLength - 3;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return text.substr(0, frontChars) + '...' + text.substr(text.length - backChars);
};

interface MediaTableProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  formatFilter: string;
  setFormatFilter: (val: string) => void;
  refreshKey?: number;
  currentFolderId: string | null;
  onFolderChange: (id: string | null) => void;
}

export const MediaTable = ({
  searchQuery,
  setSearchQuery,
  formatFilter,
  setFormatFilter,
  refreshKey = 0,
  currentFolderId,
  onFolderChange,
}: MediaTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forceSelectionMode, setForceSelectionMode] = useState(false);
  const isSelectionMode = forceSelectionMode || selectedIds.size > 0;
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  // Folder actions state
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(
    null,
  );
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renameFolderColor, setRenameFolderColor] = useState<string | null>(null);
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(
    null,
  );
  const [moveFoldersList, setMoveFoldersList] = useState<Folder[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Tag editing state
  const [isEditTagsModalOpen, setIsEditTagsModalOpen] = useState(false);
  const [editTagsTargetFile, setEditTagsTargetFile] = useState<MediaFile | null>(null);
  const [editTagsList, setEditTagsList] = useState<string[]>([]);
  const [allWorkspaceTags, setAllWorkspaceTags] = useState<Tag[]>([]);
  const [tagInputVal, setTagInputVal] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');

  // Bulk Actions / Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'file' | 'folder';
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    type: 'file' | 'folder';
    name: string;
  } | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Drag and drop state
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const showFeedback = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const itemsPerPage = 7;

  // Search debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    type: 'file' | 'folder',
  ) => {
    let ids = [id];
    if (selectedIds.has(id)) {
      ids = Array.from(selectedIds);
    }
    setDraggedIds(ids);

    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        ids,
        type,
        source: selectedIds.has(id) ? 'selection' : 'single',
      }),
    );
  };

  const handleDragEnd = () => {
    setDraggedIds([]);
    setDragOverFolderId(null);
  };

  const handleDragOverFolder = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedIds.includes(folderId)) return;
    setDragOverFolderId(folderId);
  };

  const handleDragLeaveFolder = () => {
    setDragOverFolderId(null);
  };

  const handleDropOnFolder = async (
    e: React.DragEvent,
    targetFolderId: string,
  ) => {
    e.preventDefault();
    setDragOverFolderId(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      const fileIds: string[] = [];
      const folderIds: string[] = [];

      const idsToMove = data.ids as string[];
      for (const id of idsToMove) {
        if (folders.some((f) => f.id === id)) {
          folderIds.push(id);
        } else {
          fileIds.push(id);
        }
      }

      if (fileIds.length === 0 && folderIds.length === 0) return;

      // Prevent moving a folder into its parent (which is where it already is)
      if (targetFolderId === currentFolderId) return;

      showFeedback('Moving items...');
      await moveItemsApi(folderIds, fileIds, targetFolderId || null);
      showFeedback('Items moved successfully');
      setSelectedIds(new Set());
      setForceSelectionMode(false);

      fetchLibrary();
    } catch (err: any) {
      showFeedback(
        err.response?.data?.error || err.message || 'Failed to move items',
        'error',
      );
    }
  };

  // Fetch path (breadcrumbs)
  useEffect(() => {
    const fetchPath = async () => {
      if (currentFolderId) {
        try {
          const p = await getFolderNavigationPathApi(currentFolderId);
          setPath(p);
        } catch (error) {
          console.error('Failed to fetch path', error);
        }
      } else {
        setPath([]);
      }
    };
    fetchPath();
  }, [currentFolderId]);

  // Fetch files and folders in current directory
  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const data = await getMediaFilesApi(currentFolderId, debouncedSearch);
      setFiles(data.files);
      setFolders(data.folders);
      
      const tags = await getWorkspaceTagsApi();
      setAllWorkspaceTags(tags);
    } catch (error) {
      console.error('Failed to fetch media files', error);
      showFeedback('Failed to fetch media library.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [refreshKey, currentFolderId, debouncedSearch]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await createFolderApi(newFolderName, currentFolderId, newFolderColor);
      showFeedback(`Folder "${newFolderName}" created successfully`);
      setNewFolderName('');
      setNewFolderColor(null);
      setIsCreateFolderModalOpen(false);
      fetchLibrary();
    } catch (error: any) {
      showFeedback(
        error.response?.data?.error ||
          error.message ||
          'Failed to create folder',
        'error',
      );
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderTarget || !renameFolderName.trim()) return;
    setIsRenamingFolder(true);
    try {
      await renameFolderApi(renameFolderTarget.id, renameFolderName, renameFolderColor);
      showFeedback('Folder renamed successfully');
      setRenameFolderTarget(null);
      setRenameFolderColor(null);
      setIsRenameFolderModalOpen(false);
      fetchLibrary();
    } catch (error: any) {
      showFeedback(
        error.response?.data?.error ||
          error.message ||
          'Failed to rename folder',
        'error',
      );
    } finally {
      setIsRenamingFolder(false);
    }
  };

  const handleMoveItems = async () => {
    setIsMoving(true);
    try {
      const selectedFolderIds = Array.from(selectedIds).filter((id) =>
        folders.some((f) => f.id === id),
      );
      const selectedFileIds = Array.from(selectedIds).filter((id) =>
        files.some((f) => f.id === id),
      );

      await moveItemsApi(
        selectedFolderIds,
        selectedFileIds,
        moveTargetFolderId,
      );
      showFeedback('Items moved successfully');
      setSelectedIds(new Set());
      setForceSelectionMode(false);

      setIsMoveModalOpen(false);
      fetchLibrary();
    } catch (error: any) {
      showFeedback(
        error.response?.data?.error || error.message || 'Failed to move items',
        'error',
      );
    } finally {
      setIsMoving(false);
    }
  };

  const handleOpenEditTags = async (file: MediaFile) => {
    setEditTagsTargetFile(file);
    setEditTagsList(file.tags ? file.tags.map((t) => t.name) : []);
    setTagInputVal('');
    setIsEditTagsModalOpen(true);
    try {
      const tags = await getWorkspaceTagsApi();
      setAllWorkspaceTags(tags);
    } catch (err) {
      console.error('Failed to load workspace tags:', err);
    }
  };

  const handleSaveTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTagsTargetFile) return;
    setIsSavingTags(true);
    try {
      await updateMediaFileApi(editTagsTargetFile.id, undefined, editTagsList);
      showFeedback('Tags updated successfully');
      setIsEditTagsModalOpen(false);
      fetchLibrary();
    } catch (error: any) {
      showFeedback(
        error.message || 'Failed to update tags',
        'error',
      );
    } finally {
      setIsSavingTags(false);
    }
  };

  const confirmDelete = (fileId?: string) => {
    if (fileId) {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        setDeleteTarget({ id: file.id, type: 'file', name: file.name });
      }
    } else {
      setDeleteTarget(null);
    }
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteTarget) {
        if (deleteTarget.type === 'folder') {
          await deleteFolderApi(deleteTarget.id);
          showFeedback(`Folder "${deleteTarget.name}" deleted`);
        } else {
          await deleteMediaFileApi(deleteTarget.id);
          showFeedback(`File "${deleteTarget.name}" deleted`);
        }
      } else {
        const idsToDelete = Array.from(selectedIds);
        let filesCount = 0;
        let foldersCount = 0;

        for (const id of idsToDelete) {
          if (folders.some((f) => f.id === id)) {
            await deleteFolderApi(id);
            foldersCount++;
          } else {
            await deleteMediaFileApi(id);
            filesCount++;
          }
        }
        setSelectedIds(new Set());
        setForceSelectionMode(false);

        showFeedback(
          `Successfully deleted ${foldersCount} folder(s) and ${filesCount} file(s)`,
        );
      }
      fetchLibrary();
    } catch (error: any) {
      showFeedback(
        error.response?.data?.error ||
          error.message ||
          'Failed to delete items',
        'error',
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showFeedback('Public CDN URL(s) copied to clipboard!');
  };

  const handleBulkDownload = async () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));
    const selectedFolders = folders.filter((f) => selectedIds.has(f.id));
    
    if (selectedFiles.length === 0 && selectedFolders.length === 0) return;

    const totalItems = selectedFiles.length + selectedFolders.length;
    showFeedback(`Preparing download for ${totalItems} item(s)...`);

    for (const folder of selectedFolders) {
      try {
        await downloadFolderClientApi(folder.id, folder.name);
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.error('Folder download failed', e);
        showFeedback(`Failed to download folder "${folder.name}"`, 'error');
      }
    }

    for (const file of selectedFiles) {
      try {
        await downloadMediaFileClientApi(file.id, file.name);
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.error('File download failed', e);
        showFeedback(`Failed to download ${file.name}`, 'error');
      }
    }
    showFeedback('Downloads completed!');
  };

  // Filtering
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFormat =
        formatFilter === 'all' ||
        file.format.toLowerCase() === formatFilter.toLowerCase();
      const matchesTag =
        selectedTagFilter === 'all' ||
        (file.tags && file.tags.some((t) => t.name.toLowerCase() === selectedTagFilter.toLowerCase()));
      return matchesSearch && matchesFormat && matchesTag;
    });
  }, [searchQuery, formatFilter, selectedTagFilter, files]);

  // Pagination for files
  const paginatedFiles = useMemo(() => {
    return filteredFiles.slice(0, currentPage * itemsPerPage);
  }, [filteredFiles, currentPage]);

  const hasMore = currentPage * itemsPerPage < filteredFiles.length;

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const pageIds = useMemo(
    () => [...folders.map((f) => f.id), ...paginatedFiles.map((f) => f.id)],
    [folders, paginatedFiles],
  );

  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const handleSelectAllPage = () => {
    const newSet = new Set(selectedIds);
    if (allPageSelected) {
      pageIds.forEach((id) => newSet.delete(id));
    } else {
      pageIds.forEach((id) => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Helper to construct folder options for move modal select input
  const moveFolderOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: '', label: 'Root (Home)' }];

    const addOptions = (foldersList: Folder[], currentParentId: string | null = null, depth = 0) => {
      const levelFolders = foldersList.filter((f) => f.parentId === currentParentId);
      for (const f of levelFolders) {
        const indent = depth > 0 ? '\u00A0'.repeat(depth * 3) + '└─ ' : '';
        list.push({
          value: f.id,
          label: `${indent}${f.name}`
        });
        addOptions(foldersList, f.id, depth + 1);
      }
    };

    addOptions(moveFoldersList);
    return list;
  }, [moveFoldersList]);

  return (
    <div className="flex min-h-[400px] w-full flex-col">
      {/* 1. Breadcrumbs Row (Text chain without borders) */}
      <div className="flex items-center px-4 md:px-6 py-4">
        <div className="text-text-muted flex items-center gap-1.5 text-base md:text-lg font-medium">
          <button
            onClick={() => onFolderChange(null)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolderId('root');
            }}
            onDragLeave={handleDragLeaveFolder}
            onDrop={(e) => handleDropOnFolder(e, '')}
            className={`hover:text-text-light flex cursor-pointer items-center gap-1 px-2 py-1 transition-colors ${dragOverFolderId === 'root' ? 'text-blue-400' : ''}`}
          >
            Home
          </button>
          {path.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span className="text-text-muted/40 mx-1">/</span>
              <button
                onClick={() => onFolderChange(folder.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(folder.id);
                }}
                onDragLeave={handleDragLeaveFolder}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                className={`cursor-pointer px-2 py-1 transition-colors ${index === path.length - 1 ? 'text-accent font-semibold' : 'hover:text-text-light'} ${dragOverFolderId === folder.id ? 'text-blue-400' : ''}`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2. Compact Toolbar Row (Search, Filter, New Folder) */}
      <div className="border-border flex flex-col xl:flex-row xl:items-center gap-4 px-4 md:px-6 pb-4">
        <Input 
          variant='search' 
          placeholder='Search files by name...' 
          wrapperClassName='md:max-w-md w-full h-10 shrink-0'
          className='bg-bg h-full border-border/80 focus:border-accent'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          <Input
            variant="select"
            icon="lucide:filter"
            prefix="Format: "
            options={[
              { value: "all", label: "All" },
              { value: "avif", label: "Avif" },
              { value: "webp", label: "WebP" },
              { value: "png", label: "Png" },
              { value: "jpeg", label: "Jpeg" },
              { value: "svg", label: "Svg" },
              { value: "gif", label: "Gif" },
              { value: "ico", label: "Ico" },
              { value: "bmp", label: "Bmp" },
              { value: "tiff", label: "Tiff" },
              { value: "raw", label: "Raw" },
              { value: "pdf", label: "Pdf" },
              { value: "other", label: "Other" },
            ]}
            value={formatFilter}
            onChange={setFormatFilter}
            className="text-text-light text-sm w-max md:w-fit bg-bg rounded-xl h-10 border-border/80 shrink-0 min-w-[140px]"
          />
          <Input
            variant="select"
            icon="lucide:tag"
            prefix="Tag: "
            options={[
              { value: "all", label: "All" },
              ...allWorkspaceTags.map((t) => ({ value: t.name, label: t.name })),
            ]}
            value={selectedTagFilter}
            onChange={setSelectedTagFilter}
            className="text-text-light text-sm w-max md:w-fit bg-bg rounded-xl h-10 border-border/80 shrink-0 min-w-[120px]"
          />
          <Button
            variant="bordered"
            className="border-border flex h-10 items-center gap-1.5 text-sm whitespace-nowrap bg-bg hover:bg-card/50 shrink-0"
            onClick={() => setIsCreateFolderModalOpen(true)}
          >
            <Icon icon="lucide:folder-plus" width={16} className="text-accent" />
            New Folder
          </Button>

          {isSelectionMode ? (
            <Button
              variant="bordered"
              onClick={() => {
                setSelectedIds(new Set());
                setForceSelectionMode(false);
              }}
              className="md:hidden h-10 px-4 shrink-0 border-blue-500/30 text-blue-400 hover:bg-blue-950/20"
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="bordered"
              onClick={() => setForceSelectionMode(true)}
              className="md:hidden h-10 px-4 shrink-0 text-text-muted hover:text-text-light"
            >
              Select
            </Button>
          )}

          <div className="flex bg-card/50 border border-border rounded-xl p-1 shrink-0 h-10 ml-auto">
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex items-center justify-center px-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-bg shadow text-accent' : 'text-text-muted hover:text-text-light'}`}
              title="List View"
            >
              <Icon icon="lucide:list" width={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`flex items-center justify-center px-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-bg shadow text-accent' : 'text-text-muted hover:text-text-light'}`}
              title="Grid View"
            >
              <Icon icon="lucide:grid" width={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={viewMode === 'list' ? 'hidden md:block overflow-x-auto w-full' : 'hidden'}>
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            {selectedIds.size > 0 ? (
              <tr className="border-y border-blue-500/30 bg-blue-950/20 text-xs font-medium text-blue-400">
                <th className="w-14 px-4 py-3 text-center align-middle">
                  <div
                    onClick={handleSelectAllPage}
                    className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${allPageSelected ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
                  >
                    {allPageSelected && <Icon icon="lucide:check" width={14} />}
                    {!allPageSelected && somePageSelected && (
                      <Icon icon="lucide:minus" width={14} />
                    )}
                  </div>
                </th>
                <th colSpan={5} className="px-4 py-3 text-left align-middle font-medium">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-light">{selectedIds.size} item(s) selected</span>
                    <div className="h-4 w-px bg-blue-500/30"></div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBulkDownload}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                      >
                        <Icon icon="lucide:download" width={14} /> Download
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const foldersList = await getFoldersApi(true);
                            const selectedFolderList = foldersList.filter((f) => selectedIds.has(f.id));
                            const excludedIds = new Set<string>();
                            const addExcluded = async (fId: string) => {
                              excludedIds.add(fId);
                              const children = foldersList.filter((f) => f.parentId === fId);
                              for (const child of children) {
                                await addExcluded(child.id);
                              }
                            };
                            for (const f of selectedFolderList) {
                              await addExcluded(f.id);
                            }
                            setMoveFoldersList(foldersList.filter((f) => !excludedIds.has(f.id)));
                            setMoveTargetFolderId(currentFolderId);
                            setIsMoveModalOpen(true);
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                      >
                        <Icon icon="lucide:folder-input" width={14} /> Move
                      </button>
                      <button
                        onClick={() => {
                          const urls = Array.from(selectedIds)
                            .map((id) => files.find((f) => f.id === id)?.cdnUrl)
                            .filter(Boolean);
                          if (urls.length > 0) {
                            copyToClipboard(urls.join('\n'));
                          } else {
                            showFeedback('No files selected to copy links from', 'error');
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                      >
                        <Icon icon="lucide:copy" width={14} /> Copy Links
                      </button>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right align-middle font-medium">
                  <button
                    onClick={() => {
                      setDeleteTarget(null);
                      setIsDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                  >
                    <Icon icon="lucide:trash-2" width={14} /> Delete
                  </button>
                </th>
              </tr>
            ) : (
              <tr className="border-border text-text-muted border-y text-xs font-medium">
                <th className="w-14 px-4 py-4 text-center">
                  <div
                    onClick={handleSelectAllPage}
                    className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${allPageSelected ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
                  >
                    {allPageSelected && <Icon icon="lucide:check" width={14} />}
                    {!allPageSelected && somePageSelected && (
                      <Icon icon="lucide:minus" width={14} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-4 font-normal">Preview & Name</th>
                <th className="w-28 px-4 py-4 font-normal">Format</th>
                <th className="w-32 px-4 py-4 font-normal">Original Size</th>
                <th className="w-32 px-4 py-4 font-normal">Optimized Size</th>
                <th className="w-28 px-4 py-4 font-normal">Savings</th>
                <th className="w-36 px-6 py-4 text-right font-normal">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="text-text-light divide-border relative divide-y text-sm">
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <Icon
                    icon="lucide:loader-2"
                    className="text-accent mx-auto animate-spin"
                    width={24}
                  />
                </td>
              </tr>
            )}

            {/* Render Folders */}
            {!isLoading &&
              folders.map((folder) => {
                const isNonEmpty =
                  folder._count &&
                  (folder._count.files > 0 || folder._count.children > 0);
                return (
                  <tr
                    key={folder.id}
                    onClick={() => onFolderChange(folder.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeave={handleDragLeaveFolder}
                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                    className={`group cursor-pointer transition-colors ${selectedIds.has(folder.id) ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-slate-700/50'} ${dragOverFolderId === folder.id ? 'bg-blue-800/40' : ''}`}
                  >
                    <td
                      className={`px-6 py-4 text-center transition-all ${selectedIds.has(folder.id) ? 'border-l-2 border-accent' : 'border-l-2 border-transparent'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        onClick={() => toggleSelection(folder.id)}
                        className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${selectedIds.has(folder.id) ? 'border-blue-600 bg-blue-600 text-white opacity-100' : `bg-bg border-border hover:border-text-muted ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}`}
                      >
                        {selectedIds.has(folder.id) && (
                          <Icon icon="lucide:check" width={14} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            borderColor: folder.color ? `${folder.color}35` : undefined,
                            backgroundColor: folder.color ? `${folder.color}15` : undefined,
                            color: folder.color || undefined
                          }}
                          className="bg-sidebar border-border text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        >
                          <Icon
                            icon={
                              isNonEmpty
                                ? 'lucide:folder-open'
                                : 'lucide:folder'
                            }
                            width={22}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate" title={folder.name}>
                            {truncateMiddle(folder.name, 35)}
                          </span>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {folder._count && (
                              <span className="text-text-muted text-[10px] font-semibold uppercase">
                                {folder._count.files} file
                                {folder._count.files !== 1 ? 's' : ''}
                                {folder._count.children > 0
                                  ? `, ${folder._count.children} folder${folder._count.children !== 1 ? 's' : ''}`
                                  : ''}
                              </span>
                            )}
                            {searchQuery && folder.path && (
                              <span className="text-text-muted text-[10px] font-medium">
                                • In: {folder.path}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-text-muted font-mono text-[11px] font-bold tracking-wider uppercase">
                        Folder
                      </span>
                    </td>
                    <td className="text-text-light px-4 py-4 font-mono text-xs">
                      {folder.originalSize !== undefined
                        ? formatBytes(folder.originalSize)
                        : '0 B'}
                    </td>
                    <td className="text-text-light px-4 py-4 font-mono text-xs">
                      {folder.optimizedSize !== undefined
                        ? formatBytes(folder.optimizedSize)
                        : '0 B'}
                    </td>
                    <td className="px-4 py-4">
                      {(() => {
                        const original = folder.originalSize || 0;
                        const optimized = folder.optimizedSize || 0;
                        const savings = original > 0 ? ((original - optimized) / original) * 100 : 0;
                        return savings > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                            -{savings.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-text-muted font-mono text-xs">—</span>
                        );
                      })()}
                    </td>
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveDropdownId(activeDropdownId === folder.id ? null : folder.id);
                          }}
                          className="text-text-muted hover:text-text-light p-2 transition-colors"
                          title="More Actions"
                        >
                          <Icon icon="lucide:more-vertical" width={16} />
                        </button>
                        {activeDropdownId === folder.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                            <div className="absolute right-8 top-8 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50 flex flex-col">
                              <button onClick={async () => {
                                setActiveDropdownId(null);
                                try {
                                  showFeedback('Preparing zip download...', 'success');
                                  await downloadFolderClientApi(folder.id, folder.name);
                                  showFeedback(`Folder "${folder.name}" downloaded successfully`);
                                } catch (err: any) {
                                  showFeedback(`Failed to download folder: ${err.message}`, 'error');
                                }
                              }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:download" width={14} /> Download</button>
                              <button onClick={() => { setActiveDropdownId(null); setShareTarget({ id: folder.id, type: 'folder', name: folder.name }); setIsShareModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-blue-400"><Icon icon="lucide:share-2" width={14} /> Share</button>
                              <button onClick={() => { setActiveDropdownId(null); setRenameFolderTarget(folder); setRenameFolderName(folder.name); setIsRenameFolderModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:edit-2" width={14} /> Rename</button>
                              <button onClick={() => { setActiveDropdownId(null); setDeleteTarget({ id: folder.id, type: 'folder', name: folder.name }); setIsDeleteModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-red-400"><Icon icon="lucide:trash-2" width={14} /> Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

            {/* Render Files */}
            {!isLoading &&
              paginatedFiles.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => toggleSelection(file.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.id, 'file')}
                  onDragEnd={handleDragEnd}
                  className={`group cursor-pointer transition-colors ${selectedIds.has(file.id) ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-slate-700/50'}`}
                >
                  <td
                    className={`px-6 py-4 text-center transition-all ${selectedIds.has(file.id) ? 'border-l-2 border-accent' : 'border-l-2 border-transparent'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      onClick={() => toggleSelection(file.id)}
                      className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${selectedIds.has(file.id) ? 'border-blue-600 bg-blue-600 text-white opacity-100' : `bg-bg border-border hover:border-text-muted ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}`}
                    >
                      {selectedIds.has(file.id) && (
                        <Icon icon="lucide:check" width={14} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="bg-sidebar border-border relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile(file);
                        }}
                      >
                        {file.cdnUrl ? (
                          <img
                            src={file.cdnUrl}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Icon
                            icon="lucide:image"
                            className="text-text-muted"
                            width={20}
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium" title={file.name}>
                          {truncateMiddle(file.name, 35)}
                        </span>
                        {file.tags && file.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {file.tags.map((tag: any) => (
                              <span
                                key={tag.id}
                                style={{
                                  backgroundColor: `${tag.color}15`,
                                  borderColor: `${tag.color}30`,
                                  color: tag.color,
                                }}
                                className="inline-flex items-center px-1 py-0.25 rounded text-[11px] font-medium border"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {searchQuery && file.path && (
                          <span className="text-text-muted mt-0.5 text-[10px] font-medium">
                            In: {file.path}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-text-light font-mono text-[11px] font-bold tracking-wider uppercase">
                      {file.format}
                    </span>
                  </td>
                  <td className="text-text-light px-4 py-4 font-mono text-xs">
                    {formatBytes(file.originalSize)}
                  </td>
                  <td className="text-text-light px-4 py-4 font-mono text-xs">
                    {formatBytes(file.optimizedSize)}
                  </td>
                  <td className="px-4 py-4">
                    {file.savings < 0 ? (
                      <SavingsTooltip>
                        <span className="inline-flex items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                          +{Math.abs(file.savings).toFixed(0)}%
                        </span>
                      </SavingsTooltip>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${file.savings > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/20 bg-slate-500/10 text-slate-400'}`}
                      >
                        {file.savings > 0
                          ? `-${file.savings.toFixed(0)}%`
                          : '0%'}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-6 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setActiveDropdownId(activeDropdownId === file.id ? null : file.id);
                          }}
                          className="text-text-muted hover:text-text-light p-2 transition-colors"
                          title="More Actions"
                        >
                          <Icon icon="lucide:more-vertical" width={16} />
                        </button>
                        {activeDropdownId === file.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                            <div className="absolute right-8 top-8 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50 flex flex-col">
                              <button onClick={async () => {
                                setActiveDropdownId(null);
                                try {
                                  await downloadMediaFileClientApi(file.id, file.name);
                                } catch (e) {
                                  showFeedback(`Failed to download ${file.name}`, 'error');
                                }
                              }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:download" width={14} /> Download</button>
                              <button onClick={() => { setActiveDropdownId(null); setShareTarget({ id: file.id, type: 'file', name: file.name }); setIsShareModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-blue-400"><Icon icon="lucide:share-2" width={14} /> Share</button>
                              <button onClick={() => { setActiveDropdownId(null); setEditTagsTargetFile(file); setEditTagsList(file.tags ? file.tags.map(t => t.name) : []); setTagInputVal(''); setIsEditTagsModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:tag" width={14} /> Edit Tags</button>
                              <button onClick={() => { setActiveDropdownId(null); setDeleteTarget({ id: file.id, type: 'file', name: file.name }); setIsDeleteModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-red-400"><Icon icon="lucide:trash-2" width={14} /> Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

            {!isLoading &&
              folders.length === 0 &&
              paginatedFiles.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-text-muted py-8 text-center">
                    This directory is empty.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* Mobile List View */}
      <div className={viewMode === 'list' ? 'md:hidden bg-bg mt-4 flex flex-col gap-6 px-4 pb-6' : 'hidden'}>
        {!isLoading && folders.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider pl-1">Folders</h3>
            <div className="flex flex-col gap-3">
              {folders.map((folder) => {
                const isNonEmpty = folder._count && (folder._count.files > 0 || folder._count.children > 0);
                return (
                  <div
                    key={folder.id}
                    onClick={() => isSelectionMode ? toggleSelection(folder.id) : onFolderChange(folder.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeave={handleDragLeaveFolder}
                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer shadow-sm ${selectedIds.has(folder.id) ? 'border-blue-500/50 bg-blue-900/20' : 'bg-card border-border hover:bg-card/80'} ${dragOverFolderId === folder.id ? 'border-blue-500 bg-blue-800/40' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div
                          style={{
                            borderColor: folder.color ? `${folder.color}35` : undefined,
                            backgroundColor: folder.color ? `${folder.color}15` : undefined,
                            color: folder.color || undefined
                          }}
                          className="bg-sidebar border-border text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                        >
                          <Icon icon={isNonEmpty ? 'lucide:folder-open' : 'lucide:folder'} width={22} />
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(folder.id);
                          }}
                          className={`absolute -top-1.5 -left-1.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors shadow-md ${selectedIds.has(folder.id) ? 'border-blue-600 bg-blue-600 text-white opacity-100' : `bg-bg/80 border-border ${isSelectionMode ? 'opacity-100' : 'opacity-0'}`}`}
                        >
                          {selectedIds.has(folder.id) && <Icon icon="lucide:check" width={16} />}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-text-light truncate text-sm font-medium" title={folder.name}>
                          {truncateMiddle(folder.name, 28)}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          {folder._count && (
                            <span className="text-text-muted text-[10px] font-semibold">
                              {folder._count.files} {folder._count.files !== 1 ? 'files' : 'file'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2 relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        onFolderChange(folder.id);
                      }} className="text-text-muted hover:text-accent p-2 transition-colors"><Icon icon="lucide:arrow-right" width={18} /></button>
                      <button onClick={() => {
                        setActiveDropdownId(activeDropdownId === folder.id ? null : folder.id);
                      }} className="text-text-muted hover:text-text-light p-2 transition-colors"><Icon icon="lucide:more-vertical" width={18} /></button>
                      
                      {activeDropdownId === folder.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                          <div className="absolute right-0 top-12 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50 flex flex-col">
                            <button onClick={async () => {
                              setActiveDropdownId(null);
                              try {
                                showFeedback('Preparing zip download...', 'success');
                                await downloadFolderClientApi(folder.id, folder.name);
                                showFeedback(`Folder "${folder.name}" downloaded successfully`);
                              } catch (err: any) {
                                showFeedback(`Failed to download folder: ${err.message}`, 'error');
                              }
                            }} className="flex items-center gap-2 px-4 py-2 text-sm text-text-light hover:bg-slate-700/50 text-left transition-colors">
                              <Icon icon="lucide:download" width={16} /> Download
                            </button>
                            <button onClick={() => {
                              setActiveDropdownId(null);
                              setRenameFolderTarget(folder);
                              setRenameFolderName(folder.name);
                              setRenameFolderColor(folder.color || null);
                              setIsRenameFolderModalOpen(true);
                            }} className="flex items-center gap-2 px-4 py-2 text-sm text-text-light hover:bg-slate-700/50 text-left transition-colors">
                              <Icon icon="lucide:edit-2" width={16} /> Rename
                            </button>
                            <div className="h-px bg-border/50 my-1 mx-2" />
                            <button onClick={() => {
                              setActiveDropdownId(null);
                              setDeleteTarget({ id: folder.id, type: 'folder', name: folder.name });
                              setIsDeleteModalOpen(true);
                            }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left transition-colors">
                              <Icon icon="lucide:trash-2" width={16} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && paginatedFiles.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider pl-1">Files</h3>
            <div className="flex flex-col gap-3">
              {paginatedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => isSelectionMode ? toggleSelection(file.id) : setPreviewFile(file)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.id, 'file')}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-xl border bg-card shadow-sm cursor-pointer relative transition-colors ${selectedIds.has(file.id) ? 'border-blue-500/50 ring-2 ring-blue-500/50' : 'border-border'}`}
                >
                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-900/50 relative border border-border/50">
                    {file.cdnUrl ? (
                      <img src={file.cdnUrl} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Icon icon="lucide:image" className="text-text-muted" width={24} />
                      </div>
                    )}
                    <div className="absolute -top-1.5 -left-1.5 z-10">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(file.id);
                        }}
                        className={`inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors shadow-md ${selectedIds.has(file.id) ? 'border-blue-600 bg-blue-600 text-white opacity-100' : `bg-bg/80 border-border ${isSelectionMode ? 'opacity-100' : 'opacity-0'}`}`}
                      >
                        {selectedIds.has(file.id) && <Icon icon="lucide:check" width={16} />}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <span className="text-sm font-medium line-clamp-2 text-text-light break-all leading-tight mb-1" title={file.name}>{file.name}</span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted font-mono">
                      <span className="font-bold text-white bg-black/60 px-1 rounded uppercase tracking-wider">{file.format}</span>
                      <span>•</span>
                      <span title={`Original: ${formatBytes(file.originalSize)}`}>{formatBytes(file.originalSize)} <Icon icon="lucide:arrow-right" className="inline w-3 h-3 mx-0.5 opacity-50" /> <span className="text-accent font-semibold">{formatBytes(file.optimizedSize)}</span></span>
                      
                      {file.savings < 0 ? (
                        <span className="inline-flex items-center justify-center rounded border border-red-500/20 bg-red-500/10 px-1 py-0.5 font-bold text-red-400 leading-none">
                          +{Math.abs(file.savings).toFixed(0)}%
                        </span>
                      ) : file.savings > 0 && (
                        <span className="inline-flex items-center justify-center rounded border border-emerald-500/20 bg-emerald-500/10 px-1 py-0.5 font-bold text-emerald-400 leading-none">
                          -{file.savings.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setActiveDropdownId(activeDropdownId === file.id ? null : file.id); }} className="text-text-muted hover:text-text-light p-2" title="More options">
                      <Icon icon="lucide:more-vertical" width={20} />
                    </button>
                    {activeDropdownId === file.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                        <div className="absolute right-0 top-10 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50 flex flex-col">
                          <button onClick={async () => {
                            setActiveDropdownId(null);
                            try {
                              showFeedback('Starting download...', 'success');
                              await downloadMediaFileClientApi(file.id, file.name);
                              showFeedback(`File "${file.name}" downloaded successfully`);
                            } catch (err: any) {
                              showFeedback(`Failed to download file: ${err.message}`, 'error');
                            }
                          }} className="flex items-center gap-2 px-4 py-2 text-sm text-text-light hover:bg-slate-700/50 text-left transition-colors">
                            <Icon icon="lucide:download" width={16} /> Download
                          </button>
                          <button onClick={() => { setActiveDropdownId(null); setShareTarget({ id: file.id, type: 'file', name: file.name }); setIsShareModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:bg-slate-700/50 text-left transition-colors">
                            <Icon icon="lucide:share-2" width={16} /> Share
                          </button>
                          <button onClick={() => {
                            setActiveDropdownId(null);
                            setEditTagsTargetFile(file);
                            setEditTagsList(file.tags ? file.tags.map((t: any) => t.name) : []);
                            setTagInputVal('');
                            setIsEditTagsModalOpen(true);
                          }} className="flex items-center gap-2 px-4 py-2 text-sm text-text-light hover:bg-slate-700/50 text-left transition-colors">
                            <Icon icon="lucide:tag" width={16} /> Edit Tags
                          </button>
                          <div className="h-px bg-border/50 my-1 mx-2" />
                          <button onClick={() => {
                            setActiveDropdownId(null);
                            setDeleteTarget({ id: file.id, type: 'file', name: file.name });
                            setIsDeleteModalOpen(true);
                          }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left transition-colors">
                            <Icon icon="lucide:trash-2" width={16} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Mobile / Grid View */}
      <div className={viewMode === 'grid' ? 'bg-bg mt-4 flex flex-col gap-6 rounded-b-2xl px-4 pb-6' : 'hidden'}>
        {/* Mobile Folders */}
        {!isLoading && folders.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider pl-1">Folders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {folders.map((folder) => {
                const isNonEmpty = folder._count && (folder._count.files > 0 || folder._count.children > 0);
                return (
                  <div
                    key={folder.id}
                    onClick={() => isSelectionMode ? toggleSelection(folder.id) : onFolderChange(folder.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                    onDragLeave={handleDragLeaveFolder}
                    onDrop={(e) => handleDropOnFolder(e, folder.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer shadow-sm ${selectedIds.has(folder.id) ? 'border-blue-500/50 bg-blue-900/20' : 'bg-card border-border hover:bg-card/80'} ${dragOverFolderId === folder.id ? 'border-blue-500 bg-blue-800/40' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div
                          style={{
                            borderColor: folder.color ? `${folder.color}35` : undefined,
                            backgroundColor: folder.color ? `${folder.color}15` : undefined,
                            color: folder.color || undefined
                          }}
                          className="bg-sidebar border-border text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                        >
                          <Icon icon={isNonEmpty ? 'lucide:folder-open' : 'lucide:folder'} width={22} />
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(folder.id);
                          }}
                          className={`absolute -top-1.5 -left-1.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors shadow-md ${selectedIds.has(folder.id) ? 'border-blue-600 bg-blue-600 text-white opacity-100' : `bg-bg/80 border-border ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}`}
                        >
                          {selectedIds.has(folder.id) && <Icon icon="lucide:check" width={14} />}
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-text-light truncate text-sm font-medium" title={folder.name}>
                          {truncateMiddle(folder.name, 28)}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          {folder._count && (
                            <span className="text-text-muted text-[10px] font-semibold">
                              {folder._count.files} {folder._count.files !== 1 ? 'files' : 'file'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2 relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => {
                        onFolderChange(folder.id);
                      }} className="text-text-muted hover:text-accent p-1.5 transition-colors"><Icon icon="lucide:arrow-right" width={16} /></button>
                      <button onClick={() => {
                        setActiveDropdownId(activeDropdownId === folder.id ? null : folder.id);
                      }} className="text-text-muted hover:text-text-light p-1.5 transition-colors"><Icon icon="lucide:more-vertical" width={16} /></button>
                      
                      {activeDropdownId === folder.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                          <div className="absolute right-0 top-10 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50 flex flex-col">
                            <button onClick={async () => {
                              setActiveDropdownId(null);
                              try {
                                showFeedback('Preparing zip download...', 'success');
                                await downloadFolderClientApi(folder.id, folder.name);
                                showFeedback(`Folder "${folder.name}" downloaded successfully`);
                              } catch (err: any) {
                                showFeedback(`Failed to download folder: ${err.message}`, 'error');
                              }
                            }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:download" width={14} /> Download</button>
                            <button onClick={() => { setActiveDropdownId(null); setShareTarget({ id: folder.id, type: 'folder', name: folder.name }); setIsShareModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-blue-400"><Icon icon="lucide:share-2" width={14} /> Share</button>
                            <button onClick={() => { setActiveDropdownId(null); setRenameFolderTarget(folder); setRenameFolderName(folder.name); setIsRenameFolderModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:edit-2" width={14} /> Rename</button>
                            <button onClick={() => { setActiveDropdownId(null); setDeleteTarget({ id: folder.id, type: 'folder', name: folder.name }); setIsDeleteModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-red-400"><Icon icon="lucide:trash-2" width={14} /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile Files */}
        {!isLoading && paginatedFiles.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider pl-1">Files</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {paginatedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => isSelectionMode ? toggleSelection(file.id) : setPreviewFile(file)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.id, 'file')}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden transition-colors cursor-pointer ${selectedIds.has(file.id) ? 'border-blue-500/50 ring-2 ring-blue-500/50' : 'border-border'}`}
                >
                  <div className="aspect-square bg-slate-900/50 relative border-b border-border/50">
                    {file.cdnUrl ? (
                      <img src={file.cdnUrl} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Icon icon="lucide:image" className="text-text-muted" width={32} />
                      </div>
                    )}
                      <div className="absolute top-2 left-2 z-10">
                        <div className={`inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border transition-colors shadow-md ${selectedIds.has(file.id) ? 'border-blue-600 bg-blue-600 text-white opacity-100' : `bg-bg/80 border-border ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}`}>
                          {selectedIds.has(file.id) && <Icon icon="lucide:check" width={16} />}
                        </div>
                      </div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-sm">
                      {file.format}
                    </div>
                  </div>
                  
                  <div className="p-3 flex flex-col gap-2 relative">
                    <span className="truncate text-sm font-medium text-text-light" title={file.name}>{truncateMiddle(file.name, 28)}</span>
                    <div className="flex items-center text-[10px] text-text-muted font-mono" title={`Original: ${formatBytes(file.originalSize)}`}>
                      <span className="text-accent font-semibold">{formatBytes(file.optimizedSize)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50">
                      {file.savings < 0 ? (
                        <span className="inline-flex items-center justify-center rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                          +{Math.abs(file.savings).toFixed(0)}%
                        </span>
                      ) : (
                        <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${file.savings > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/20 bg-slate-500/10 text-slate-400'}`}>
                          {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
                        </span>
                      )}
                      
                      <div className="flex gap-1 relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => copyToClipboard(file.cdnUrl)} className="text-text-muted hover:text-text-light p-1" title="Copy URL">
                          <Icon icon="lucide:copy" width={14} />
                        </button>
                        <button onClick={() => { setActiveDropdownId(activeDropdownId === file.id ? null : file.id); }} className="text-text-muted hover:text-text-light p-1" title="More options">
                          <Icon icon="lucide:more-vertical" width={14} />
                        </button>

                        {activeDropdownId === file.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)} />
                            <div className="absolute right-0 bottom-8 w-40 bg-card border border-border rounded-lg shadow-xl py-1 z-50 flex flex-col">
                              <button onClick={async () => {
                                setActiveDropdownId(null);
                                try {
                                  await downloadMediaFileClientApi(file.id, file.name);
                                } catch (e) {
                                  showFeedback(`Failed to download ${file.name}`, 'error');
                                }
                              }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:download" width={14} /> Download</button>
                              <button onClick={() => { setActiveDropdownId(null); setShareTarget({ id: file.id, type: 'file', name: file.name }); setIsShareModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-blue-400"><Icon icon="lucide:share-2" width={14} /> Share</button>
                              <button onClick={() => { setActiveDropdownId(null); setEditTagsTargetFile(file); setEditTagsList(file.tags ? file.tags.map(t => t.name) : []); setTagInputVal(''); setIsEditTagsModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2"><Icon icon="lucide:tag" width={14} /> Edit Tags</button>
                              <button onClick={() => { setActiveDropdownId(null); setDeleteTarget({ id: file.id, type: 'file', name: file.name }); setIsDeleteModalOpen(true); }} className="w-full text-left px-3 py-2 text-xs hover:bg-bg/50 flex items-center gap-2 text-red-400"><Icon icon="lucide:trash-2" width={14} /> Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && folders.length === 0 && paginatedFiles.length === 0 && (
          <div className="text-text-muted py-12 flex flex-col items-center justify-center gap-3">
            <Icon icon="lucide:folder-open" width={48} className="text-text-muted/50" />
            <span>This directory is empty.</span>
          </div>
        )}
      </div>

      <div className="border-border mt-auto flex flex-col items-center justify-center border-t px-6 py-6 max-md:px-4">
        {hasMore ? (
          <Button
            variant="bordered"
            onClick={handleLoadMore}
            className="text-text-muted hover:text-text-light h-10 px-6 font-medium"
          >
            Load More
          </Button>
        ) : (
          <span className="text-text-muted text-sm text-center">
            Showing all {filteredFiles.length} files
          </span>
        )}
      </div>

      {/* Floating Action Bar */}
      <div
        className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-800/95 px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 xl:hidden ${selectedIds.size > 0 ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-16 scale-95 opacity-0'}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedIds(new Set());
              setForceSelectionMode(false);
            }}
            className="text-text-muted hover:text-text-light shrink-0 cursor-pointer rounded-full bg-slate-700/50 p-1.5 transition-colors hover:bg-slate-700"
          >
            <Icon icon="lucide:x" width={18} />
          </button>
          <span className="text-sm font-semibold text-white">
            {selectedIds.size}{' '}
            <span className="text-text-muted font-normal">selected</span>
          </span>
        </div>

        <div className="bg-border mx-2 hidden h-6 w-px sm:block"></div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const urls = Array.from(selectedIds)
                .map((id) => files.find((f) => f.id === id)?.cdnUrl)
                .filter(Boolean);
              copyToClipboard(urls.join('\n'));
            }}
            className="text-text-light h-9 !scale-100 bg-slate-700/50 text-sm whitespace-nowrap transition-colors hover:!scale-100 hover:bg-slate-600"
          >
            <Icon icon="lucide:copy" width={16} className="mr-1.5" />
            Copy Links
          </Button>

          <Button
            variant="ghost"
            onClick={async () => {
              try {
                const foldersList = await getFoldersApi(true);
                // Exclude selected folders and their children
                const selectedFolderList = foldersList.filter((f) =>
                  selectedIds.has(f.id),
                );
                const excludedIds = new Set<string>();

                const addExcluded = async (fId: string) => {
                  excludedIds.add(fId);
                  const children = foldersList.filter(
                    (f) => f.parentId === fId,
                  );
                  for (const child of children) {
                    await addExcluded(child.id);
                  }
                };

                for (const f of selectedFolderList) {
                  await addExcluded(f.id);
                }

                setMoveFoldersList(
                  foldersList.filter((f) => !excludedIds.has(f.id)),
                );
                setMoveTargetFolderId(currentFolderId);
                setIsMoveModalOpen(true);
              } catch (e) {
                console.error(e);
              }
            }}
            className="text-text-light h-9 !scale-100 bg-slate-700/50 text-sm whitespace-nowrap transition-colors hover:!scale-100 hover:bg-slate-600"
          >
            <Icon icon="lucide:folder-input" width={16} className="mr-1.5" />
            Move
          </Button>

          <Button
            variant="ghost"
            onClick={handleBulkDownload}
            className="text-text-light h-9 !scale-100 bg-slate-700/50 text-sm whitespace-nowrap transition-colors hover:!scale-100 hover:bg-slate-600"
          >
            <Icon icon="lucide:download" width={16} className="mr-1.5" />
            Download
          </Button>

          <Button
            variant="danger"
            onClick={() => {
              setDeleteTarget(null);
              setIsDeleteModalOpen(true);
            }}
            className="h-9 !scale-100 text-sm whitespace-nowrap transition-colors hover:!scale-100"
          >
            <Icon icon="lucide:trash-2" width={16} className="mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full border px-4 py-2.5 shadow-lg ${actionFeedback.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400'} animate-in fade-in slide-in-from-bottom-4 duration-300`}
        >
          <Icon
            icon={
              actionFeedback.type === 'success'
                ? 'lucide:check-circle'
                : 'lucide:alert-circle'
            }
            width={18}
          />
          <span className="text-sm font-medium">{actionFeedback.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        title="Confirm Deletion"
        icon="lucide:alert-triangle"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            Are you sure you want to delete{' '}
            {deleteTarget
              ? `"${deleteTarget.name}"`
              : `${selectedIds.size} item(s)`}
            ? This action cannot be undone.
          </p>
          {(() => {
            const hasNonEmptyFolders = deleteTarget
              ? deleteTarget.type === 'folder' &&
                folders.find((f) => f.id === deleteTarget.id)?._count &&
                (folders.find((f) => f.id === deleteTarget.id)!._count!.files >
                  0 ||
                  folders.find((f) => f.id === deleteTarget.id)!._count!
                    .children > 0)
              : Array.from(selectedIds).some((id) => {
                  const folder = folders.find((f) => f.id === id);
                  return (
                    folder?._count &&
                    (folder._count.files > 0 || folder._count.children > 0)
                  );
                });

            return hasNonEmptyFolders ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <Icon
                  icon="lucide:alert-octagon"
                  className="mt-0.5 shrink-0 text-red-500"
                  width={18}
                />
                <p className="text-sm text-red-200">
                  <strong>Warning:</strong> The selected folder(s) contain files
                  or subfolders. Deleting will move all contents to Trash.
                </p>
              </div>
            ) : null;
          })()}
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="bordered"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={executeDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        title="Create New Folder"
        icon="lucide:folder-plus"
      >
        <form onSubmit={handleCreateFolder} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-text-muted text-xs font-semibold uppercase">
              Folder Name
            </label>
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Assets"
              required
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-text-muted text-xs font-semibold uppercase">
              Folder Color
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setNewFolderColor(c.value)}
                  style={{ backgroundColor: c.value || undefined }}
                  className={`h-7 w-7 rounded-full border transition-all hover:scale-110 flex items-center justify-center ${newFolderColor === c.value ? 'ring-2 ring-white border-transparent scale-105' : 'border-border'} ${!c.value ? 'bg-accent/40' : ''}`}
                  title={c.name}
                >
                  {newFolderColor === c.value && (
                    <Icon icon="lucide:check" width={14} className="text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="bordered"
              type="button"
              onClick={() => setIsCreateFolderModalOpen(false)}
              disabled={isCreatingFolder}
            >
              Cancel
            </Button>
            <Button variant="accent" type="submit" disabled={isCreatingFolder}>
              {isCreatingFolder ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        isOpen={isRenameFolderModalOpen}
        onClose={() => setIsRenameFolderModalOpen(false)}
        title="Rename Folder"
        icon="lucide:edit-3"
      >
        <form onSubmit={handleRenameFolder} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-text-muted text-xs font-semibold uppercase">
              New Name
            </label>
            <Input
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="e.g. Campaign Banners"
              required
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-text-muted text-xs font-semibold uppercase">
              Folder Color
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setRenameFolderColor(c.value)}
                  style={{ backgroundColor: c.value || undefined }}
                  className={`h-7 w-7 rounded-full border transition-all hover:scale-110 flex items-center justify-center ${renameFolderColor === c.value ? 'ring-2 ring-white border-transparent scale-105' : 'border-border'} ${!c.value ? 'bg-accent/40' : ''}`}
                  title={c.name}
                >
                  {renameFolderColor === c.value && (
                    <Icon icon="lucide:check" width={14} className="text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="bordered"
              type="button"
              onClick={() => setIsRenameFolderModalOpen(false)}
              disabled={isRenamingFolder}
            >
              Cancel
            </Button>
            <Button variant="accent" type="submit" disabled={isRenamingFolder}>
              {isRenamingFolder ? 'Renaming...' : 'Rename Folder'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Move Items Modal */}
      <Modal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title="Move Items"
        icon="lucide:folder-symlink"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            Select a target folder to move the selected items to:
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-text-muted text-xs font-semibold uppercase">
              Destination Folder
            </label>
            <Input
              variant="select"
              value={moveTargetFolderId || ''}
              onChange={(val) => setMoveTargetFolderId(val || null)}
              options={moveFolderOptions}
              icon="lucide:folder"
              className="w-full text-text-light bg-sidebar border-border rounded-xl"
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="bordered"
              type="button"
              onClick={() => setIsMoveModalOpen(false)}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleMoveItems}
              disabled={isMoving}
            >
              {isMoving ? 'Moving...' : 'Move Here'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Tags Modal */}
      <Modal
        isOpen={isEditTagsModalOpen}
        onClose={() => setIsEditTagsModalOpen(false)}
        title="Manage File Tags"
        icon="lucide:tag"
      >
        {editTagsTargetFile && (
          <form onSubmit={handleSaveTags} className="flex flex-col gap-5">
            <div>
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider block mb-1">
                Selected File
              </span>
              <div className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-border">
                <Icon icon="lucide:image" className="text-accent shrink-0" width={18} />
                <span className="text-sm font-medium text-text-light truncate">
                  {editTagsTargetFile.name}
                </span>
              </div>
            </div>

            {/* Current tags list */}
            <div>
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider block mb-2">
                Active Tags
              </span>
              <div className="flex flex-wrap gap-2 min-h-11 bg-slate-950/40 p-2.5 rounded-xl border border-border/80">
                {editTagsList.length === 0 ? (
                  <span className="text-text-muted text-xs italic self-center pl-1">
                    No tags associated. Use the field below or click workspace tags to add.
                  </span>
                ) : (
                  editTagsList.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 bg-accent/15 border border-accent/30 text-accent text-sm font-medium px-4 py-2 min-h-[44px] rounded-full transition-all"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setEditTagsList(editTagsList.filter((t) => t !== tag))}
                        className="hover:bg-accent/20 rounded-full p-2 transition-colors ml-1"
                        title="Remove Tag"
                      >
                        <Icon icon="lucide:x" width={16} height={16} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Tag search/input field */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-text-muted text-xs font-semibold uppercase tracking-wider">
                Add Tag
              </label>
              <div className="flex gap-2">
                <Input
                  value={tagInputVal}
                  onChange={(e) => setTagInputVal(e.target.value)}
                  placeholder="Type tag name..."
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = tagInputVal.trim();
                      if (trimmed && !editTagsList.includes(trimmed)) {
                        setEditTagsList([...editTagsList, trimmed]);
                        setTagInputVal('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="bordered"
                  onClick={() => {
                    const trimmed = tagInputVal.trim();
                    if (trimmed && !editTagsList.includes(trimmed)) {
                      setEditTagsList([...editTagsList, trimmed]);
                      setTagInputVal('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {/* Autocomplete suggestion dropdown if matching */}
              {tagInputVal.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-border rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                  {(() => {
                    const matches = allWorkspaceTags.filter(
                      (t) =>
                        t.name.toLowerCase().includes(tagInputVal.toLowerCase()) &&
                        !editTagsList.includes(t.name)
                    );
                    if (matches.length === 0) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = tagInputVal.trim();
                            setEditTagsList([...editTagsList, trimmed]);
                            setTagInputVal('');
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-accent hover:bg-slate-900 transition-colors"
                        >
                          <Icon icon="lucide:plus" width={12} />
                          <span>Create new tag &ldquo;{tagInputVal.trim()}&rdquo;</span>
                        </button>
                      );
                    }
                    return matches.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setEditTagsList([...editTagsList, t.name]);
                          setTagInputVal('');
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-text-light hover:bg-slate-900 transition-colors"
                      >
                        <Icon icon="lucide:tag" width={12} className="text-text-muted" />
                        <span>{t.name}</span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Quick-toggle workspace tags */}
            <div>
              <span className="text-text-muted text-xs font-semibold uppercase tracking-wider block mb-2">
                All Workspace Tags
              </span>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 border border-border/40 rounded-xl bg-slate-900/10 custom-scrollbar">
                {allWorkspaceTags.length === 0 ? (
                  <span className="text-text-muted text-xs italic pl-1 py-1">
                    No workspace tags found. They will appear here once created.
                  </span>
                ) : (
                  allWorkspaceTags.map((t) => {
                    const isActive = editTagsList.includes(t.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setEditTagsList(editTagsList.filter((item) => item !== t.name));
                          } else {
                            setEditTagsList([...editTagsList, t.name]);
                          }
                        }}
                        className={`inline-flex items-center justify-center text-sm px-4 py-2 min-h-[44px] min-w-[44px] rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer ${isActive ? 'bg-accent/20 border-accent/40 text-accent font-medium' : 'bg-slate-800/30 border-slate-700/80 text-text-muted hover:border-slate-600 hover:text-text-light'}`}
                      >
                        {t.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="bordered"
                type="button"
                onClick={() => setIsEditTagsModalOpen(false)}
                disabled={isSavingTags}
              >
                Cancel
              </Button>
              <Button variant="accent" type="submit" disabled={isSavingTags}>
                {isSavingTags ? 'Saving...' : 'Save Tags'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <MediaPreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onDelete={confirmDelete}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        targetId={shareTarget?.id || null}
        targetType={shareTarget?.type || null}
        targetName={shareTarget?.name || ''}
      />
    </div>
  );
};
