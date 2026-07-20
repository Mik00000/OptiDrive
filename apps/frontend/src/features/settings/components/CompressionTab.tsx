"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import Switch from '@/components/Switch';
import { Input } from '@/components/Inputs';
import { Icon } from '@iconify/react';
import { getCompressionDefaultsApi, updateCompressionDefaultsApi } from '../api';
import { useAuth } from '@/contexts/AuthContext';
import { uploadWatermarkApi } from '@/features/media/api';

export const CompressionTab = () => {
  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId) || workspaces[0];
  const plan = activeWorkspace?.plan || 'FREE';
  const isProOrEnterprise = plan === 'PRO' || plan === 'ENTERPRISE';
  const isEnterprise = plan === 'ENTERPRISE';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingWm, setIsUploadingWm] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [preset, setPreset] = useState<string>('web_balanced');
  const [format, setFormat] = useState<string>('auto');
  const [quality, setQuality] = useState<number>(80);
  const [stripMetadata, setStripMetadata] = useState<boolean>(true);
  const [maxWidth, setMaxWidth] = useState<string>('');
  const [maxHeight, setMaxHeight] = useState<string>('');
  const [fit, setFit] = useState<string>('cover');

  // Watermark defaults
  const [watermarkText, setWatermarkText] = useState<string>('OptiDrive');
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        setIsLoading(true);
        const data = await getCompressionDefaultsApi();
        setPreset(data.defaultPreset);
        setFormat(data.defaultFormat);
        setQuality(data.defaultQuality);
        setStripMetadata(data.defaultStripMetadata);
        setMaxWidth(data.defaultMaxWidth ? String(data.defaultMaxWidth) : '');
        setMaxHeight(data.defaultMaxHeight ? String(data.defaultMaxHeight) : '');
        setFit(data.defaultFit);
        setWatermarkText(data.defaultWatermarkText || 'OptiDrive');
        setWatermarkUrl(data.defaultWatermarkUrl || null);
      } catch (error) {
        console.error('Failed to fetch compression defaults:', error);
        showFeedback('Failed to load settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDefaults();
  }, []);

  const maxWidthRef = useRef(maxWidth);
  useEffect(() => {
    maxWidthRef.current = maxWidth;
  }, [maxWidth]);

  // Sync preset choice to automatic values (optional helper, but lets them customize)
  useEffect(() => {
    if (preset === 'web_balanced') {
      setFormat('auto');
      setQuality(80);
      setStripMetadata(true);
    } else if (preset === 'ultra_light') {
      setFormat('avif');
      setQuality(60);
      setStripMetadata(true);
      if (!maxWidthRef.current) setMaxWidth('1080');
    } else if (preset === 'lossless') {
      setFormat('webp');
      setStripMetadata(false);
    }
  }, [preset]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCompressionDefaultsApi({
        defaultPreset: preset,
        defaultFormat: format,
        defaultQuality: Number(quality),
        defaultStripMetadata: stripMetadata,
        defaultMaxWidth: maxWidth ? Number(maxWidth) : null,
        defaultMaxHeight: maxHeight ? Number(maxHeight) : null,
        defaultFit: fit,
        defaultWatermarkText: watermarkText,
        defaultWatermarkUrl: watermarkUrl
      });
      showFeedback('Compression defaults saved successfully');
    } catch (error: any) {
      console.error('Failed to save compression defaults:', error);
      showFeedback(error?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={32} />
      </div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        
        {/* Header */}
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Compression & Preset Defaults
          </span>
          <p className="text-text-muted text-sm mt-1">
            Configure default optimization parameters applied when uploading images via API or Web UI without specifying custom options.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col p-4 sm:p-6 gap-6">
          
          {/* Preset Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-text-secondary">Default Optimization Preset</label>
            <Input
              variant="select"
              className="w-full sm:max-w-md"
              value={preset}
              onChange={(val) => setPreset(val)}
              options={[
                { label: "Web Balanced (Recommended)", value: "web_balanced" },
                { label: "Ultra Light (Mobile/Fast)", value: "ultra_light" },
                { label: "Lossless Archive (High Quality)", value: "lossless" },
                { label: "Custom Settings Profiles", value: "custom" },
              ]}
            />
            <p className="text-xs text-text-muted mt-1 leading-normal">
              Presets optimize compression rules automatically. Select &quot;Custom Settings Profiles&quot; to fine-tune format, quality, and sizing below.
            </p>
          </div>

          {/* Conditional Custom Rules */}
          {(preset === 'custom' || preset === 'web_balanced' || preset === 'ultra_light' || preset === 'lossless') && (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/60 pt-6 transition-all duration-300 ${preset !== 'custom' ? 'opacity-60 pointer-events-none' : ''}`}>
              
              {/* Format Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-secondary">Default Target Format</label>
                <Input
                  variant="select"
                  value={format}
                  onChange={(val) => setFormat(val)}
                  options={[
                    { label: "Auto (AVIF & WebP Fallback)", value: "auto" },
                    { label: "Convert to AVIF (Highest Compression)", value: "avif" },
                    { label: "Convert to WebP (Modern Web Standard)", value: "webp" },
                    { label: "Keep Original / Convert to JPEG", value: "jpeg" },
                  ]}
                />
              </div>

              {/* Quality Range */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-secondary">Default Compression Quality ({quality}%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="flex-1 accent-accent h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                  />
                  <Input
                    variant="number"
                    min={1}
                    max={100}
                    value={quality}
                    onChange={(e) => setQuality(Math.min(100, Math.max(1, Number(e.target.value))))}
                    className="w-16 text-center"
                  />
                </div>
              </div>

              {/* Metadata stripping */}
              <div className="flex items-center justify-between border border-border/80 bg-sidebar/30 p-4 rounded-xl md:col-span-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-text-light font-medium">Remove Camera & GPS Metadata</span>
                  <span className="text-xs text-text-muted">Strips EXIF data (GPS coordinates, camera model, etc.) to protect privacy and save space.</span>
                </div>
                <Switch 
                  initialChecked={stripMetadata} 
                  onChange={setStripMetadata} 
                />
              </div>

              {/* Dimension constraints */}
              <div className="flex flex-col gap-4 border border-border/80 bg-sidebar/30 p-4 rounded-xl md:col-span-2">
                <span className="text-sm text-text-light font-semibold flex items-center gap-2">
                  <Icon icon="lucide:maximize-2" width={16} />
                  Default Image Sizing constraints
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-text-muted">Max Width (pixels)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 1920 (optional)"
                      value={maxWidth}
                      onChange={(e) => setMaxWidth(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-text-muted">Max Height (pixels)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 1080 (optional)"
                      value={maxHeight}
                      onChange={(e) => setMaxHeight(e.target.value)}
                    />
                  </div>
                </div>

                {(maxWidth || maxHeight) && (
                  <div className="flex flex-col gap-1.5 mt-2 border-t border-border/50 pt-3">
                    <label className="text-xs text-text-muted font-medium">Fit Strategy</label>
                    <Input
                      variant="select"
                      value={fit}
                      onChange={(val) => setFit(val)}
                      options={[
                        { label: "Cover (Crop edges to fill dimensions)", value: "cover" },
                        { label: "Contain (Add padding to fit constraints)", value: "contain" },
                        { label: "Inside (Scale proportionally to fit inside)", value: "inside" },
                      ]}
                    />
                  </div>
                )}
              </div>

              {/* Default Watermark configuration */}
              <div className="flex flex-col gap-4 border border-border/80 bg-sidebar/30 p-4 rounded-xl md:col-span-2">
                <span className="text-sm text-text-light font-semibold flex items-center gap-2">
                  <Icon icon="lucide:copyright" width={16} className="text-accent" />
                  Default Workspace Watermark
                  {!isProOrEnterprise && (
                    <span className="bg-purple-500/20 text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide shrink-0">
                      PRO+
                    </span>
                  )}
                </span>
                
                {isProOrEnterprise ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-1">
                    {/* Default Watermark Text */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Default Text Watermark</label>
                      <Input
                        type="text"
                        placeholder="e.g. MyBrand"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                      />
                      <p className="text-[10px] text-text-muted mt-0.5 leading-normal">
                        This text is used if no custom text is provided in the watermark query.
                      </p>
                    </div>

                    {/* Default SVG/Image Watermark */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                          Default Image/SVG Watermark
                          {!isEnterprise && (
                            <span className="bg-purple-500/20 text-purple-400 text-[8px] font-bold px-1 py-0.5 rounded tracking-wide shrink-0">
                              ENT
                            </span>
                          )}
                        </label>
                        {watermarkUrl && (
                          <button
                            type="button"
                            onClick={() => setWatermarkUrl(null)}
                            className="text-[10px] font-bold text-error hover:underline transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {isEnterprise ? (
                        <div className="flex items-center gap-3">
                          {watermarkUrl ? (
                            <div className="flex items-center gap-2.5 p-2 bg-[#0c1222]/80 border border-white/5 rounded-lg flex-1 overflow-hidden">
                              <div className="h-8 w-8 rounded border border-border bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={watermarkUrl} alt="Watermark preview" className="max-h-full max-w-full object-contain" />
                              </div>
                              <span className="text-[11px] font-mono text-text-muted truncate flex-1">
                                {watermarkUrl}
                              </span>
                            </div>
                          ) : (
                            <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-lg p-3 hover:border-accent transition-all cursor-pointer bg-[#0c1222]/20 hover:bg-[#0c1222]/40 ${isUploadingWm ? 'pointer-events-none opacity-50' : ''}`}>
                              {isUploadingWm ? (
                                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                  <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={14} />
                                  Uploading...
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-center">
                                  <Icon icon="lucide:upload-cloud" className="text-text-muted" width={18} />
                                  <span className="text-[11px] text-text-secondary font-semibold">Upload default SVG / PNG logo</span>
                                </div>
                              )}
                              <input
                                type="file"
                                accept=".svg,.png"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingWm(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append('image', file);
                                    const res = await uploadWatermarkApi(formData);
                                    const cdnUrl = res?.data?.cdnUrl || res?.cdnUrl;
                                    if (cdnUrl) {
                                      setWatermarkUrl(cdnUrl);
                                      showFeedback('Default watermark image uploaded');
                                    } else {
                                      showFeedback('Upload failed', 'error');
                                    }
                                  } catch (err: any) {
                                    console.error(err);
                                    showFeedback(err?.message || 'Upload failed', 'error');
                                  } finally {
                                    setIsUploadingWm(false);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-900/60 border border-border/50 rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
                          <Icon icon="lucide:lock" className="text-text-muted mb-1" width={16} />
                          <span className="text-[11px] font-bold text-text-secondary">Enterprise Plan Feature</span>
                          <span className="text-[10px] text-text-muted mt-0.5">
                            Upgrade to Enterprise to upload custom default brand logo watermarks.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border border-border/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <Icon icon="lucide:lock" className="text-text-muted mb-1.5" width={20} />
                    <span className="text-xs font-bold text-text-secondary">PRO+ Feature</span>
                    <span className="text-[11px] text-text-muted mt-1 leading-normal">
                      Watermarking features require a PRO or ENTERPRISE subscription.
                    </span>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6 border-t border-border">
          <Button 
            variant="accent" 
            className="w-full sm:w-auto justify-center min-w-[140px]"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} />
            ) : (
              'Save Defaults'
            )}
          </Button>
        </div>

      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={feedback.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
