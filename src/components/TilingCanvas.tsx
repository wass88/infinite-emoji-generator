import { useRef, useEffect, useCallback } from 'react';
import { renderTiling } from '../wallpaper/renderer';
import type { FocusEmoji } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';
import { isAspectLocked } from '../wallpaper/groups';

const HANDLE_R = 6;
const HANDLE_HIT = 14;

interface TilingCanvasProps {
  group: WallpaperGroup;
  emojiUrl: string;
  cellSize?: number;
  cellAspect?: number;
  emojiScale?: number;
  emojiU?: number;
  emojiV?: number;
  onScaleChange?: (scale: number) => void;
  onAspectChange?: (aspect: number) => void;
}

type DragMode = 'none' | 'pan' | 'resize' | 'aspect';

export function TilingCanvas({
  group,
  emojiUrl,
  cellSize = 120,
  cellAspect = 1,
  emojiScale = 0.4,
  emojiU = 0.3,
  emojiV = 0.2,
  onScaleChange,
  onAspectChange,
}: TilingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);
  const modeRef = useRef<DragMode>('none');
  const focusRef = useRef<FocusEmoji | null>(null);
  const aspectDragRef = useRef<{ startX: number; startY: number; initAspect: number } | null>(null);

  const emojiSize = cellSize * emojiScale;
  const aspectLocked = isAspectLocked(group);

  // Scaled lattice vectors (same formula as renderer)
  const scaledLattice = useCallback(() => {
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    return {
      sax: ax * cellSize * cellAspect, say: ay * cellSize * cellAspect,
      sbx: bx * cellSize, sby: by * cellSize,
    };
  }, [group, cellSize, cellAspect]);

  /** Cell corner in canvas coords */
  const cellCorner = useCallback((i: number, j: number): [number, number] => {
    const { sax, say, sbx, sby } = scaledLattice();
    return [
      i * sax + j * sbx - offsetRef.current.x,
      i * say + j * sby - offsetRef.current.y,
    ];
  }, [scaledLattice]);

  /** 4 emoji-resize handles */
  const emojiHandles = useCallback((): [number, number][] | null => {
    const f = focusRef.current;
    if (!f) return null;
    const half = emojiSize / 2;
    return [
      [f.cx - half, f.cy - half],
      [f.cx + half, f.cy - half],
      [f.cx + half, f.cy + half],
      [f.cx - half, f.cy + half],
    ];
  }, [emojiSize]);

  /** Cell-aspect handles: 3 corners of focus cell (excluding origin) */
  const aspectHandles = useCallback((): [number, number][] => {
    const f = focusRef.current;
    if (!f || aspectLocked) return [];
    return [
      cellCorner(f.cellI + 1, f.cellJ),     // bottom-right
      cellCorner(f.cellI + 1, f.cellJ + 1), // top-right
      cellCorner(f.cellI, f.cellJ + 1),     // top-left
    ];
  }, [aspectLocked, cellCorner]);

  const drawOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    const f = focusRef.current;
    if (!f) return;

    // --- Emoji resize handles ---
    if (onScaleChange) {
      const half = emojiSize / 2;
      ctx.strokeStyle = 'rgba(37,99,235,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(f.cx - half, f.cy - half, emojiSize, emojiSize);
      ctx.setLineDash([]);

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

    // --- Cell outline + aspect handle ---
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
  }, [emojiSize, emojiHandles, aspectHandles, aspectLocked, cellCorner, onScaleChange, onAspectChange]);

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
      viewportWidth: w,
      viewportHeight: h,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      emojiU,
      emojiV,
    });

    focusRef.current = focus;
    drawOverlay(ctx);
  }, [group, cellSize, cellAspect, emojiScale, emojiU, emojiV, emojiSize, drawOverlay]);

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

    if (onScaleChange && hitEmoji(cx, cy)) {
      modeRef.current = 'resize';
    } else if (onAspectChange && hitAspect(cx, cy)) {
      modeRef.current = 'aspect';
      aspectDragRef.current = { startX: e.clientX, startY: e.clientY, initAspect: cellAspect };
    } else {
      modeRef.current = 'pan';
      panRef.current = {
        startX: e.clientX, startY: e.clientY,
        origX: offsetRef.current.x, origY: offsetRef.current.y,
      };
    }
  }, [onScaleChange, onAspectChange, hitEmoji, hitAspect, cellAspect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (modeRef.current === 'none') {
      if (onScaleChange && hitEmoji(cx, cy)) canvas.style.cursor = 'nwse-resize';
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

    if (modeRef.current === 'aspect' && onAspectChange && aspectDragRef.current) {
      const d = aspectDragRef.current;
      const delta = (e.clientX - d.startX) / 150;
      onAspectChange(Math.max(0.25, Math.min(4, d.initAspect + delta)));
    }
  }, [draw, onScaleChange, onAspectChange, hitEmoji, hitAspect, cellSize]);

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
