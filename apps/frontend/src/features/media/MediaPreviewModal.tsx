"use client";

import { Icon } from "@iconify/react";
import { Modal } from "@/components/Modal";
import { MediaFile } from "./api";
import { Button } from "@/components/Button";

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: MediaFile | null;
  onDelete: (id: string) => void;
}

export function MediaPreviewModal({ isOpen, onClose, file, onDelete }: MediaPreviewModalProps) {
  if (!file) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(file.cdnUrl);
    alert('Public CDN URL copied to clipboard!');
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(file.cdnUrl);
      if (!response.ok) throw new Error('Failed to fetch');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      alert('Failed to download image.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Media Preview"
      icon="lucide:image"
    >
      <div className="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2 pb-2">
        <div className="w-full bg-sidebar border border-border rounded-xl overflow-hidden flex items-center justify-center min-h-[300px] relative group">
          <img 
            src={file.cdnUrl} 
            alt={file.name} 
            className="w-full h-auto max-h-[400px] object-contain"
          />
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => {
                window.open(file.cdnUrl, '_blank');
              }}
              className="bg-bg/80 backdrop-blur-sm p-2 rounded-lg text-text-light hover:text-accent transition-colors"
              title="Open in new tab"
            >
              <Icon icon="lucide:external-link" width={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-text-light break-all">{file.name}</h3>
            <span className="text-sm text-text-muted font-mono uppercase">{file.format} • {new Date(file.createdAt).toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-bg border border-border p-4 rounded-xl">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Original Size</span>
              <span className="text-sm text-text-light font-mono">{formatBytes(file.originalSize)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Optimized Size</span>
              <span className="text-sm text-text-light font-mono">{formatBytes(file.optimizedSize)}</span>
            </div>
            <div className="col-span-2 flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-text-muted">Compression Savings</span>
              <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="danger" onClick={() => { onDelete(file.id); onClose(); }}>
            <Icon icon="lucide:trash-2" width={16} className="mr-2" />
            Delete
          </Button>
          <div className="flex gap-3">
            <Button variant="bordered" onClick={downloadImage}>
              <Icon icon="lucide:download" width={16} className="mr-2" />
              Download
            </Button>
            <Button variant="accent" onClick={copyToClipboard}>
              <Icon icon="lucide:link" width={16} className="mr-2" />
              Copy URL
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
