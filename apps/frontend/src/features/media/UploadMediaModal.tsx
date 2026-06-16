"use client";

import { useState, useRef, useEffect } from "react"; 
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

interface UploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadMediaModal({ isOpen, onClose }: UploadMediaModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const preventDefaultBehavior = (e: DragEvent) => {
      e.preventDefault();
    };

    if (isOpen) {
      window.addEventListener("dragover", preventDefaultBehavior);
      window.addEventListener("drop", preventDefaultBehavior);
    }

    return () => {
      window.removeEventListener("dragover", preventDefaultBehavior);
      window.removeEventListener("drop", preventDefaultBehavior);
    };
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = () => {
    setTimeout(() => {
      setFile(null);
      onClose();
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Media"
      icon="lucide:upload-cloud"
    >
      <div className="flex flex-col gap-4">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectClick}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-accent bg-accent/10"
                : "border-border bg-transparent hover:bg-white/5"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".webp, .png, .jpg, .jpeg, .svg, .gif"
            />
            <div className="bg-bg text-text-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Icon icon="lucide:image-plus" width={24} />
            </div>
            <p className="text-text-light font-medium">
              Drag and drop file here or click
            </p>
            <p className="text-text-muted mt-1 text-xs">
              Supported formats: WebP, PNG, JPEG, SVG, GIF (up to 10MB)
            </p>
            <Button variant="bordered" className="mt-4">
              Select file
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-accent/20 text-accent flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon icon="lucide:file-image" width={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-text-light text-sm font-medium">
                  {file.name}
                </span>
                <span className="text-text-muted text-xs">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-text-muted hover:text-error transition-colors"
            >
              <Icon icon="lucide:x" width={18} />
            </button>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="bordered" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleUpload}
            disabled={!file}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}