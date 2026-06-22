'use client';

import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { getMediaFilesApi, deleteMediaFileApi, MediaFile } from './api';
import Image from 'next/image';

interface MediaTableProps {
  searchQuery: string;
  formatFilter: string;
  isSelectionMode?: boolean;
  onSelectionModeChange?: (mode: boolean) => void;
  refreshKey?: number;
}

export const MediaTable = ({
  searchQuery,
  formatFilter,
  isSelectionMode,
  onSelectionModeChange,
  refreshKey = 0,
}: MediaTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 7;

  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoading(true);
      try {
        const data = await getMediaFilesApi();
        setFiles(data);
      } catch (error) {
        console.error('Failed to fetch media files', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, [refreshKey]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} files?`)) return;
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteMediaFileApi(id);
      }
      setSelectedIds(new Set());
      if (onSelectionModeChange) onSelectionModeChange(false);
      // Refresh list
      const data = await getMediaFilesApi();
      setFiles(data);
    } catch (error) {
      console.error('Failed to delete files', error);
      alert('Failed to delete some files.');
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
    // Could add a toast notification here
  };

  // Фільтрація
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

  // Пагінація
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
    () => paginatedFiles.map((f) => f.id),
    [paginatedFiles],
  );
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));
  const allLibrarySelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((f) => selectedIds.has(f.id));
  const showNotice =
    allPageSelected &&
    !allLibrarySelected &&
    filteredFiles.length > paginatedFiles.length;

  const handleSelectAllPage = () => {
    const newSet = new Set(selectedIds);
    if (allPageSelected) {
      pageIds.forEach((id) => newSet.delete(id));
    } else {
      pageIds.forEach((id) => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const handleSelectAllLibrary = () => {
    const newSet = new Set(selectedIds);
    filteredFiles.forEach((f) => newSet.add(f.id));
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

  return (
    <div className="flex w-full flex-col min-h-[400px]">
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-border text-text-muted border-y text-xs font-medium">
              <th className="w-12 px-6 py-4 text-center">
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
              <th className="px-4 py-4 font-normal">Format</th>
              <th className="px-4 py-4 font-normal">Original Size</th>
              <th className="px-4 py-4 font-normal">Optimized Size</th>
              <th className="px-4 py-4 font-normal">Savings</th>
              <th className="px-6 py-4 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="text-text-light divide-border divide-y text-sm relative">
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <Icon icon="lucide:loader-2" className="animate-spin text-accent mx-auto" width={24} />
                </td>
              </tr>
            )}
            {!isLoading && showNotice && (
              <tr className="bg-slate-800/80">
                <td
                  colSpan={7}
                  className="border-border border-b px-4 py-3 text-center text-sm"
                >
                  Selected all {pageIds.length} files on this page.{' '}
                  <button
                    onClick={handleSelectAllLibrary}
                    className="ml-1 cursor-pointer rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-medium text-blue-400 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                  >
                    Select all {filteredFiles.length} files in Media Library
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && paginatedFiles.length > 0 ? (
              paginatedFiles.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => toggleSelection(file.id)}
                  className={`group cursor-pointer transition-colors ${selectedIds.has(file.id) ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'hover:bg-slate-700/50'}`}
                >
                  <td className="px-6 py-4 text-center">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(file.id);
                      }}
                      className={`inline-flex h-4.5 w-4.5 cursor-pointer items-center justify-center rounded-full border align-middle transition-colors ${selectedIds.has(file.id) ? 'border-blue-600 bg-blue-600 text-white' : 'bg-bg border-border hover:border-text-muted'}`}
                    >
                      {selectedIds.has(file.id) && (
                        <Icon icon="lucide:check" width={14} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-sidebar border-border flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border overflow-hidden relative">
                        {file.cdnUrl ? (
                          <img src={file.cdnUrl} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon icon="lucide:image" className="text-text-muted" width={20} />
                        )}
                      </div>
                      <a 
                        href={file.cdnUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="truncate text-sm hover:text-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {file.name}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-text-light font-mono text-[11px] font-bold tracking-wider uppercase">
                      {file.format}
                    </span>
                  </td>
                  <td className="text-text-muted px-4 py-4 font-mono text-xs">
                    {formatBytes(file.originalSize)}
                  </td>
                  <td className="text-text-light px-4 py-4 font-mono text-xs">
                    {formatBytes(file.optimizedSize)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${file.savings > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/20 bg-slate-500/10 text-slate-400'}`}>
                      {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(file.cdnUrl); }}
                      className="text-text-muted hover:text-text-light cursor-pointer p-1.5 align-middle opacity-70 transition-colors group-hover:opacity-100 hover:scale-110 focus:opacity-100"
                      title="Copy URL"
                    >
                      <Icon icon="lucide:copy" width={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : !isLoading ? (
              <tr>
                <td colSpan={7} className="text-text-muted py-8 text-center">
                  No files found matching your criteria.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="bg-bg mt-4 grid grid-cols-1 gap-4 rounded-b-2xl md:grid-cols-2 xl:hidden">
        {paginatedFiles.length > 0 && !isLoading ? (
          paginatedFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => isSelectionMode && toggleSelection(file.id)}
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
                  <div className="bg-bg border-border flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border overflow-hidden">
                    {file.cdnUrl ? (
                      <img src={file.cdnUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon icon="lucide:image" className="text-text-muted" width={20} />
                    )}
                  </div>
                  <span className="text-text-light truncate text-sm font-medium">
                    {file.name}
                  </span>
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
                  <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${file.savings > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/20 bg-slate-500/10 text-slate-400'}`}>
                    {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
                  </span>
                </div>
              </div>

              <Button
                variant="bordered"
                mobileBehavior="full-width"
                onClick={(e) => { e.stopPropagation(); copyToClipboard(file.cdnUrl); }}
                className="bg-bg/50 border-border mt-1 justify-center py-2 text-sm"
              >
                <Icon icon="lucide:copy" width={16} />
                Copy CDN URL
              </Button>
            </div>
          ))
        ) : !isLoading ? (
          <div className="text-text-muted py-8 text-center md:col-span-2">
            No files found matching your criteria.
          </div>
        ) : null}
      </div>

      <div className="border-border flex items-center justify-between border-t px-6 py-4 max-md:px-4 mt-auto">
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

      <div
        className={`fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 items-center justify-between gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 shadow-2xl transition-all duration-300 xl:bottom-8 xl:w-auto xl:justify-center xl:gap-4 xl:rounded-full xl:px-6 xl:py-3 ${selectedIds.size > 0 ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-16 opacity-0'}`}
      >
        <button
          onClick={() => {
            setSelectedIds(new Set());
            if (onSelectionModeChange) onSelectionModeChange(false);
          }}
          className="text-text-muted hover:text-text-light shrink-0 cursor-pointer rounded-full bg-slate-700/50 p-1.5 transition-colors hover:bg-slate-700 xl:p-1"
        >
          <Icon icon="lucide:x" width={18} />
        </button>
        <span className="text-sm font-medium whitespace-nowrap text-white">
          {selectedIds.size} files selected
        </span>
        <div className="bg-border mx-1 hidden h-5 w-px xl:block"></div>
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            onClick={handleDelete}
            className="h-8 py-0 text-xs xl:h-9 xl:text-sm"
          >
            Delete
          </Button>
          <Input
            variant="options"
            icon="lucide:download"
            options={[{ value: 'optimized', label: 'Download Links' }]}
            onChange={() => {
               const urls = Array.from(selectedIds).map(id => files.find(f => f.id === id)?.cdnUrl).filter(Boolean);
               copyToClipboard(urls.join('\n'));
            }}
            className="h-8 py-0 text-xs whitespace-nowrap xl:h-9 xl:text-sm placeholder:text-white"
            placeholder='Actions'
          />
        </div>
      </div>
    </div>
  );
};
