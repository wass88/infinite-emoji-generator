import { useRef, useEffect, useCallback } from 'react';
import { renderTiling } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';

interface TilingCanvasProps {
  group: WallpaperGroup;
  emojiUrl: string;
  cellSize?: number;
  emojiScale?: number;
  emojiU?: number;
  emojiV?: number;
}

export function TilingCanvas({
  group,
  emojiUrl,
  cellSize = 120,
  emojiScale = 0.4,
  emojiU = 0.3,
  emojiV = 0.2,
}: TilingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef(0);

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
      emojiSize: cellSize * emojiScale,
      viewportWidth: w,
      viewportHeight: h,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      emojiU,
      emojiV,
    });
  }, [group, cellSize, emojiScale, emojiU, emojiV]);

  // Load emoji image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = emojiUrl;
    return () => { img.onload = null; };
  }, [emojiUrl, draw]);

  // Redraw on group/size/position change
  useEffect(() => { draw(); }, [draw]);

  // Handle resize
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // Mouse pan
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offsetRef.current.x,
      origY: offsetRef.current.y,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    offsetRef.current.x = dragRef.current.origX - dx;
    offsetRef.current.y = dragRef.current.origY - dy;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
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
