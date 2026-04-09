import { useRef, useEffect, useCallback } from 'react';
import type { WallpaperGroup } from '../wallpaper/types';
import './CellEditor.css';

interface CellEditorProps {
  group: WallpaperGroup;
  emojiUrl: string;
  emojiU: number;
  emojiV: number;
  emojiScale: number;
  onPositionChange: (u: number, v: number) => void;
  onScaleChange: (scale: number) => void;
}

const SIZE = 280;
const PAD = 30;
const HANDLE_R = 5;
const HANDLE_HIT = 12;

type DragMode = 'none' | 'move' | 'resize';

export function CellEditor({
  group, emojiUrl, emojiU, emojiV, emojiScale,
  onPositionChange, onScaleChange,
}: CellEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const modeRef = useRef<DragMode>('none');

  const getTransform = useCallback(() => {
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    const corners = [[0, 0], [ax, ay], [ax + bx, ay + by], [bx, by]];
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
  }, [group]);

  const toWorld = useCallback((u: number, v: number): [number, number] => {
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    return [u * ax + v * bx, u * ay + v * by];
  }, [group]);

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
    const det = ax * by - bx * ay;
    return [(wx * by - wy * bx) / det, (wy * ax - wx * ay) / det];
  }, [group, getTransform]);

  /** Emoji display size in canvas pixels */
  const emojiPx = useCallback(() => {
    return emojiScale * getTransform().scale;
  }, [emojiScale, getTransform]);

  /** Corner handle positions (canvas coords) */
  const handlePositions = useCallback((): [number, number][] => {
    const [cx, cy] = toCanvas(...toWorld(emojiU, emojiV));
    const half = emojiPx() / 2;
    return [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx + half, cy + half],
      [cx - half, cy + half],
    ];
  }, [toCanvas, toWorld, emojiU, emojiV, emojiPx]);

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
    const verts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) =>
      toCanvas(...toWorld(u, v)),
    );
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

    // Emoji
    const img = imgRef.current;
    const s = emojiPx();
    const [ecx, ecy] = toCanvas(...toWorld(emojiU, emojiV));

    if (img?.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, ecx - s / 2, ecy - s / 2, s, s);
    }

    // Bounding box
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(ecx - s / 2, ecy - s / 2, s, s);
    ctx.setLineDash([]);

    // Corner handles
    const handles = handlePositions();
    for (const [hx, hy] of handles) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    ctx.fillText(`pos(${emojiU.toFixed(2)}, ${emojiV.toFixed(2)})  size ${(emojiScale * 100).toFixed(0)}%`, 4, SIZE - 4);
  }, [emojiU, emojiV, emojiScale, toCanvas, toWorld, emojiPx, handlePositions]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = emojiUrl;
    return () => { img.onload = null; };
  }, [emojiUrl, draw]);

  useEffect(() => { draw(); }, [draw]);

  const hitTestHandle = useCallback((cx: number, cy: number): boolean => {
    return handlePositions().some(
      ([hx, hy]) => Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT,
    );
  }, [handlePositions]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    modeRef.current = hitTestHandle(cx, cy) ? 'resize' : 'move';
  }, [hitTestHandle]);

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
    } else {
      // Resize: distance from emoji center → new scale
      const [ecx, ecy] = toCanvas(...toWorld(emojiU, emojiV));
      const dist = Math.max(Math.abs(cx - ecx), Math.abs(cy - ecy));
      const newScale = (dist * 2) / getTransform().scale;
      onScaleChange(Math.max(0.08, Math.min(1.2, newScale)));
    }
  }, [toLattice, toCanvas, toWorld, emojiU, emojiV, getTransform, onPositionChange, onScaleChange]);

  const handlePointerUp = useCallback(() => {
    modeRef.current = 'none';
  }, []);

  // Dynamic cursor
  const handlePointerHover = useCallback((e: React.PointerEvent) => {
    if (modeRef.current !== 'none') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const canvas = canvasRef.current!;
    canvas.style.cursor = hitTestHandle(cx, cy) ? 'nwse-resize' : 'crosshair';
  }, [hitTestHandle]);

  return (
    <div className="cell-editor">
      <div className="cell-editor-label">Unit Cell</div>
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE, cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerHover(e);
          handlePointerMove(e);
        }}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
