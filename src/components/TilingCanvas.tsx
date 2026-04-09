import { useRef, useEffect, useCallback } from 'react';
import { renderTiling } from '../wallpaper/renderer';
import type { FocusEmoji } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';
import { isAspectLocked } from '../wallpaper/groups';

const HANDLE_R = 6;
const HANDLE_HIT = 14;
const STEM_LEN = 24;

interface TilingCanvasProps {
  group: WallpaperGroup;
  emojiUrl: string;
  cellSize?: number;
  cellAspect?: number;
  emojiScale?: number;
  emojiRotation?: number;
  emojiU?: number;
  emojiV?: number;
  onScaleChange?: (scale: number) => void;
  onRotationChange?: (rot: number) => void;
  onAspectChange?: (aspect: number) => void;
}

type DragMode = 'none' | 'pan' | 'resize' | 'rotate' | 'aspect';

export function TilingCanvas({
  group,
  emojiUrl,
  cellSize = 120,
  cellAspect = 1,
  emojiScale = 0.4,
  emojiRotation = 0,
  emojiU = 0.3,
  emojiV = 0.2,
  onScaleChange,
  onRotationChange,
  onAspectChange,
}: TilingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);
  const modeRef = useRef<DragMode>('none');
  const focusRef = useRef<FocusEmoji | null>(null);
  const aspectDragRef = useRef<{ startX: number; initAspect: number } | null>(null);

  const emojiSize = cellSize * emojiScale;
  const aspectLocked = isAspectLocked(group);

  const scaledLattice = useCallback(() => {
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    return {
      sax: ax * cellSize * cellAspect, say: ay * cellSize * cellAspect,
      sbx: bx * cellSize, sby: by * cellSize,
    };
  }, [group, cellSize, cellAspect]);

  const cellCorner = useCallback((i: number, j: number): [number, number] => {
    const { sax, say, sbx, sby } = scaledLattice();
    return [
      i * sax + j * sbx - offsetRef.current.x,
      i * say + j * sby - offsetRef.current.y,
    ];
  }, [scaledLattice]);

  /** Emoji resize handles (rotated) */
  const emojiHandles = useCallback((): [number, number][] | null => {
    const f = focusRef.current;
    if (!f) return null;
    const half = emojiSize / 2;
    const cos = Math.cos(emojiRotation), sin = Math.sin(emojiRotation);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const lx = sx * half, ly = sy * half;
      return [f.cx + lx * cos - ly * sin, f.cy + lx * sin + ly * cos] as [number, number];
    });
  }, [emojiSize, emojiRotation]);

  /** Rotation stem handle */
  const stemHandle = useCallback((): [number, number] | null => {
    const f = focusRef.current;
    if (!f) return null;
    const dist = emojiSize / 2 + STEM_LEN;
    return [f.cx - Math.sin(emojiRotation) * dist, f.cy - Math.cos(emojiRotation) * dist];
  }, [emojiSize, emojiRotation]);

  const stemBase = useCallback((): [number, number] | null => {
    const f = focusRef.current;
    if (!f) return null;
    const half = emojiSize / 2;
    return [f.cx - Math.sin(emojiRotation) * half, f.cy - Math.cos(emojiRotation) * half];
  }, [emojiSize, emojiRotation]);

  const aspectHandles = useCallback((): [number, number][] => {
    const f = focusRef.current;
    if (!f || aspectLocked) return [];
    return [
      cellCorner(f.cellI + 1, f.cellJ),
      cellCorner(f.cellI + 1, f.cellJ + 1),
      cellCorner(f.cellI, f.cellJ + 1),
    ];
  }, [aspectLocked, cellCorner]);

  const drawOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    const f = focusRef.current;
    if (!f) return;

    // --- Emoji bounding box + resize handles (rotated) ---
    if (onScaleChange) {
      const half = emojiSize / 2;
      ctx.save();
      ctx.translate(f.cx, f.cy);
      ctx.rotate(emojiRotation);
      ctx.strokeStyle = 'rgba(37,99,235,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-half, -half, emojiSize, emojiSize);
      ctx.setLineDash([]);
      ctx.restore();

      const eHandles = emojiHandles();
      if (eHandles) {
        for (const [hx, hy] of eHandles) {
          ctx.beginPath();
          ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // --- Rotation stem (green) ---
    if (onRotationChange) {
      const sb = stemBase();
      const sh = stemHandle();
      if (sb && sh) {
        ctx.beginPath();
        ctx.moveTo(sb[0], sb[1]);
        ctx.lineTo(sh[0], sh[1]);
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sh[0], sh[1], HANDLE_R, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }

    // --- Cell outline + aspect handles (orange) ---
    if (!aspectLocked && onAspectChange) {
      const corners = [
        cellCorner(f.cellI, f.cellJ),
        cellCorner(f.cellI + 1, f.cellJ),
        cellCorner(f.cellI + 1, f.cellJ + 1),
        cellCorner(f.cellI, f.cellJ + 1),
      ];
      ctx.beginPath();
      ctx.moveTo(corners[0][0], corners[0][1]);
      for (let k = 1; k < 4; k++) ctx.lineTo(corners[k][0], corners[k][1]);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(234,88,12,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const [hx, hy] of aspectHandles()) {
        ctx.beginPath();
        ctx.arc(hx, hy, HANDLE_R + 1, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [emojiSize, emojiRotation, emojiHandles, stemBase, stemHandle,
    aspectHandles, aspectLocked, cellCorner, onScaleChange, onRotationChange, onAspectChange]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const focus = renderTiling(ctx, {
      group,
      emojiImg: img,
      cellSize,
      cellAspect,
      emojiSize,
      emojiRotation,
      viewportWidth: w,
      viewportHeight: h,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      emojiU,
      emojiV,
    });

    focusRef.current = focus;
    drawOverlay(ctx);
  }, [group, cellSize, cellAspect, emojiScale, emojiRotation, emojiU, emojiV, emojiSize, drawOverlay]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = emojiUrl;
    return () => { img.onload = null; };
  }, [emojiUrl, draw]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const hitEmoji = useCallback((cx: number, cy: number): boolean => {
    const handles = emojiHandles();
    if (!handles) return false;
    return handles.some(([hx, hy]) =>
      Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT);
  }, [emojiHandles]);

  const hitStem = useCallback((cx: number, cy: number): boolean => {
    const sh = stemHandle();
    if (!sh) return false;
    return Math.abs(cx - sh[0]) < HANDLE_HIT && Math.abs(cy - sh[1]) < HANDLE_HIT;
  }, [stemHandle]);

  const hitAspect = useCallback((cx: number, cy: number): boolean => {
    return aspectHandles().some(([hx, hy]) =>
      Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT);
  }, [aspectHandles]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (onRotationChange && hitStem(cx, cy)) {
      modeRef.current = 'rotate';
    } else if (onScaleChange && hitEmoji(cx, cy)) {
      modeRef.current = 'resize';
    } else if (onAspectChange && hitAspect(cx, cy)) {
      modeRef.current = 'aspect';
      aspectDragRef.current = { startX: e.clientX, initAspect: cellAspect };
    } else {
      modeRef.current = 'pan';
      panRef.current = {
        startX: e.clientX, startY: e.clientY,
        origX: offsetRef.current.x, origY: offsetRef.current.y,
      };
    }
  }, [onScaleChange, onRotationChange, onAspectChange, hitEmoji, hitStem, hitAspect, cellAspect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (modeRef.current === 'none') {
      if (onRotationChange && hitStem(cx, cy)) canvas.style.cursor = 'grab';
      else if (onScaleChange && hitEmoji(cx, cy)) canvas.style.cursor = 'nwse-resize';
      else if (onAspectChange && hitAspect(cx, cy)) canvas.style.cursor = 'ew-resize';
      else canvas.style.cursor = 'grab';
      return;
    }

    if (modeRef.current === 'pan' && panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      offsetRef.current.x = panRef.current.origX - dx;
      offsetRef.current.y = panRef.current.origY - dy;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }

    if (modeRef.current === 'resize' && onScaleChange && focusRef.current) {
      const f = focusRef.current;
      const dist = Math.max(Math.abs(cx - f.cx), Math.abs(cy - f.cy));
      onScaleChange(Math.max(0.08, Math.min(1.5, (dist * 2) / cellSize)));
    }

    if (modeRef.current === 'rotate' && onRotationChange && focusRef.current) {
      const f = focusRef.current;
      onRotationChange(Math.atan2(cx - f.cx, -(cy - f.cy)));
    }

    if (modeRef.current === 'aspect' && onAspectChange && aspectDragRef.current) {
      const d = aspectDragRef.current;
      const delta = (e.clientX - d.startX) / 150;
      onAspectChange(Math.max(0.25, Math.min(4, d.initAspect + delta)));
    }
  }, [draw, onScaleChange, onRotationChange, onAspectChange, hitEmoji, hitStem, hitAspect, cellSize]);

  const onPointerUp = useCallback(() => {
    modeRef.current = 'none';
    panRef.current = null;
    aspectDragRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
