import { useRef, useEffect, useCallback } from 'react';
import { renderTiling } from '../wallpaper/renderer';
import type { FocusEmoji } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';

const HANDLE_R = 6;
const HANDLE_HIT = 14;

interface TilingCanvasProps {
  group: WallpaperGroup;
  emojiUrl: string;
  cellSize?: number;
  emojiScale?: number;
  emojiU?: number;
  emojiV?: number;
  onScaleChange?: (scale: number) => void;
}

type DragMode = 'none' | 'pan' | 'resize';

export function TilingCanvas({
  group,
  emojiUrl,
  cellSize = 120,
  emojiScale = 0.4,
  emojiU = 0.3,
  emojiV = 0.2,
  onScaleChange,
}: TilingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);
  const modeRef = useRef<DragMode>('none');
  const focusRef = useRef<FocusEmoji | null>(null);

  const emojiSize = cellSize * emojiScale;

  /** Return 4 corner handle positions for the focus emoji */
  const focusHandles = useCallback((): [number, number][] | null => {
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

  const drawHandles = useCallback((ctx: CanvasRenderingContext2D) => {
    const handles = focusHandles();
    if (!handles) return;
    const f = focusRef.current!;
    const half = emojiSize / 2;

    // Dashed bounding box
    ctx.strokeStyle = 'rgba(37,99,235,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(f.cx - half, f.cy - half, emojiSize, emojiSize);
    ctx.setLineDash([]);

    // Corner circles
    for (const [hx, hy] of handles) {
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [focusHandles, emojiSize]);

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
      emojiSize,
      viewportWidth: w,
      viewportHeight: h,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      emojiU,
      emojiV,
    });

    focusRef.current = focus;
    if (onScaleChange) drawHandles(ctx);
  }, [group, cellSize, emojiScale, emojiU, emojiV, emojiSize, drawHandles, onScaleChange]);

  // Load emoji image
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

  const hitHandle = useCallback((cx: number, cy: number): boolean => {
    const handles = focusHandles();
    if (!handles) return false;
    return handles.some(([hx, hy]) =>
      Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT,
    );
  }, [focusHandles]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (onScaleChange && hitHandle(cx, cy)) {
      modeRef.current = 'resize';
    } else {
      modeRef.current = 'pan';
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: offsetRef.current.x,
        origY: offsetRef.current.y,
      };
    }
  }, [onScaleChange, hitHandle]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (modeRef.current === 'none') {
      // Hover cursor
      canvas.style.cursor = (onScaleChange && hitHandle(cx, cy)) ? 'nwse-resize' : 'grab';
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
      const newScale = (dist * 2) / cellSize;
      onScaleChange(Math.max(0.08, Math.min(1.5, newScale)));
    }
  }, [draw, onScaleChange, hitHandle, cellSize]);

  const onPointerUp = useCallback(() => {
    modeRef.current = 'none';
    panRef.current = null;
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
