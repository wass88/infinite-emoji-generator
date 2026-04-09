import { useRef, useEffect, useCallback } from 'react';
import type { WallpaperGroup } from '../wallpaper/types';
import { isAspectLocked } from '../wallpaper/groups';
import './CellEditor.css';

interface CellEditorProps {
  group: WallpaperGroup;
  emojiUrl: string;
  emojiU: number;
  emojiV: number;
  emojiScale: number;
  cellAspect: number;
  onPositionChange: (u: number, v: number) => void;
  onScaleChange: (scale: number) => void;
  onAspectChange: (aspect: number) => void;
}

const SIZE = 280;
const PAD = 30;
const HANDLE_R = 5;
const HANDLE_HIT = 12;

type DragMode = 'none' | 'move' | 'resize' | 'aspect';

export function CellEditor({
  group, emojiUrl, emojiU, emojiV, emojiScale, cellAspect,
  onPositionChange, onScaleChange, onAspectChange,
}: CellEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const modeRef = useRef<DragMode>('none');
  const aspectDragRef = useRef<{ startX: number; initAspect: number } | null>(null);
  const locked = isAspectLocked(group);

  // Lattice with aspect applied to A direction
  const toWorld = useCallback((u: number, v: number): [number, number] => {
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    return [u * ax * cellAspect + v * bx, u * ay * cellAspect + v * by];
  }, [group, cellAspect]);

  const getTransform = useCallback(() => {
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => toWorld(u, v));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of corners) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const avail = SIZE - 2 * PAD;
    const scale = Math.min(avail / (maxX - minX), avail / (maxY - minY));
    return {
      scale,
      ox: (SIZE - (maxX - minX) * scale) / 2 - minX * scale,
      oy: (SIZE - (maxY - minY) * scale) / 2 - minY * scale,
    };
  }, [toWorld]);

  const toCanvas = useCallback((wx: number, wy: number): [number, number] => {
    const { scale, ox, oy } = getTransform();
    return [wx * scale + ox, wy * scale + oy];
  }, [getTransform]);

  const toLattice = useCallback((cx: number, cy: number): [number, number] => {
    const { scale, ox, oy } = getTransform();
    const wx = (cx - ox) / scale;
    const wy = (cy - oy) / scale;
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    const aax = ax * cellAspect, aay = ay * cellAspect;
    const det = aax * by - bx * aay;
    return [(wx * by - wy * bx) / det, (wy * aax - wx * aay) / det];
  }, [group, cellAspect, getTransform]);

  const emojiPx = useCallback(() => emojiScale * getTransform().scale, [emojiScale, getTransform]);

  /** Emoji corner handles */
  const emojiHandles = useCallback((): [number, number][] => {
    const [cx, cy] = toCanvas(...toWorld(emojiU, emojiV));
    const half = emojiPx() / 2;
    return [
      [cx - half, cy - half], [cx + half, cy - half],
      [cx + half, cy + half], [cx - half, cy + half],
    ];
  }, [toCanvas, toWorld, emojiU, emojiV, emojiPx]);

  /** Cell edge midpoint handles for aspect (right + top) */
  const cellEdgeHandles = useCallback((): [number, number][] => {
    if (locked) return [];
    return [
      toCanvas(...toWorld(1, 0.5)),   // right edge mid
      toCanvas(...toWorld(0.5, 1)),   // top edge mid
    ];
  }, [locked, toCanvas, toWorld]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Cell parallelogram
    const verts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => toCanvas(...toWorld(u, v)));
    ctx.beginPath();
    ctx.moveTo(verts[0][0], verts[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(verts[i][0], verts[i][1]);
    ctx.closePath();
    ctx.fillStyle = '#f8f8f8';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Grid
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const [a0x, a0y] = toCanvas(...toWorld(t, 0));
      const [a1x, a1y] = toCanvas(...toWorld(t, 1));
      ctx.beginPath(); ctx.moveTo(a0x, a0y); ctx.lineTo(a1x, a1y); ctx.stroke();
      const [b0x, b0y] = toCanvas(...toWorld(0, t));
      const [b1x, b1y] = toCanvas(...toWorld(1, t));
      ctx.beginPath(); ctx.moveTo(b0x, b0y); ctx.lineTo(b1x, b1y); ctx.stroke();
    }

    // Cell edge aspect handles (orange)
    const edgeH = cellEdgeHandles();
    for (const [hx, hy] of edgeH) {
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R + 1, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Emoji
    const img = imgRef.current;
    const s = emojiPx();
    const [ecx, ecy] = toCanvas(...toWorld(emojiU, emojiV));
    if (img?.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, ecx - s / 2, ecy - s / 2, s, s);
    }

    // Emoji bounding box
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(ecx - s / 2, ecy - s / 2, s, s);
    ctx.setLineDash([]);

    // Emoji corner handles (blue)
    for (const [hx, hy] of emojiHandles()) {
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    const info = locked
      ? `pos(${emojiU.toFixed(2)}, ${emojiV.toFixed(2)})  size ${(emojiScale * 100).toFixed(0)}%`
      : `pos(${emojiU.toFixed(2)}, ${emojiV.toFixed(2)})  size ${(emojiScale * 100).toFixed(0)}%  ratio ${cellAspect.toFixed(2)}`;
    ctx.fillText(info, 4, SIZE - 4);
  }, [emojiU, emojiV, emojiScale, cellAspect, locked, toCanvas, toWorld, emojiPx, emojiHandles, cellEdgeHandles]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = emojiUrl;
    return () => { img.onload = null; };
  }, [emojiUrl, draw]);

  useEffect(() => { draw(); }, [draw]);

  const hitEmoji = useCallback((cx: number, cy: number): boolean => {
    return emojiHandles().some(
      ([hx, hy]) => Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT,
    );
  }, [emojiHandles]);

  const hitEdge = useCallback((cx: number, cy: number): boolean => {
    return cellEdgeHandles().some(
      ([hx, hy]) => Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT,
    );
  }, [cellEdgeHandles]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (hitEmoji(cx, cy)) {
      modeRef.current = 'resize';
    } else if (hitEdge(cx, cy)) {
      modeRef.current = 'aspect';
      aspectDragRef.current = { startX: e.clientX, initAspect: cellAspect };
    } else {
      modeRef.current = 'move';
    }
  }, [hitEmoji, hitEdge, cellAspect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (modeRef.current === 'none') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (modeRef.current === 'move') {
      let [u, v] = toLattice(cx, cy);
      u = Math.max(0, Math.min(1, u));
      v = Math.max(0, Math.min(1, v));
      onPositionChange(u, v);
    } else if (modeRef.current === 'resize') {
      const [ecx, ecy] = toCanvas(...toWorld(emojiU, emojiV));
      const dist = Math.max(Math.abs(cx - ecx), Math.abs(cy - ecy));
      onScaleChange(Math.max(0.08, Math.min(1.2, (dist * 2) / getTransform().scale)));
    } else if (modeRef.current === 'aspect' && aspectDragRef.current) {
      const d = aspectDragRef.current;
      const delta = (e.clientX - d.startX) / 100;
      onAspectChange(Math.max(0.25, Math.min(4, d.initAspect + delta)));
    }
  }, [toLattice, toCanvas, toWorld, emojiU, emojiV, getTransform, onPositionChange, onScaleChange, onAspectChange]);

  const handlePointerUp = useCallback(() => {
    modeRef.current = 'none';
    aspectDragRef.current = null;
  }, []);

  const handlePointerHover = useCallback((e: React.PointerEvent) => {
    if (modeRef.current !== 'none') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const canvas = canvasRef.current!;
    if (hitEmoji(cx, cy)) canvas.style.cursor = 'nwse-resize';
    else if (hitEdge(cx, cy)) canvas.style.cursor = 'ew-resize';
    else canvas.style.cursor = 'crosshair';
  }, [hitEmoji, hitEdge]);

  return (
    <div className="cell-editor">
      <div className="cell-editor-label">Unit Cell</div>
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE, cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => { handlePointerHover(e); handlePointerMove(e); }}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
