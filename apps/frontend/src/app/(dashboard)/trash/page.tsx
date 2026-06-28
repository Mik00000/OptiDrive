'use client';

import React, { useState, useEffect } from 'react';
import PageHeading from '@/components/PageHeading';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { ConfirmModal } from '@/features/settings/components/ConfirmModal';
import {
  getTrashItemsApi,
  restoreMediaFileApi,
  restoreFolderApi,
  deleteMediaFilePermanentlyApi,
  deleteFolderPermanentlyApi,
  restoreBulkApi,
  deleteBulkPermanentlyApi,
  emptyTrashApi,
  Folder,
  MediaFile,
} from '@/features/media/api';

export default function TrashPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Toast Feedback State
  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Modal States
  const [isEmptyConfirmOpen, setIsEmptyConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'file' | 'folder';
    name: string;
  } | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const data = await getTrashItemsApi(null); // Always request root flat list
      setFolders(data.folders);
      setFiles(data.files);
      setSelectedIds(new Set()); // Reset selection after reload
    } catch (error) {
      console.error('Failed to fetch trash items', error);
      showFeedback('Failed to load Recycle Bin.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  // Row Selection logic
  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === folders.length + files.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set<string>();
      folders.forEach((f) => allIds.add(f.id));
      files.forEach((f) => allIds.add(f.id));
      setSelectedIds(allIds);
    }
  };

  const handleRestoreSingle = async (id: string, type: 'file' | 'folder') => {
    try {
      showFeedback('Restoring...');
      if (type === 'file') {
        await restoreMediaFileApi(id);
      } else {
        await restoreFolderApi(id);
      }
      showFeedback('Item restored successfully');
      fetchTrash();
    } catch (error: any) {
      showFeedback(error.message || 'Failed to restore item', 'error');
    }
  };

  const handleRestoreBulk = async () => {
    const selectedFolderIds = folders.filter((f) => selectedIds.has(f.id)).map((f) => f.id);
    const selectedFileIds = files.filter((f) => selectedIds.has(f.id)).map((f) => f.id);

    setIsProcessing(true);
    try {
      showFeedback('Restoring selected items...');
      await restoreBulkApi(selectedFolderIds, selectedFileIds);
      showFeedback('Selected items restored successfully');
      fetchTrash();
    } catch (error: any) {
      showFeedback(error.message || 'Failed to restore items', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSinglePermanently = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      if (deleteTarget.type === 'file') {
        await deleteMediaFilePermanentlyApi(deleteTarget.id);
      } else {
        await deleteFolderPermanentlyApi(deleteTarget.id);
      }
      showFeedback('Item deleted permanently');
      setDeleteTarget(null);
      fetchTrash();
    } catch (error: any) {
      showFeedback(error.message || 'Failed to delete item', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBulkPermanently = async () => {
    const selectedFolderIds = folders.filter((f) => selectedIds.has(f.id)).map((f) => f.id);
    const selectedFileIds = files.filter((f) => selectedIds.has(f.id)).map((f) => f.id);

    setIsProcessing(true);
    try {
      await deleteBulkPermanentlyApi(selectedFolderIds, selectedFileIds);
      showFeedback('Selected items deleted permanently');
      setIsBulkDeleteConfirmOpen(false);
      fetchTrash();
    } catch (error: any) {
      showFeedback(error.message || 'Failed to delete items', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyTrash = async () => {
    setIsProcessing(true);
    try {
      await emptyTrashApi();
      showFeedback('Recycle Bin emptied successfully');
      setIsEmptyConfirmOpen(false);
      fetchTrash();
    } catch (error: any) {
      showFeedback(error.message || 'Failed to empty Recycle Bin', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalItemsCount = folders.length + files.length;
  const isAllSelected = totalItemsCount > 0 && selectedIds.size === totalItemsCount;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < totalItemsCount;

  return (
    <section className="dashboard-page relative pb-24">
      {/* Toast Notification */}
      {actionFeedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            actionFeedback.type === 'error'
              ? 'border-error/20 bg-error/10 text-error shadow-error/10'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10'
          }`}
        >
          <Icon
            icon={actionFeedback.type === 'error' ? 'lucide:alert-circle' : 'lucide:check-circle'}
            width={20}
          />
          <span className="text-sm font-semibold">{actionFeedback.message}</span>
        </div>
      )}

      <PageHeading title="Recycle Bin">
        {totalItemsCount > 0 && (
          <Button
            variant="ghost"
            className="border border-error/20 hover:bg-error/10 text-error flex items-center gap-1.5 text-sm font-semibold py-2.5 px-4 animate-in fade-in"
            onClick={() => setIsEmptyConfirmOpen(true)}
          >
            <Icon icon="lucide:trash-2" width={16} />
            <span>Empty Recycle Bin</span>
          </Button>
        )}
      </PageHeading>

      <div className="flex flex-col gap-6 p-8 pb-8 animate-in fade-in duration-350">
        <div className="bg-card border border-border rounded-2xl overflow-hidden min-w-0 w-full shadow-lg">
          {/* Top Banner Notice */}
          <div className="bg-slate-900/40 px-6 py-4 border-b border-border flex items-center gap-3">
            <Icon icon="lucide:info" className="text-accent shrink-0" width={20} />
            <p className="text-sm text-text-muted leading-relaxed">
              Items in the Recycle Bin will be automatically and permanently deleted after{' '}
              <span className="text-text-light font-semibold">30 days</span>. All items in the bin
              still count towards your storage space quota.
            </p>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                {selectedIds.size > 0 ? (
                  // Unified Bulk Action Header (identical to Media Library page)
                  <tr className="border-y border-blue-500/30 bg-blue-950/20 text-sm font-semibold text-blue-400 animate-in fade-in duration-200">
                    <th className="w-14 px-6 py-4 text-center align-middle">
                      <button
                        onClick={handleSelectAll}
                        className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border border-blue-600 bg-blue-600 text-white align-middle transition-colors"
                      >
                        {isAllSelected ? (
                          <Icon icon="lucide:check" width={14} className="stroke-[3]" />
                        ) : (
                          <Icon icon="lucide:minus" width={14} className="stroke-[3]" />
                        )}
                      </button>
                    </th>
                    <th colSpan={5} className="px-4 py-4 text-left align-middle font-semibold text-text-light">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-blue-300">{selectedIds.size} item(s) selected</span>
                        <div className="h-5 w-px bg-blue-500/30"></div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleRestoreBulk}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors cursor-pointer"
                          >
                            <Icon icon="lucide:rotate-ccw" width={16} />
                            <span>Restore Selected</span>
                          </button>
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right align-middle">
                      <button
                        onClick={() => setIsBulkDeleteConfirmOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                      >
                        <Icon icon="lucide:trash-2" width={16} />
                        <span>Delete Forever</span>
                      </button>
                    </th>
                  </tr>
                ) : (
                  // Normal headers row styled with text-sm & Sentence Case
                  <tr className="border-border text-text-light/95 border-y text-sm font-medium bg-slate-950/20">
                    <th className="w-14 px-6 py-4">
                      <button
                        onClick={handleSelectAll}
                        className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${isAllSelected ? 'border-blue-600 bg-blue-600 text-white' : isSomeSelected ? 'border-blue-600/50 bg-blue-600/20 text-blue-400' : 'bg-bg border-border hover:border-text-muted'}`}
                      >
                        {isAllSelected && <Icon icon="lucide:check" width={14} className="stroke-[3]" />}
                        {isSomeSelected && <Icon icon="lucide:minus" width={14} className="stroke-[3]" />}
                      </button>
                    </th>
                    <th className="px-4 py-4 tracking-normal">Name</th>
                    <th className="px-4 py-4 tracking-normal">Deleted at</th>
                    <th className="px-4 py-4 tracking-normal">Original size</th>
                    <th className="px-4 py-4 tracking-normal">Optimized size</th>
                    <th className="px-4 py-4 tracking-normal">Savings</th>
                    <th className="px-6 py-4 text-right tracking-normal">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  // Loading Skeleton Rows
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-5 w-5 rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-800" />
                          <div className="flex flex-col gap-1.5">
                            <div className="h-4.5 w-36 rounded bg-slate-800" />
                            <div className="h-3.5 w-20 rounded bg-slate-850" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4.5 w-28 rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4.5 w-12 rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4.5 w-12 rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5.5 w-10 rounded-full bg-slate-800" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-9 w-20 rounded bg-slate-800 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : totalItemsCount === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-4 max-w-sm mx-auto animate-in fade-in">
                        <div className="h-16 w-16 rounded-full bg-slate-900 border border-border flex items-center justify-center text-text-muted shadow-inner">
                          <Icon icon="lucide:trash-2" width={32} />
                        </div>
                        <h3 className="text-text-light font-bold text-lg">
                          Recycle Bin is empty
                        </h3>
                        <p className="text-text-muted text-sm leading-relaxed">
                          When you delete files or folders, they will appear here. You will be able
                          to restore them or delete them permanently.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Render folders in Trash */}
                    {folders.map((folder) => {
                      const filesCount = folder.filesCount || 0;
                      const subfoldersCount = folder.subfoldersCount || 0;
                      const fileLabel = filesCount === 1 ? 'file' : 'files';
                      const folderLabel = subfoldersCount === 1 ? 'folder' : 'folders';
                      const folderDescription = `${filesCount} ${fileLabel}, ${subfoldersCount} ${folderLabel}`;
                      const isSelected = selectedIds.has(folder.id);
                      const originalSizeVal = folder.originalSize || 0;
                      const optimizedSizeVal = folder.optimizedSize || 0;
                      const savingsVal = folder.savings || 0;

                      return (
                        <tr
                          key={folder.id}
                          onClick={() => handleSelectRow(folder.id)}
                          className={`group hover:bg-slate-900/35 transition-colors cursor-pointer border-b border-border/40 ${isSelected ? 'bg-blue-500/5 hover:bg-blue-500/10' : ''}`}
                        >
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSelectRow(folder.id)}
                              className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
                            >
                              {isSelected && <Icon icon="lucide:check" width={14} className="stroke-[3]" />}
                            </button>
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
                                <Icon icon="lucide:folder" width={22} height={22} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-text-light truncate max-w-xs group-hover:text-accent transition-colors">
                                  {folder.name}
                                </span>
                                <span className="text-xs text-text-muted mt-0.5 font-medium">
                                  {folderDescription}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-text-muted font-medium">
                            {formatDate(folder.deletedAt)}
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-text-muted font-semibold">
                            {originalSizeVal > 0 ? formatBytes(originalSizeVal) : '0 B'}
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-text-muted font-semibold">
                            {optimizedSizeVal > 0 ? formatBytes(optimizedSizeVal) : '0 B'}
                          </td>
                          <td className="px-4 py-4">
                            {savingsVal > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                                -{savingsVal.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                                0%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRestoreSingle(folder.id, 'folder')}
                                className="text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm cursor-pointer font-semibold"
                                title="Restore Folder"
                              >
                                <Icon icon="lucide:rotate-ccw" width={16} />
                                <span>Restore</span>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    id: folder.id,
                                    type: 'folder',
                                    name: folder.name,
                                  })
                                }
                                className="text-text-muted hover:text-error hover:bg-error/10 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm cursor-pointer font-semibold"
                                title="Delete Permanently"
                              >
                                <Icon icon="lucide:trash-2" width={16} />
                                <span>Delete Forever</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Render files in Trash */}
                    {files.map((file) => {
                      const isSelected = selectedIds.has(file.id);

                      return (
                        <tr 
                          key={file.id} 
                          onClick={() => handleSelectRow(file.id)}
                          className={`group hover:bg-slate-900/35 transition-colors cursor-pointer border-b border-border/40 ${isSelected ? 'bg-blue-500/5 hover:bg-blue-500/10' : ''}`}
                        >
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSelectRow(file.id)}
                              className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[4px] border align-middle transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
                            >
                              {isSelected && <Icon icon="lucide:check" width={14} className="stroke-[3]" />}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20 text-accent">
                                <Icon icon="lucide:image" width={22} height={22} />
                              </div>
                              <span className="text-sm font-semibold text-text-light truncate max-w-xs">
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-text-muted font-medium">
                            {formatDate(file.deletedAt)}
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-text-muted font-semibold">
                            {formatBytes(file.originalSize)}
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-text-muted font-semibold">
                            {formatBytes(file.optimizedSize)}
                          </td>
                          <td className="px-4 py-4">
                            {file.savings > 0 ? (
                              <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                                -{file.savings.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                                0%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleRestoreSingle(file.id, 'file')}
                                className="text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm cursor-pointer font-semibold"
                                title="Restore File"
                              >
                                <Icon icon="lucide:rotate-ccw" width={16} />
                                <span>Restore</span>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    id: file.id,
                                    type: 'file',
                                    name: file.name,
                                  })
                                }
                                className="text-text-muted hover:text-error hover:bg-error/10 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm cursor-pointer font-semibold"
                                title="Delete Permanently"
                              >
                                <Icon icon="lucide:trash-2" width={16} />
                                <span>Delete Forever</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Empty Trash Confirmation Modal */}
      <ConfirmModal
        isOpen={isEmptyConfirmOpen}
        onClose={() => setIsEmptyConfirmOpen(false)}
        onConfirm={handleEmptyTrash}
        title="Empty Recycle Bin"
        description="Are you sure you want to permanently delete all files and folders in the Recycle Bin? This action is irreversible and all data will be permanently lost."
        confirmText={isProcessing ? 'Emptying...' : 'Empty Permanently'}
        variant="danger"
        icon="lucide:trash-2"
        requiredInputText="EMPTY TRASH"
      />

      {/* Delete Single Item Permanently Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSinglePermanently}
        title="Delete Item Permanently"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone and it will be permanently lost.`}
        confirmText={isProcessing ? 'Deleting...' : 'Delete Forever'}
        variant="danger"
        icon="lucide:triangle-alert"
      />

      {/* Delete Selected Bulk Items Permanently Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleDeleteBulkPermanently}
        title="Delete Selected Items Permanently"
        description={`Are you sure you want to permanently delete the ${selectedIds.size} selected items? This action cannot be undone.`}
        confirmText={isProcessing ? 'Deleting...' : 'Delete Forever'}
        variant="danger"
        icon="lucide:triangle-alert"
      />
    </section>
  );
}
