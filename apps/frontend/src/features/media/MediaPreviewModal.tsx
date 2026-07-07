'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useThrottle } from '@/hooks/useThrottle';
import { Icon } from '@iconify/react';
import { Modal } from '@/components/Modal';
import { MediaFile, downloadMediaFileClientApi } from './api';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { createShareLinkApi, getShareLinksApi, deleteShareLinkApi, ShareLink } from '../share/api';
import { getDomainsApi } from '../settings/api';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: MediaFile | null;
  onDelete: (id: string) => void;
  /** Open directly in editor mode with a specific tab */
  initialTab?: RightTab;
}

// Crop rect in % of image dimensions [0..100]
interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16';

const ASPECT_PRESETS: { label: string; value: AspectRatioPreset; ratio: number | null }[] = [
  { label: 'Free', value: 'free', ratio: null },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
  { label: '4:3', value: '4:3', ratio: 4 / 3 },
  { label: '3:2', value: '3:2', ratio: 3 / 2 },
  { label: '9:16', value: '9:16', ratio: 9 / 16 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

type RightTab = 'cdn' | 'share';

export function MediaPreviewModal({ isOpen, onClose, file, onDelete, initialTab }: MediaPreviewModalProps) {
  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId) || workspaces[0];
  const plan = activeWorkspace?.plan || 'FREE';
  const isProOrEnterprise = plan === 'PRO' || plan === 'ENTERPRISE';

  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // ── Right panel tab ──
  const [activeTab, setActiveTab] = useState<RightTab>('cdn');

  // Auto-open in editing mode with specific tab when initialTab is provided
  useEffect(() => {
    if (isOpen && initialTab) {
      setIsEditing(true);
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ──────────── Crop State ────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgObjRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Canvas view: offset & zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const panStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const pinchRef = useRef({ dist: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef<string | null>(null);
  const isDrawingNewRef = useRef(false);
  const drawStartPctRef = useRef({ x: 0, y: 0 });

  // Crop rect in canvas-pixel coordinates
  const cropRef = useRef<CropRect>({ x: 10, y: 10, w: 80, h: 80 });
  const [cropRect, setCropRect] = useState<CropRect>({ x: 10, y: 10, w: 80, h: 80 });
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('free');
  const [cropEnabled, setCropEnabled] = useState(true);

  // Format / Quality
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(80);

  // Watermark
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('OptiDrive');
  const [watermarkOpacity, setWatermarkOpacity] = useState(30);

  // Grid toggle
  const [showGrid, setShowGrid] = useState(true);

  // Debounced states
  const [debouncedState, setDebouncedState] = useState({
    crop: { x: 10, y: 10, w: 80, h: 80 } as CropRect,
    cropEnabled: true,
    quality: 80,
    wmText: 'OptiDrive',
    wmOpacity: 30,
    format: 'webp',
    enableWatermark: false,
  });
  const [isDebouncing, setIsDebouncing] = useState(false);

  // ──────────── Share State ────────────
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCreating, setShareCreating] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresIn, setShareExpiresIn] = useState('7');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deleteShareId, setDeleteShareId] = useState<string | null>(null);
  const [shareDeleting, setShareDeleting] = useState(false);
  const [activeDomains, setActiveDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('default');

  // ──────────── Canvas Size ────────────
  const CANVAS_W = 520;
  const CANVAS_H = 340;

  // ──────────── Load Image ────────────
  useEffect(() => {
    if (!file || !isEditing) return;
    setImgLoaded(false);
    const img = new Image();
    // Use the backend proxy URL to avoid CORS issues with CDN (R2/S3)
    // The proxy endpoint serves the raw image without CORS restrictions
    const proxyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/media/view/${file.id}?f=png&q=90`;
    img.src = proxyUrl;
    img.onload = () => {
      imgObjRef.current = img;
      setImgLoaded(true);
      // Reset view
      setPan({ x: 0, y: 0 });
      setZoom(1);
      // Reset crop to full image
      const rect = { x: 5, y: 5, w: 90, h: 90 };
      cropRef.current = rect;
      setCropRect(rect);
    };
    img.onerror = () => {
      // Fallback: try direct CDN URL
      const fallback = new Image();
      fallback.src = file.cdnUrl;
      fallback.onload = () => {
        imgObjRef.current = fallback;
        setImgLoaded(true);
        setPan({ x: 0, y: 0 });
        setZoom(1);
        const rect = { x: 5, y: 5, w: 90, h: 90 };
        cropRef.current = rect;
        setCropRect(rect);
      };
    };
  }, [file, isEditing]);

  // ──────────── Load Share Data ────────────
  const loadShareLinks = useCallback(async () => {
    if (!file) return;
    setShareLoading(true);
    try {
      const data = await getShareLinksApi({ fileId: file.id });
      setShareLinks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setShareLoading(false);
    }
  }, [file]);

  const loadActiveDomains = useCallback(async () => {
    try {
      const result = await getDomainsApi();
      const active = result.filter((d: any) => d.status === 'ACTIVE').map((d: any) => d.domain);
      setActiveDomains(active);
    } catch (err) {
      console.error('Failed to load active domains:', err);
    }
  }, []);

  useEffect(() => {
    if (isEditing && activeTab === 'share' && file) {
      loadShareLinks();
      loadActiveDomains();
    }
  }, [isEditing, activeTab, file, loadShareLinks, loadActiveDomains]);

  // ──────────── Draw Canvas ────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgObjRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const img = imgObjRef.current;
    const baseScale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (CANVAS_W - drawW) / 2 + pan.x;
    const drawY = (CANVAS_H - drawH) / 2 + pan.y;

    if (!cropEnabled) {
      // Draw image at full brightness
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      return;
    }

    // Crop rect in canvas pixels
    const cr = cropRef.current;
    const rx = drawX + (cr.x / 100) * drawW;
    const ry = drawY + (cr.y / 100) * drawH;
    const rw = (cr.w / 100) * drawW;
    const rh = (cr.h / 100) * drawH;

    // Step 1: Draw image at reduced opacity EVERYWHERE (outside crop area appears dimmed)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Step 2: Draw image at full brightness ONLY inside the crop rect (clip to crop)
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.globalAlpha = 1.0;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Step 3: Crop border
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);

    // Step 4: Rule-of-thirds grid (optional)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.7;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(rx + rw * i / 3, ry); ctx.lineTo(rx + rw * i / 3, ry + rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx, ry + rh * i / 3); ctx.lineTo(rx + rw, ry + rh * i / 3); ctx.stroke();
      }
    }

    // Step 5: L-shaped corner handles
    const lineLen = 14;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 5;
    const cornerDefs = [
      { x: rx,      y: ry,      dx: 1,  dy: 1  },
      { x: rx + rw, y: ry,      dx: -1, dy: 1  },
      { x: rx,      y: ry + rh, dx: 1,  dy: -1 },
      { x: rx + rw, y: ry + rh, dx: -1, dy: -1 },
    ];
    cornerDefs.forEach(({ x, y, dx, dy }) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * lineLen, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * lineLen);
      ctx.stroke();
    });
    ctx.restore();

    // Step 6: Dimensions label above crop frame
    const pxW = Math.round((cr.w / 100) * img.width);
    const pxH = Math.round((cr.h / 100) * img.height);
    const labelText = `${pxW} × ${pxH} px`;
    const labelW = labelText.length * 6.5 + 10;
    const labelX = rx + rw / 2 - labelW / 2;
    const labelY = Math.max(ry - 26, 4);
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,20,0.75)';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelW, 18, 4);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, rx + rw / 2, labelY + 13);
    ctx.restore();
  }, [pan, zoom, cropEnabled, showGrid]);

  useEffect(() => {
    if (imgLoaded) draw();
  }, [imgLoaded, draw, cropRect]);

  // ──────────── Mouse Event Helpers ────────────
  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };
  };

  const getCanvasPosFromEvent = (e: React.MouseEvent<HTMLCanvasElement> | React.Touch) => {
    return getCanvasPos(e.clientX, e.clientY);
  };

  const getImgPctCoords = (cx: number, cy: number) => {
    const img = imgObjRef.current;
    if (!img) return null;
    const baseScale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (CANVAS_W - drawW) / 2 + pan.x;
    const drawY = (CANVAS_H - drawH) / 2 + pan.y;
    return {
      x: clamp(((cx - drawX) / drawW) * 100, 0, 100),
      y: clamp(((cy - drawY) / drawH) * 100, 0, 100),
    };
  };

  const getCropPixels = () => {
    const img = imgObjRef.current;
    if (!img) return null;
    const baseScale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (CANVAS_W - drawW) / 2 + pan.x;
    const drawY = (CANVAS_H - drawH) / 2 + pan.y;
    const cr = cropRef.current;
    return {
      x: drawX + (cr.x / 100) * drawW,
      y: drawY + (cr.y / 100) * drawH,
      w: (cr.w / 100) * drawW,
      h: (cr.h / 100) * drawH,
      drawX, drawY, drawW, drawH,
    };
  };

  const getHandleAt = (px: number, py: number): string | null => {
    const cp = getCropPixels();
    if (!cp) return null;
    const { x, y, w, h } = cp;
    const T = 12;
    if (Math.abs(px - x) < T && Math.abs(py - y) < T) return 'nw';
    if (Math.abs(px - (x + w)) < T && Math.abs(py - y) < T) return 'ne';
    if (Math.abs(px - x) < T && Math.abs(py - (y + h)) < T) return 'sw';
    if (Math.abs(px - (x + w)) < T && Math.abs(py - (y + h)) < T) return 'se';
    return null;
  };

  const isInsideCrop = (px: number, py: number) => {
    const cp = getCropPixels();
    if (!cp) return false;
    return px >= cp.x && px <= cp.x + cp.w && py >= cp.y && py <= cp.y + cp.h;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropEnabled) return;
    const pos = getCanvasPosFromEvent(e);
    const handle = getHandleAt(pos.x, pos.y);
    if (handle) {
      isResizingRef.current = handle;
      panStartRef.current = { x: pos.x, y: pos.y, px: 0, py: 0 };
    } else if (isInsideCrop(pos.x, pos.y)) {
      isDraggingRef.current = true;
      panStartRef.current = { x: pos.x, y: pos.y, px: cropRef.current.x, py: cropRef.current.y };
    } else {
      // Clicked outside crop: start drawing a new crop rect
      const pct = getImgPctCoords(pos.x, pos.y);
      if (pct) {
        isDrawingNewRef.current = true;
        drawStartPctRef.current = pct;
        cropRef.current = { x: pct.x, y: pct.y, w: 0, h: 0 };
        setCropRect({ ...cropRef.current });
        draw();
      }
    }
  };

  // Stable refs for applyMove dependencies (avoid stale closures in global listeners)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const aspectPresetRef = useRef(aspectPreset);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { aspectPresetRef.current = aspectPreset; }, [aspectPreset]);

  const applyMoveGlobal = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };

    const img = imgObjRef.current;
    if (!img) return;
    const baseScale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const scale = baseScale * zoomRef.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (CANVAS_W - drawW) / 2 + panRef.current.x;
    const drawY = (CANVAS_H - drawH) / 2 + panRef.current.y;
    const cr = cropRef.current;

    if (isDrawingNewRef.current) {
      const pctX = clamp(((pos.x - drawX) / drawW) * 100, 0, 100);
      const pctY = clamp(((pos.y - drawY) / drawH) * 100, 0, 100);
      const start = drawStartPctRef.current;
      const ratio = ASPECT_PRESETS.find(a => a.value === aspectPresetRef.current)?.ratio ?? null;

      let x, y, w, h;
      if (ratio) {
        const dx = pctX - start.x;
        const dy = pctY - start.y;
        const signX = dx >= 0 ? 1 : -1;
        const signY = dy >= 0 ? 1 : -1;
        const useX = Math.abs(dx) / ratio > Math.abs(dy);
        if (useX) { w = Math.abs(dx); h = w / ratio; }
        else { h = Math.abs(dy); w = h * ratio; }
        x = signX === 1 ? start.x : start.x - w;
        y = signY === 1 ? start.y : start.y - h;
        if (x < 0) { x = 0; w = start.x; h = w / ratio; y = signY === 1 ? start.y : start.y - h; }
        if (y < 0) { y = 0; h = start.y; w = h * ratio; x = signX === 1 ? start.x : start.x - w; }
        if (x + w > 100) { w = 100 - x; h = w / ratio; }
        if (y + h > 100) { h = 100 - y; w = h * ratio; }
      } else {
        x = Math.min(start.x, pctX);
        y = Math.min(start.y, pctY);
        w = Math.abs(start.x - pctX);
        h = Math.abs(start.y - pctY);
      }
      cropRef.current = { x: clamp(x, 0, 100), y: clamp(y, 0, 100), w: clamp(w, 0, 100), h: clamp(h, 0, 100) };
      setCropRect({ ...cropRef.current });
    } else if (isDraggingRef.current) {
      const dx = ((pos.x - panStartRef.current.x) / drawW) * 100;
      const dy = ((pos.y - panStartRef.current.y) / drawH) * 100;
      const nx = clamp(panStartRef.current.px + dx, 0, 100 - cr.w);
      const ny = clamp(panStartRef.current.py + dy, 0, 100 - cr.h);
      cropRef.current = { ...cr, x: nx, y: ny };
      setCropRect({ ...cropRef.current });
    } else if (isResizingRef.current) {
      const handle = isResizingRef.current;
      const minPct = 10;
      let { x, y, w, h } = cr;
      const ratio = ASPECT_PRESETS.find(a => a.value === aspectPresetRef.current)?.ratio ?? null;
      const mxPct = ((pos.x - drawX) / drawW) * 100;
      const myPct = ((pos.y - drawY) / drawH) * 100;
      if (handle === 'se') {
        w = clamp(mxPct - x, minPct, 100 - x);
        h = ratio ? w / ratio : clamp(myPct - y, minPct, 100 - y);
      } else if (handle === 'sw') {
        const nx = clamp(mxPct, 0, x + w - minPct);
        w = (x + w) - nx; x = nx;
        h = ratio ? w / ratio : clamp(myPct - y, minPct, 100 - y);
      } else if (handle === 'ne') {
        w = clamp(mxPct - x, minPct, 100 - x);
        h = ratio ? w / ratio : (y + h) - clamp(myPct, 0, y + h - minPct);
        if (!ratio) y = clamp(myPct, 0, y + h - minPct);
      } else if (handle === 'nw') {
        const ox = x + w; const oy = y + h;
        x = clamp(mxPct, 0, ox - minPct);
        y = ratio ? (oy - (ox - x) / ratio) : clamp(myPct, 0, oy - minPct);
        w = ox - x; h = ratio ? w / ratio : oy - y;
      }
      cropRef.current = { x: clamp(x, 0, 100), y: clamp(y, 0, 100), w: clamp(w, minPct, 100), h: clamp(h, minPct, 100) };
      setCropRect({ ...cropRef.current });
    }
  }, []);

  const finishInteraction = useCallback(() => {
    isDraggingRef.current = false;
    isResizingRef.current = null;
    if (isDrawingNewRef.current) {
      isDrawingNewRef.current = false;
      const minPct = 5;
      if (cropRef.current.w < minPct || cropRef.current.h < minPct) {
        const center = drawStartPctRef.current;
        const ratio = ASPECT_PRESETS.find(a => a.value === aspectPresetRef.current)?.ratio ?? null;
        let w = 20;
        let h = ratio ? w / ratio : 20;
        let x = clamp(center.x - w / 2, 0, 100 - w);
        let y = clamp(center.y - h / 2, 0, 100 - h);
        cropRef.current = { x, y, w, h };
        setCropRect({ ...cropRef.current });
      }
    }
    setIsDebouncing(true);
  }, []);

  const throttledApplyMove = useThrottle((clientX: number, clientY: number) => {
    applyMoveGlobal(clientX, clientY);
    draw();
  });

  // ── Global mouse listeners for tracking outside canvas ──
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current && !isResizingRef.current && !isDrawingNewRef.current) return;
      throttledApplyMove(e.clientX, e.clientY);
    };

    const handleGlobalMouseUp = () => {
      if (!isDraggingRef.current && !isResizingRef.current && !isDrawingNewRef.current) return;
      finishInteraction();
      draw();
    };

    if (isEditing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isEditing, throttledApplyMove, finishInteraction, draw]);

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropEnabled) return;
    // Cursor styling only (actual move handled by global listener)
    if (!isDraggingRef.current && !isResizingRef.current && !isDrawingNewRef.current) {
      const pos = getCanvasPosFromEvent(e);
      const handle = getHandleAt(pos.x, pos.y);
      const inside = isInsideCrop(pos.x, pos.y);
      const canvas = canvasRef.current;
      if (canvas) {
        if (handle === 'nw' || handle === 'se') canvas.style.cursor = 'nwse-resize';
        else if (handle === 'ne' || handle === 'sw') canvas.style.cursor = 'nesw-resize';
        else if (inside) canvas.style.cursor = 'move';
        else canvas.style.cursor = 'crosshair';
      }
    }
  };

  // Touch
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!cropEnabled) return;
    if (e.touches.length === 2) {
      pinchRef.current = {
        dist: Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY),
        zoom,
      };
      return;
    }
    const touch = e.touches[0];
    const pos = getCanvasPosFromEvent(touch);
    const handle = getHandleAt(pos.x, pos.y);
    if (handle) {
      isResizingRef.current = handle;
      panStartRef.current = { x: pos.x, y: pos.y, px: 0, py: 0 };
    } else if (isInsideCrop(pos.x, pos.y)) {
      isDraggingRef.current = true;
      panStartRef.current = { x: pos.x, y: pos.y, px: cropRef.current.x, py: cropRef.current.y };
    } else {
      const pct = getImgPctCoords(pos.x, pos.y);
      if (pct) {
        isDrawingNewRef.current = true;
        drawStartPctRef.current = pct;
        cropRef.current = { x: pct.x, y: pct.y, w: 0, h: 0 };
        setCropRect({ ...cropRef.current });
        draw();
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!cropEnabled) return;
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const newZoom = clamp(pinchRef.current.zoom * (dist / pinchRef.current.dist), 0.5, 3);
      setZoom(newZoom);
      draw();
      return;
    }
    throttledApplyMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchEnd = () => {
    finishInteraction();
  };

  // Wheel zoom
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(prev => clamp(prev + delta, 0.4, 4));
  };

  // Apply aspect ratio preset
  const applyAspect = (preset: AspectRatioPreset) => {
    setAspectPreset(preset);
    const ratio = ASPECT_PRESETS.find(a => a.value === preset)?.ratio ?? null;
    if (ratio) {
      const cr = cropRef.current;
      const newH = cr.w / ratio;
      cropRef.current = { ...cr, h: clamp(newH, 10, 100 - cr.y) };
      setCropRect({ ...cropRef.current });
      draw();
    }
  };

  // Reset crop
  const resetCrop = () => {
    const rect = { x: 5, y: 5, w: 90, h: 90 };
    cropRef.current = rect;
    setCropRect(rect);
    setAspectPreset('free');
    draw();
  };

  // ──────────── Debounce for URL ────────────
  useEffect(() => {
    if (!isDebouncing) return;
    const t = setTimeout(() => {
      setDebouncedState({
        crop: cropRef.current,
        cropEnabled,
        quality,
        wmText: watermarkText,
        wmOpacity: watermarkOpacity,
        format,
        enableWatermark,
      });
      setIsDebouncing(false);
    }, 500);
    return () => clearTimeout(t);
  }, [isDebouncing, cropEnabled, quality, watermarkText, watermarkOpacity, format, enableWatermark]);

  // Trigger debounce on any setting change
  useEffect(() => { setIsDebouncing(true); }, [quality, watermarkText, watermarkOpacity, format, enableWatermark, cropEnabled]);

  if (!file) return null;

  // ──────────── URL Builder ────────────
  const buildUrl = (state: typeof debouncedState) => {
    const params = new URLSearchParams();

    if (state.cropEnabled) {
      const img = imgObjRef.current;
      if (img) {
        const pxX = Math.round((state.crop.x / 100) * img.width);
        const pxY = Math.round((state.crop.y / 100) * img.height);
        const pxW = Math.round((state.crop.w / 100) * img.width);
        const pxH = Math.round((state.crop.h / 100) * img.height);
        const isFullImage = state.crop.x <= 1 && state.crop.y <= 1 && state.crop.w >= 98 && state.crop.h >= 98;
        if (!isFullImage) {
          params.append('cx', pxX.toString());
          params.append('cy', pxY.toString());
          params.append('cw', pxW.toString());
          params.append('ch', pxH.toString());
        }
      }
    }

    params.append('f', state.format);
    if (state.quality !== 80) params.append('q', state.quality.toString());

    if (state.enableWatermark && isProOrEnterprise) {
      params.append('wm', 'true');
      if (state.wmText !== 'OptiDrive') params.append('wmText', state.wmText);
      if (state.wmOpacity !== 30) params.append('wmOpacity', (state.wmOpacity / 100).toString());
    }

    const base = `${window.location.origin}/api/public/media/view/${file.id}`;
    return `${base}?${params.toString()}`;
  };

  const copyUrl = isEditing ? buildUrl({ ...debouncedState, crop: cropRef.current }) : file.cdnUrl;

  // ──────────── Helpers ────────────
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadImage = async () => {
    setIsDownloading(true);
    try {
      if (isEditing) {
        const a = document.createElement('a');
        a.href = copyUrl;
        a.download = `transformed_${file.name}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        await downloadMediaFileClientApi(file.id, file.name);
      }
    } catch {
      window.open(copyUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ──────────── Share handlers ────────────
  const handleShareCreate = async () => {
    setShareCreating(true);
    setShareError(null);
    try {
      await createShareLinkApi({
        fileId: file.id,
        ...(sharePassword ? { password: sharePassword } : {}),
        ...(shareExpiresIn !== '0' ? { expiresInDays: shareExpiresIn } : {}),
      });
      setSharePassword('');
      setShareExpiresIn('7');
      await loadShareLinks();
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error & { response?: { data?: { error?: string } } };
      setShareError(error.response?.data?.error || error.message || 'Failed to create link');
    } finally {
      setShareCreating(false);
    }
  };

  const handleShareDelete = async () => {
    if (!deleteShareId) return;
    setShareDeleting(true);
    try {
      await deleteShareLinkApi(deleteShareId);
      setShareLinks(shareLinks.filter(l => l.id !== deleteShareId));
      setDeleteShareId(null);
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error & { response?: { data?: { error?: string } } };
      setShareError(error.response?.data?.error || error.message || 'Failed to delete link');
    } finally {
      setShareDeleting(false);
    }
  };

  const handleShareCopy = (slug: string) => {
    const base = selectedDomain === 'default'
      ? window.location.origin
      : `${window.location.protocol}//${selectedDomain}${window.location.port ? `:${window.location.port}` : ''}`;
    const url = `${base}/s/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleClose = () => {
    setIsEditing(false);
    setActiveTab('cdn');
    setShareLinks([]);
    setSharePassword('');
    setShareExpiresIn('7');
    setShareError(null);
    setDeleteShareId(null);
    setActiveDomains([]);
    setSelectedDomain('default');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Media Studio' : 'Media Preview'}
      icon={isEditing ? 'lucide:wand-sparkles' : 'lucide:image'}
      maxWidth={isEditing ? 'max-w-6xl' : 'max-w-md'}
    >
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pb-2">
        {isEditing ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

            {/* ══════════════════════════════════════════════════════
                ██ LEFT COLUMN: Canvas + Crop Tools (Persistent)
                ══════════════════════════════════════════════════════ */}
            <div className="xl:col-span-7 flex flex-col gap-3">

              {/* Aspect ratio presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1">Aspect:</span>
                {ASPECT_PRESETS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => applyAspect(p.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      aspectPreset === p.value
                        ? 'bg-accent border-accent text-white shadow-sm'
                        : 'bg-bg/60 border-border text-text-muted hover:border-accent/50 hover:text-text-light'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => setShowGrid(g => !g)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      showGrid
                        ? 'bg-slate-700/60 border-slate-600 text-slate-300'
                        : 'bg-bg/60 border-border text-text-muted'
                    }`}
                    title="Toggle rule-of-thirds grid"
                  >
                    <Icon icon="lucide:grid-3x3" width={11} />
                    Grid
                  </button>
                  <button
                    onClick={() => setCropEnabled(e => !e)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      cropEnabled
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-bg/60 border-border text-text-muted'
                    }`}
                  >
                    <Icon icon={cropEnabled ? 'lucide:crop' : 'lucide:image'} width={11} />
                    {cropEnabled ? 'Crop On' : 'No Crop'}
                  </button>
                  <button
                    onClick={resetCrop}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-border bg-bg/60 text-text-muted hover:text-text-light transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Canvas */}
              <div
                ref={containerRef}
                className="relative w-full rounded-2xl overflow-hidden bg-[#080d19] border border-border"
                style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
              >
                <canvas
                  ref={canvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  className="w-full h-full block touch-none select-none"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onWheel={onWheel}
                />

                {/* Loading overlay */}
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#080d19]">
                    <Icon icon="lucide:loader-2" className="text-text-muted animate-spin" width={28} />
                  </div>
                )}

                {/* Scroll hint */}
                <div className="absolute bottom-2.5 left-2.5 text-[9px] text-text-muted/60 font-medium">
                  Scroll to zoom • Drag handles to crop
                </div>
              </div>

              {/* File info strip */}
              <div className="flex items-center gap-3 text-[11px] text-text-muted px-1">
                <span className="font-mono uppercase">{file.format}</span>
                <span className="text-border">•</span>
                <span>{formatBytes(file.originalSize)} → {formatBytes(file.optimizedSize)}</span>
                <span className="text-border">•</span>
                <span className="text-emerald-400 font-semibold">
                  {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
                </span>
                <div className="ml-auto">
                  <button
                    onClick={() => { onDelete(file.id); handleClose(); }}
                    className="inline-flex items-center gap-1 text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Icon icon="lucide:trash-2" width={12} />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                ██ RIGHT COLUMN: Tabbed Settings Panel
                ══════════════════════════════════════════════════════ */}
            <div className="xl:col-span-5 flex flex-col bg-bg/50 border border-border rounded-2xl overflow-hidden">

              {/* ── Tab Header ── */}
              <div className="flex border-b border-border/60">
                <button
                  onClick={() => setActiveTab('cdn')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'cdn'
                      ? 'text-accent border-b-2 border-accent bg-accent/5'
                      : 'text-text-muted hover:text-text-light hover:bg-white/3'
                  }`}
                >
                  <Icon icon="lucide:zap" width={13} />
                  CDN & Optimize
                </button>
                <button
                  onClick={() => setActiveTab('share')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'share'
                      ? 'text-accent border-b-2 border-accent bg-accent/5'
                      : 'text-text-muted hover:text-text-light hover:bg-white/3'
                  }`}
                >
                  <Icon icon="lucide:shield-check" width={13} />
                  Secure Share
                </button>
              </div>

              {/* ── Tab Content ── */}
              <div className="flex flex-col gap-4 p-5">

                {activeTab === 'cdn' ? (
                  /* ━━━━━━━━━━━━━━━━━━ TAB 1: CDN & Optimize ━━━━━━━━━━━━━━━━━━ */
                  <>
                    {/* Format & Quality */}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Output Format</label>
                        <select
                          value={format}
                          onChange={(e) => setFormat(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-1.5 text-xs text-text-light focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          <option value="webp">WebP (Best for web)</option>
                          <option value="avif">AVIF (Ultra compression)</option>
                          <option value="jpeg">JPEG (Universal)</option>
                          <option value="png">PNG (Lossless)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Quality</label>
                          <span className="text-[11px] font-bold text-accent">{quality}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={quality}
                          onChange={(e) => setQuality(Number(e.target.value))}
                          className="w-full h-2 bg-slate-700 border border-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                        <div className="flex justify-between text-[9px] text-text-muted">
                          <span>Min size</span><span>Max quality</span>
                        </div>
                      </div>
                    </div>

                    {/* Watermark */}
                    <div className="border-t border-border/50 pt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-text-light uppercase tracking-wider">Watermark</span>
                          {!isProOrEnterprise && (
                            <span className="px-1.5 py-0.5 text-[8px] font-extrabold uppercase bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded tracking-wider">
                              PRO+
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => isProOrEnterprise && setEnableWatermark(!enableWatermark)}
                          disabled={!isProOrEnterprise}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                            enableWatermark && isProOrEnterprise ? 'bg-accent' : 'bg-slate-800'
                          } ${!isProOrEnterprise ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            enableWatermark && isProOrEnterprise ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      {enableWatermark && isProOrEnterprise && (
                        <div className="flex flex-col gap-3 p-3 bg-slate-950/40 border border-border/80 rounded-xl">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-text-muted font-bold uppercase">Text</span>
                            <input
                              type="text"
                              value={watermarkText}
                              onChange={(e) => setWatermarkText(e.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-1.5 text-xs text-text-light focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-text-muted font-bold uppercase">Opacity</span>
                              <span className="text-[10px] font-bold text-accent">{watermarkOpacity}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={watermarkOpacity}
                              onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                              className="w-full h-2 bg-slate-700 border border-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CDN URL panel */}
                    <div className="border-t border-border/50 pt-4 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Generated CDN URL</span>
                        {isDebouncing && (
                          <span className="flex items-center gap-1 text-[9px] text-accent font-medium animate-pulse">
                            <Icon icon="lucide:loader-2" className="animate-spin" width={10} />
                            updating
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 bg-[#0c1222]/80 border border-white/5 px-3 py-2 rounded-lg overflow-hidden">
                        <span className={`text-[11px] font-mono text-text-light truncate flex-1 select-all transition-opacity duration-200 ${isDebouncing ? 'opacity-50' : 'opacity-100'}`}>
                          {copyUrl}
                        </span>
                        <button
                          onClick={() => copyToClipboard(copyUrl)}
                          className="p-1.5 rounded bg-slate-800 text-text-muted hover:text-white hover:bg-slate-700 transition-all shrink-0 cursor-pointer"
                          title="Copy URL"
                        >
                          <Icon icon={isCopied ? 'lucide:check' : 'lucide:copy'} width={13} />
                        </button>
                      </div>
                    </div>

                    {/* CDN tab footer */}
                    <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-4 mt-auto">
                      <Button
                        variant="bordered"
                        className="text-xs px-3"
                        onClick={() => setIsEditing(false)}
                      >
                        <Icon icon="lucide:arrow-left" className="mr-1.5" width={13} />
                        Back
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="bordered"
                          className="text-xs px-3 text-text-muted hover:text-text-light"
                          onClick={() => { resetCrop(); setFormat('webp'); setQuality(80); setEnableWatermark(false); setIsDebouncing(true); }}
                        >
                          Reset All
                        </Button>
                        <Button
                          variant="accent"
                          className="text-xs px-3.5 font-semibold"
                          onClick={downloadImage}
                          disabled={isDownloading}
                        >
                          <Icon icon={isDownloading ? 'lucide:loader-2' : 'lucide:download'} className={`mr-1.5 ${isDownloading ? 'animate-spin' : ''}`} width={13} />
                          {isDownloading ? 'Saving...' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ━━━━━━━━━━━━━━━━━━ TAB 2: Secure Share ━━━━━━━━━━━━━━━━━━ */
                  <>
                    {/* Create new link form */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[11px] font-bold text-text-light uppercase tracking-wider flex items-center gap-2">
                        <Icon icon="lucide:link-2" width={13} className="text-accent" />
                        Create New Link
                      </h4>

                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-muted font-bold uppercase">Password (Optional)</label>
                          <input
                            type="text"
                            placeholder="Leave blank for public access"
                            value={sharePassword}
                            onChange={(e) => setSharePassword(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-1.5 text-xs text-text-light focus:border-indigo-500 focus:outline-none placeholder:text-text-muted/50"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-muted font-bold uppercase">Expiration</label>
                          <select
                            value={shareExpiresIn}
                            onChange={(e) => setShareExpiresIn(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-1.5 text-xs text-text-light focus:border-indigo-500 focus:outline-none cursor-pointer"
                          >
                            <option value="0">Never expire</option>
                            <option value="1">1 Day</option>
                            <option value="7">7 Days</option>
                            <option value="30">30 Days</option>
                          </select>
                        </div>
                      </div>

                      {/* Domain selector */}
                      {activeDomains.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-text-muted font-bold uppercase flex items-center gap-1.5">
                            <Icon icon="lucide:globe" width={11} className="text-accent" />
                            Domain
                          </label>
                          <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-1.5 text-xs text-text-light focus:border-indigo-500 focus:outline-none cursor-pointer"
                          >
                            <option value="default">Default ({typeof window !== 'undefined' ? window.location.host : ''})</option>
                            {activeDomains.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {shareError && (
                        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex items-start gap-2">
                          <Icon icon="lucide:alert-triangle" className="shrink-0 mt-0.5" width={13} />
                          <span>{shareError}</span>
                        </div>
                      )}

                      <Button
                        variant="accent"
                        onClick={handleShareCreate}
                        disabled={shareCreating}
                        className="w-full justify-center text-xs font-semibold"
                      >
                        {shareCreating ? (
                          <><Icon icon="lucide:loader-2" className="animate-spin mr-1.5" width={13} /> Creating...</>
                        ) : (
                          <><Icon icon="lucide:plus" className="mr-1.5" width={13} /> Generate Link</>
                        )}
                      </Button>
                    </div>

                    {/* Active links */}
                    <div className="border-t border-border/50 pt-4 flex flex-col gap-2.5">
                      <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Active Links {shareLinks.length > 0 && `(${shareLinks.length})`}
                      </h4>

                      {shareLoading ? (
                        <div className="py-4 text-center">
                          <Icon icon="lucide:loader-2" className="animate-spin mx-auto text-text-muted" width={20} />
                        </div>
                      ) : shareLinks.length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto">
                          {shareLinks.map(link => (
                            <div key={link.id} className="flex items-center justify-between gap-2 p-2.5 bg-[#0c1222]/60 border border-white/5 rounded-lg">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-mono text-text-light truncate">
                                  {selectedDomain === 'default' ? (typeof window !== 'undefined' ? window.location.host : '') : selectedDomain}/s/{link.slug}
                                </span>
                                <div className="flex items-center gap-2 text-[9px] text-text-muted mt-0.5">
                                  {link.password && (
                                    <span className="flex items-center gap-0.5">
                                      <Icon icon="lucide:lock" width={9} /> Protected
                                    </span>
                                  )}
                                  {link.expiresAt && (
                                    <span className="flex items-center gap-0.5">
                                      <Icon icon="lucide:clock" width={9} /> {new Date(link.expiresAt).toLocaleDateString()}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-0.5">
                                    <Icon icon="lucide:download" width={9} /> {link.downloads}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleShareCopy(link.slug)}
                                  className="p-1.5 rounded bg-slate-800 text-text-muted hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
                                  title="Copy link"
                                >
                                  <Icon icon={copiedSlug === link.slug ? 'lucide:check' : 'lucide:copy'} width={12} className={copiedSlug === link.slug ? 'text-green-400' : ''} />
                                </button>
                                <button
                                  onClick={() => setDeleteShareId(link.id)}
                                  className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                  title="Revoke link"
                                >
                                  <Icon icon="lucide:trash-2" width={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[11px] text-text-muted border border-dashed border-border/50 rounded-lg">
                          No active share links yet.
                        </div>
                      )}
                    </div>

                    {/* Share tab footer */}
                    <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-4 mt-auto">
                      <Button
                        variant="bordered"
                        className="text-xs px-3"
                        onClick={() => setIsEditing(false)}
                      >
                        <Icon icon="lucide:arrow-left" className="mr-1.5" width={13} />
                        Back
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        ) : (
          /* ══════════════════════════════════════════════════════
             ██ STANDARD VIEW MODE (unchanged)
             ══════════════════════════════════════════════════════ */
          <>
            <div className="w-full bg-sidebar border border-border rounded-xl overflow-hidden flex items-center justify-center min-h-[280px] relative group">
              <img
                src={file.cdnUrl}
                alt={file.name}
                className="w-full h-auto max-h-[400px] object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => window.open(file.cdnUrl, '_blank')}
                  className="bg-bg/80 backdrop-blur-sm p-2 rounded-lg text-text-light hover:text-accent transition-colors"
                  title="Open in new tab"
                >
                  <Icon icon="lucide:external-link" width={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-text-light break-all">{file.name}</h3>
                <span className="text-xs text-text-muted font-mono uppercase">{file.format} • {new Date(file.createdAt).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-bg border border-border p-4 rounded-xl">
                <div><span className="text-xs text-text-muted block">Original Size</span><span className="text-sm font-mono text-text-light">{formatBytes(file.originalSize)}</span></div>
                <div><span className="text-xs text-text-muted block">Optimized Size</span><span className="text-sm font-mono text-text-light">{formatBytes(file.optimizedSize)}</span></div>
                <div className="col-span-2 flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-text-muted">Savings</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                    {file.savings > 0 ? `-${file.savings.toFixed(0)}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Footer: two rows layout ── */}
            <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-border/40">
              {/* Row 1: Edit & Crop + Download */}
              <div className="flex items-center gap-2">
                <Button
                  variant="bordered"
                  onClick={() => setIsEditing(true)}
                  className="text-sm flex-1"
                >
                  <Icon icon="lucide:crop" width={14} className="mr-1.5" />
                  Edit & Crop
                </Button>

                <Button
                  variant="bordered"
                  onClick={downloadImage}
                  disabled={isDownloading}
                  className="text-sm flex-1"
                >
                  <Icon icon={isDownloading ? 'lucide:loader-2' : 'lucide:download'} width={14} className={`mr-1.5 ${isDownloading ? 'animate-spin' : ''}`} />
                  {isDownloading ? 'Saving...' : 'Download'}
                </Button>
              </div>

              {/* Row 2: Delete (left) + Copy URL (right) */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => { onDelete(file.id); handleClose(); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 border border-red-500/25 hover:bg-red-500/10 hover:border-red-500/50 transition-all cursor-pointer shrink-0"
                >
                  <Icon icon="lucide:trash-2" width={14} />
                  Delete
                </button>

                <Button
                  variant={isCopied ? 'success' : 'accent'}
                  onClick={() => copyToClipboard(file.cdnUrl)}
                  disabled={isCopied}
                  className="text-sm font-semibold"
                >
                  <Icon icon={isCopied ? 'lucide:check' : 'lucide:link'} width={14} className="mr-1.5" />
                  {isCopied ? 'Copied!' : 'Copy URL'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Revoke link confirmation modal ── */}
      <Modal isOpen={!!deleteShareId} onClose={() => setDeleteShareId(null)} title="Revoke Link" icon="lucide:alert-triangle">
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            Are you sure you want to delete this share link? Anyone with this link will immediately lose access.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="bordered" onClick={() => setDeleteShareId(null)} disabled={shareDeleting}>Cancel</Button>
            <Button variant="danger" onClick={handleShareDelete} disabled={shareDeleting}>
              {shareDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
