"use client";

import { useState, useRef, useEffect } from "react"; 
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";
import Switch from "@/components/Switch";
import { uploadMediaFileApi } from "./api";
import { getCompressionDefaultsApi } from "@/features/settings/api";

interface UploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  folderId?: string | null;
  initialFile?: File | null;
}

type OptimizationPreset = "web_balanced" | "ultra_light" | "lossless" | "custom";

export function UploadMediaModal({ isOpen, onClose, onSuccess, folderId, initialFile }: UploadMediaModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [preset, setPreset] = useState<OptimizationPreset>("web_balanced");
  
  // Custom Settings
  const [format, setFormat] = useState("auto");
  const [quality, setQuality] = useState("80");
  const [stripMetadata, setStripMetadata] = useState(true);
  
  // Resize Settings
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [fit, setFit] = useState("cover");

  // SVG Settings
  const [svgAggressive, setSvgAggressive] = useState(false);
  const [svgStripUnused, setSvgStripUnused] = useState(true);

  // Tags Settings
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
    }
  }, [initialFile]);

  // Load Compression Defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      getCompressionDefaultsApi()
        .then((defaults) => {
          setPreset(defaults.defaultPreset as OptimizationPreset);
          if (defaults.defaultPreset === 'custom') {
            setFormat(defaults.defaultFormat);
            setQuality(String(defaults.defaultQuality));
            setStripMetadata(defaults.defaultStripMetadata);
            setWidth(defaults.defaultMaxWidth ? String(defaults.defaultMaxWidth) : '');
            setHeight(defaults.defaultMaxHeight ? String(defaults.defaultMaxHeight) : '');
            setFit(defaults.defaultFit);
          }
        })
        .catch((err) => {
          console.error('[UploadMediaModal] Failed to load compression defaults:', err);
        });
    }
  }, [isOpen]);

  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Sync preset to custom settings
  useEffect(() => {
    if (preset === "web_balanced") {
      setFormat("auto");
      setQuality("80");
      setStripMetadata(true);
    } else if (preset === "ultra_light") {
      setFormat("avif");
      setQuality("60");
      setStripMetadata(true);
      if (!widthRef.current) setWidth("1080");
    } else if (preset === "lossless") {
      setFormat("webp");
      setStripMetadata(false);
    }
  }, [preset]);

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
      // Reset state on close
      if (!isOpen) {
        setFile(null);
        setError(null);
      }
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

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    if (folderId) {
      formData.append("folderId", folderId);
    }
    
    // Raster
    formData.append("format", format);
    formData.append("quality", quality);
    formData.append("stripMetadata", stripMetadata.toString());
    if (preset === "lossless") formData.append("lossless", "true");
    
    // Resize
    if (width) formData.append("width", width);
    if (height) formData.append("height", height);
    formData.append("fit", fit);

    // Vector
    if (file.type === "image/svg+xml") {
      formData.append("multipass", svgAggressive.toString());
      formData.append("floatPrecision", svgAggressive ? "2" : "4");
      formData.append("removeViewBox", (!svgStripUnused).toString());
    }

    if (tagsInput) {
      formData.append("tags", tagsInput);
    }

    try {
      await uploadMediaFileApi(formData);
      setFile(null);
      setTagsInput("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const isSvg = file?.type === "image/svg+xml";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Media"
      icon="lucide:upload-cloud"
    >
      {error && (
        <div className="text-error text-sm bg-error/10 border border-error/20 rounded-lg p-3">
          {error}
        </div>
      )}
      <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto pr-2 pb-2">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-accent bg-accent/10"
                : "border-slate-600 bg-transparent hover:bg-white/5 hover:border-slate-500"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".webp, .png, .jpg, .jpeg, .svg, .gif, .avif"
            />
            <div className="bg-bg text-text-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Icon icon="lucide:image-plus" width={24} />
            </div>
            <p className="text-text-light font-medium">
              Drag and drop file here or click
            </p>
            <p className="text-text-muted mt-1 text-xs">
              Supported formats: WebP, PNG, JPEG, SVG, GIF, AVIF (up to 10MB)
            </p>
            <Button variant="bordered" className="mt-4">
              Select file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="border border-border rounded-xl p-4 flex items-center justify-between bg-bg">
              <div className="flex items-center gap-3">
                <div className="bg-accent/20 text-accent flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon icon={isSvg ? "lucide:file-code-2" : "lucide:file-image"} width={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-text-light text-sm font-medium truncate max-w-[200px]">
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
                disabled={isUploading}
              >
                <Icon icon="lucide:x" width={18} />
              </button>
            </div>


            {/* Optimization Settings */}
            <div className="flex flex-col gap-4 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-text-light flex items-center gap-2">
                <Icon icon="lucide:settings-2" width={16} />
                Optimization Settings
              </h3>
              
              {!isSvg ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-text-muted font-medium">Optimization Strategy</label>
                    <Input
                      variant="select"
                      className="w-full"
                      value={preset}
                      onChange={(val) => setPreset(val as OptimizationPreset)}
                      options={[
                        { label: "Web Balanced (Recommended)", value: "web_balanced" },
                        { label: "Ultra Light (Mobile/Fast)", value: "ultra_light" },
                        { label: "Lossless Archive (High Quality)", value: "lossless" },
                        { label: "Custom Settings", value: "custom" },
                      ]}
                    />
                  </div>

                  {preset === "custom" && (
                    <div className="grid grid-cols-2 gap-4 bg-bg border border-border p-4 rounded-xl">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-text-muted">Format</label>
                        <Input
                          variant="select"
                          value={format}
                          onChange={setFormat}
                          options={[
                            { label: "Auto", value: "auto" },
                            { label: "AVIF", value: "avif" },
                            { label: "WebP", value: "webp" },
                            { label: "JPEG", value: "jpeg" },
                          ]}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-text-muted">Quality (1-100)</label>
                        <Input
                          type="number"
                          min="1" max="100"
                          value={quality}
                          onChange={(e) => setQuality(e.target.value)}
                          className="appearance-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-bg border border-border p-4 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm text-text-light font-medium">Remove GPS & Camera Data</span>
                      <span className="text-xs text-text-muted">Strips EXIF metadata to save space and protect privacy.</span>
                    </div>
                    <Switch initialChecked={stripMetadata} onChange={setStripMetadata} />
                  </div>

                  {/* Resize Section */}
                  <div className="flex flex-col gap-3 bg-bg border border-border p-4 rounded-xl">
                    <h4 className="text-xs font-medium text-text-muted mb-1">Resize (Optional)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-text-muted">Max Width (px)</label>
                        <Input placeholder="e.g. 1920" type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-text-muted">Max Height (px)</label>
                        <Input placeholder="e.g. 1080" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                      </div>
                    </div>
                    {(width || height) && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <label className="text-[11px] text-text-muted">Fit Strategy</label>
                        <Input
                          variant="select"
                          value={fit}
                          onChange={setFit}
                          options={[
                            { label: "Cover (Crop edges)", value: "cover" },
                            { label: "Contain (Add padding)", value: "contain" },
                            { label: "Inside (Scale proportionally)", value: "inside" },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-bg border border-border p-4 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm text-text-light font-medium">Aggressive Minification</span>
                      <span className="text-xs text-text-muted">Runs multiple passes and rounds coordinates.</span>
                    </div>
                    <Switch initialChecked={svgAggressive} onChange={setSvgAggressive} />
                  </div>
                  <div className="flex items-center justify-between bg-bg border border-border p-4 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm text-text-light font-medium">Strip Unused Elements</span>
                      <span className="text-xs text-text-muted">Removes hidden layers and unused comments.</span>
                    </div>
                    <Switch initialChecked={svgStripUnused} onChange={setSvgStripUnused} />
                  </div>
                  <p className="text-[10px] text-text-muted/60 mt-1">
                    * All SVG files automatically undergo deep sanitization to remove malicious code (XSS prevention) for your security.
                  </p>
                </div>
              )}

              {/* Tags Input (Applies to all files) */}
              <div className="flex flex-col gap-1.5 bg-bg border border-border p-4 rounded-xl">
                <label className="text-xs text-text-muted">Tags (comma-separated)</label>
                <Input
                  placeholder="e.g. website, hero-banner, marketing"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="bg-card border-border/80 focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="bordered" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="disabled:opacity-50 min-w-[100px] justify-center"
          >
            {isUploading ? (
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} />
            ) : (
              "Upload & Optimize"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}