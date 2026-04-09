import { useRef, useEffect, useCallback } from 'react';
import { renderTiling } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';

interface TilingCanvasProps {
  group: WallpaperGroup;
  emojiUrl: string;
  cellSize?: number;
  cellAspect?: number;
  cellSkew?: number;
  emojiScale?: number;
  emojiRotation?: number;
  emojiU?: number;
  emojiV?: number;
}

export function TilingCanvas({
  group,
  emojiUrl,
  cellSize = 120,
  cellAspect = 1,
  cellSkew = 0,
  emojiScale = 0.4,
  emojiRotation = 0,
  emojiU = 0.3,
  emojiV = 0.2,
}: TilingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);

  const emojiSize = cellSize * emojiScale;

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

    renderTiling(ctx, {
      group,
      emojiImg: img,
      cellSize,
      cellAspect,
      cellSkew,
      emojiSize,
      emojiRotation,
      viewportWidth: w,
      viewportHeight: h,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      emojiU,
      emojiV,
    });
  }, [group, cellSize, cellAspect, cellSkew, emojiScale, emojiRotation, emojiU, emojiV, emojiSize]);

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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      origX: offsetRef.current.x, origY: offsetRef.current.y,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    offsetRef.current.x = dragRef.current.origX - (e.clientX - dragRef.current.startX);
    offsetRef.current.y = dragRef.current.origY - (e.clientY - dragRef.current.startY);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

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
