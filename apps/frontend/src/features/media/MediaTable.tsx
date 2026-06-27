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
} from './api';
import { MediaPreviewModal } from './MediaPreviewModal';

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

interface MediaTableProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  formatFilter: string;
  setFormatFilter: (val: string) => void;
  isSelectionMode?: boolean;
  onSelectionModeChange?: (mode: boolean) => void;
  refreshKey?: number;
  currentFolderId: string | null;
  onFolderChange: (id: string | null) => void;
}

export const MediaTable = ({
  searchQuery,
  setSearchQuery,
  formatFilter,
  setFormatFilter,
  isSelectionMode,
  onSelectionModeChange,
  refreshKey = 0,
  currentFolderId,
  onFolderChange,
}: MediaTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  // Folder actions state
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(
    null,
  );
  const [renameFolderName, setRenameFolderName] = useState('');
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(
    null,
  );
  const [moveFoldersList, setMoveFoldersList] = useState<Folder[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Bulk Actions / Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'file' | 'folder';
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

      let fileIds: string[] = [];
      let folderIds: string[] = [];

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
      if (onSelectionModeChange) onSelectionModeChange(false);
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
      await createFolderApi(newFolderName, currentFolderId);
      showFeedback(`Folder "${newFolderName}" created successfully`);
      setNewFolderName('');
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
      await renameFolderApi(renameFolderTarget.id, renameFolderName);
      showFeedback('Folder renamed successfully');
      setRenameFolderTarget(null);
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
      if (onSelectionModeChange) onSelectionModeChange(false);
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
        if (onSelectionModeChange) onSelectionModeChange(false);
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
      return matchesSearch && matchesFormat;
    });
  }, [searchQuery, formatFilter, files]);

  // Pagination for files
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFiles, currentPage]);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const showingStart =
    filteredFiles.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingEnd = Math.min(currentPage * itemsPerPage, filteredFiles.length);

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
      {/* 1. Breadcrumbs Row (above) */}
      <div className="border-border flex items-center justify-between border-b px-6 py-3 bg-card/30">
        <div className="text-text-muted flex items-center gap-1 text-xs font-normal">
          <button
            onClick={() => onFolderChange(null)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverFolderId('root');
            }}
            onDragLeave={handleDragLeaveFolder}
            onDrop={(e) => handleDropOnFolder(e, '')}
            className={`hover:text-text-light flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors ${dragOverFolderId === 'root' ? 'border border-dashed border-blue-500/50 bg-blue-900/35 text-blue-400' : ''}`}
          >
            <Icon icon="lucide:home" width={14} /> Home
          </button>
          {path.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <Icon
                icon="lucide:chevron-right"
                width={12}
                className="text-text-muted/40"
              />
              <button
                onClick={() => onFolderChange(folder.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(folder.id);
                }}
                onDragLeave={handleDragLeaveFolder}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                className={`cursor-pointer rounded px-1 py-0.5 transition-colors ${index === path.length - 1 ? 'text-accent font-medium' : 'hover:text-text-light'} ${dragOverFolderId === folder.id ? 'border border-dashed border-blue-500/50 bg-blue-900/35 text-blue-400' : ''}`}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2. Compact Toolbar Row (Search, Filter, New Folder) */}
      <div className="border-border flex flex-col md:flex-row md:items-center justify-between gap-4 border-b p-4 bg-card/10">
        <Input 
          variant='search' 
          placeholder='Search files by name...' 
          wrapperClassName='md:max-w-md w-full h-10'
          className='bg-bg h-full border-border/80 focus:border-accent'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex items-center gap-3 w-full md:w-auto">
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
            className="text-text-light text-sm w-full md:w-fit bg-bg rounded-xl h-10 border-border/80"
          />
          <Button
            variant="bordered"
            className="border-border flex h-10 items-center gap-1.5 text-sm whitespace-nowrap bg-bg hover:bg-card/50"
            onClick={() => setIsCreateFolderModalOpen(true)}
          >
            <Icon icon="lucide:folder-plus" width={16} className="text-accent" />
            New Folder
          </Button>
        </div>
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left">
          <thead>
            {selectedIds.size > 0 ? (
              <tr className="border-y border-blue-500/30 bg-blue-950/20 text-xs font-medium text-blue-400">
                <th className="w-14 px-4 py-3 text-center align-middle">
                  <div
                    onClick={handleSelectAllPage}
                    className={`inline-flex h-4.5 w-4.5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${allPageSelected ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
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
                    className={`inline-flex h-4.5 w-4.5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${allPageSelected ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
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
                        className={`inline-flex h-4.5 w-4.5 cursor-pointer items-center justify-center rounded-full border align-middle transition-colors ${selectedIds.has(folder.id) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
                      >
                        {selectedIds.has(folder.id) && (
                          <Icon icon="lucide:check" width={14} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-sidebar border-border text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                          <Icon
                            icon={
                              isNonEmpty
                                ? 'lucide:folder-open'
                                : 'lucide:folder'
                            }
                            width={22}
                          />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {folder.name}
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
                          onClick={async () => {
                            try {
                              showFeedback(
                                'Preparing zip download...',
                                'success',
                              );
                              await downloadFolderClientApi(
                                folder.id,
                                folder.name,
                              );
                              showFeedback(
                                `Folder "${folder.name}" downloaded successfully`,
                              );
                            } catch (err: any) {
                              showFeedback(
                                `Failed to download folder: ${err.message}`,
                                'error',
                              );
                            }
                          }}
                          className="text-text-muted hover:text-accent cursor-pointer p-1.5 align-middle opacity-70 transition-colors group-hover:opacity-100 hover:scale-110 focus:opacity-100"
                          title="Download Folder"
                        >
                          <Icon icon="lucide:download" width={16} />
                        </button>
                        <button
                          onClick={() => {
                            setRenameFolderTarget(folder);
                            setRenameFolderName(folder.name);
                            setIsRenameFolderModalOpen(true);
                          }}
                          className="text-text-muted hover:text-text-light cursor-pointer p-1.5 align-middle opacity-70 transition-colors group-hover:opacity-100 hover:scale-110 focus:opacity-100"
                          title="Rename"
                        >
                          <Icon icon="lucide:edit-2" width={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget({
                              id: folder.id,
                              type: 'folder',
                              name: folder.name,
                            });
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-text-muted hover:text-error cursor-pointer p-1.5 align-middle opacity-70 transition-colors group-hover:opacity-100 hover:scale-110 focus:opacity-100"
                          title="Delete Folder"
                        >
                          <Icon icon="lucide:trash-2" width={16} />
                        </button>
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
                      className={`inline-flex h-4.5 w-4.5 cursor-pointer items-center justify-center rounded-full border align-middle transition-colors ${selectedIds.has(file.id) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
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
                        <button
                          className="hover:text-accent truncate text-left text-sm font-medium transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                        >
                          {file.name}
                        </button>
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
                      <button
                        onClick={() => copyToClipboard(file.cdnUrl)}
                        className="text-text-muted hover:text-text-light cursor-pointer p-1.5 align-middle opacity-70 transition-colors group-hover:opacity-100 hover:scale-110 focus:opacity-100"
                        title="Copy URL"
                      >
                        <Icon icon="lucide:copy" width={16} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            id: file.id,
                            type: 'file',
                            name: file.name,
                          })
                        }
                        className="text-text-muted hover:text-error cursor-pointer p-1.5 align-middle opacity-70 transition-colors group-hover:opacity-100 hover:scale-110 focus:opacity-100"
                        title="Delete File"
                      >
                        <Icon icon="lucide:trash-2" width={16} />
                      </button>
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

      {/* Mobile View */}
      <div className="bg-bg mt-4 grid grid-cols-1 gap-4 rounded-b-2xl px-4 md:grid-cols-2 xl:hidden">
        {/* Mobile Folders */}
        {!isLoading &&
          folders.map((folder) => {
            const isNonEmpty =
              folder._count &&
              (folder._count.files > 0 || folder._count.children > 0);
            return (
              <div
                key={folder.id}
                onClick={() =>
                  isSelectionMode
                    ? toggleSelection(folder.id)
                    : onFolderChange(folder.id)
                }
                draggable
                onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                onDragLeave={handleDragLeaveFolder}
                onDrop={(e) => handleDropOnFolder(e, folder.id)}
                className={`flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-colors ${selectedIds.has(folder.id) ? 'border-blue-500/50 bg-blue-900/20' : 'bg-card border-border'} ${dragOverFolderId === folder.id ? 'border-blue-500 bg-blue-800/40' : ''} cursor-pointer`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {isSelectionMode && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(folder.id);
                        }}
                        className={`inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${selectedIds.has(folder.id) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border'}`}
                      >
                        {selectedIds.has(folder.id) && (
                          <Icon icon="lucide:check" width={14} />
                        )}
                      </div>
                    )}
                    <div className="bg-bg border-border text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                      <Icon
                        icon={
                          isNonEmpty ? 'lucide:folder-open' : 'lucide:folder'
                        }
                        width={22}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-text-light truncate text-sm font-medium">
                        {folder.name}
                      </span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {folder._count && (
                          <span className="text-text-muted text-[10px] font-semibold uppercase">
                            {folder._count.files} file
                            {folder._count.files !== 1 ? 's' : ''}
                            {folder._count.children > 0
                              ? `, ${folder._count.children} folder${folder._count.children !== 1 ? 's' : ''}`
                              : ''}
                            {folder.originalSize !== undefined && folder.optimizedSize !== undefined
                              ? ` • Orig: ${formatBytes(folder.originalSize)} / Opt: ${formatBytes(folder.optimizedSize)}`
                              : folder.size !== undefined ? ` • ${formatBytes(folder.size)}` : ''}
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
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={async () => {
                        try {
                          showFeedback('Preparing zip download...', 'success');
                          await downloadFolderClientApi(folder.id, folder.name);
                          showFeedback(
                            `Folder "${folder.name}" downloaded successfully`,
                          );
                        } catch (err: any) {
                          showFeedback(
                            `Failed to download folder: ${err.message}`,
                            'error',
                          );
                        }
                      }}
                      className="text-text-muted hover:text-accent p-1.5 transition-colors"
                      title="Download Folder"
                    >
                      <Icon icon="lucide:download" width={16} />
                    </button>
                    <button
                      onClick={() => {
                        setRenameFolderTarget(folder);
                        setRenameFolderName(folder.name);
                        setIsRenameFolderModalOpen(true);
                      }}
                      className="text-text-muted hover:text-text-light p-1.5 transition-colors"
                      title="Rename"
                    >
                      <Icon icon="lucide:edit-2" width={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget({
                          id: folder.id,
                          type: 'folder',
                          name: folder.name,
                        });
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-text-muted hover:text-error p-1.5 transition-colors"
                      title="Delete Folder"
                    >
                      <Icon icon="lucide:trash-2" width={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Mobile Files */}
        {!isLoading &&
          paginatedFiles.map((file) => (
            <div
              key={file.id}
              onClick={() =>
                isSelectionMode
                  ? toggleSelection(file.id)
                  : setPreviewFile(file)
              }
              draggable
              onDragStart={(e) => handleDragStart(e, file.id, 'file')}
              onDragEnd={handleDragEnd}
              className={`flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-colors ${selectedIds.has(file.id) ? 'border-blue-500/50 bg-blue-900/20' : 'bg-card border-border'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {isSelectionMode && (
                    <div
                      className={`inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${selectedIds.has(file.id) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border'}`}
                    >
                      {selectedIds.has(file.id) && (
                        <Icon icon="lucide:check" width={14} />
                      )}
                    </div>
                  )}
                  <div className="bg-bg border-border flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
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
                    <span className="text-text-light truncate text-sm font-medium">
                      {file.name}
                    </span>
                    {searchQuery && file.path && (
                      <span className="text-text-muted mt-0.5 text-[10px] font-medium">
                        In: {file.path}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-text-light shrink-0 font-mono text-[11px] font-bold tracking-wider uppercase">
                  {file.format}
                </span>
              </div>

              <div className="border-border/50 flex items-center justify-between border-t pt-2 text-xs">
                <div className="flex flex-col gap-1.5">
                  <span className="text-text-muted">Original</span>
                  <span className="text-text-light font-mono">
                    {formatBytes(file.originalSize)}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-text-muted">Optimized</span>
                  <span className="text-text-light font-mono">
                    {formatBytes(file.optimizedSize)}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-text-muted">Savings</span>
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
                      {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="bordered"
                mobileBehavior="full-width"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(file.cdnUrl);
                }}
                className="bg-bg/50 border-border mt-1 justify-center py-2 text-sm"
              >
                <Icon icon="lucide:copy" width={16} />
                Copy CDN URL
              </Button>
            </div>
          ))}

        {!isLoading && folders.length === 0 && paginatedFiles.length === 0 && (
          <div className="text-text-muted py-8 text-center md:col-span-2">
            This directory is empty.
          </div>
        )}
      </div>

      <div className="border-border mt-auto flex items-center justify-between border-t px-6 py-4 max-md:px-4">
        <span className="text-text-muted text-sm">
          Showing {showingStart} to {showingEnd} of {filteredFiles.length} files
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="text-text-muted hover:text-text-light h-9 px-4 text-sm disabled:pointer-events-none disabled:opacity-50"
          >
            Previous
          </Button>
          <Button
            variant="bordered"
            onClick={handleNext}
            disabled={currentPage >= totalPages || totalPages === 0}
            className="h-9 px-4 text-sm disabled:pointer-events-none disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div
        className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-800/95 px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 xl:hidden ${selectedIds.size > 0 ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-16 scale-95 opacity-0'}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedIds(new Set());
              if (onSelectionModeChange) onSelectionModeChange(false);
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
                  or subfolders. Deleting will permanently destroy all contents
                  inside them.
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
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
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

      <MediaPreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onDelete={confirmDelete}
      />
    </div>
  );
};
