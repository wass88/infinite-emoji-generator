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
  emojiRotation: number;
  cellAspect: number;
  onPositionChange: (u: number, v: number) => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rot: number) => void;
  onAspectChange: (aspect: number) => void;
}

const SIZE = 280;
const PAD = 30;
const HANDLE_R = 5;
const HANDLE_HIT = 12;
const STEM_LEN = 22;

type DragMode = 'none' | 'move' | 'resize' | 'rotate' | 'aspect';

export function CellEditor({
  group, emojiUrl, emojiU, emojiV, emojiScale, emojiRotation, cellAspect,
  onPositionChange, onScaleChange, onRotationChange, onAspectChange,
}: CellEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const modeRef = useRef<DragMode>('none');
  const aspectDragRef = useRef<{ startX: number; initAspect: number } | null>(null);
  const locked = isAspectLocked(group);

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

  const emojiCenter = useCallback((): [number, number] =>
    toCanvas(...toWorld(emojiU, emojiV)), [toCanvas, toWorld, emojiU, emojiV]);

  /** Emoji resize corner handles (rotated with emoji) */
  const emojiHandles = useCallback((): [number, number][] => {
    const [cx, cy] = emojiCenter();
    const half = emojiPx() / 2;
    const cos = Math.cos(emojiRotation), sin = Math.sin(emojiRotation);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const lx = sx * half, ly = sy * half;
      return [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos] as [number, number];
    });
  }, [emojiCenter, emojiPx, emojiRotation]);

  /** Rotation stem handle position */
  const stemHandle = useCallback((): [number, number] => {
    const [cx, cy] = emojiCenter();
    const dist = emojiPx() / 2 + STEM_LEN;
    return [cx + Math.sin(emojiRotation) * (-dist), cy + Math.cos(emojiRotation) * (dist)];
    // "up" in screen coords is -y, but canvas y grows downward
  }, [emojiCenter, emojiPx, emojiRotation]);

  /** Stem base (top center of rotated emoji) */
  const stemBase = useCallback((): [number, number] => {
    const [cx, cy] = emojiCenter();
    const half = emojiPx() / 2;
    return [cx - Math.sin(emojiRotation) * half, cy - Math.cos(emojiRotation) * (-half)];
  }, [emojiCenter, emojiPx, emojiRotation]);

  /** Cell corner handles for aspect */
  const cellCornerHandles = useCallback((): [number, number][] => {
    if (locked) return [];
    return [
      toCanvas(...toWorld(1, 0)),
      toCanvas(...toWorld(1, 1)),
      toCanvas(...toWorld(0, 1)),
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

    // Cell corner aspect handles (orange)
    for (const [hx, hy] of cellCornerHandles()) {
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R + 1, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Emoji (rotated)
    const img = imgRef.current;
    const s = emojiPx();
    const [ecx, ecy] = emojiCenter();
    if (img?.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.translate(ecx, ecy);
      ctx.rotate(emojiRotation);
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
      ctx.restore();
    }

    // Bounding box (rotated)
    ctx.save();
    ctx.translate(ecx, ecy);
    ctx.rotate(emojiRotation);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.setLineDash([]);
    ctx.restore();

    // Resize corner handles (blue)
    for (const [hx, hy] of emojiHandles()) {
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }

    // Rotation stem + handle (green)
    const [bx, by] = stemBase();
    const [shx, shy] = stemHandle();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(shx, shy);
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(shx, shy, HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    const deg = ((emojiRotation * 180 / Math.PI) % 360 + 360) % 360;
    ctx.fillText(`${deg.toFixed(0)}\u00b0  ${(emojiScale * 100).toFixed(0)}%`, 4, SIZE - 4);
  }, [emojiU, emojiV, emojiScale, emojiRotation, cellAspect, locked,
    toCanvas, toWorld, emojiPx, emojiCenter, emojiHandles, stemBase, stemHandle, cellCornerHandles]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = emojiUrl;
    return () => { img.onload = null; };
  }, [emojiUrl, draw]);

  useEffect(() => { draw(); }, [draw]);

  const hitEmoji = useCallback((cx: number, cy: number): boolean =>
    emojiHandles().some(([hx, hy]) => Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT),
  [emojiHandles]);

  const hitStem = useCallback((cx: number, cy: number): boolean => {
    const [hx, hy] = stemHandle();
    return Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT;
  }, [stemHandle]);

  const hitCell = useCallback((cx: number, cy: number): boolean =>
    cellCornerHandles().some(([hx, hy]) => Math.abs(cx - hx) < HANDLE_HIT && Math.abs(cy - hy) < HANDLE_HIT),
  [cellCornerHandles]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (hitStem(cx, cy)) {
      modeRef.current = 'rotate';
    } else if (hitEmoji(cx, cy)) {
      modeRef.current = 'resize';
    } else if (hitCell(cx, cy)) {
      modeRef.current = 'aspect';
      aspectDragRef.current = { startX: e.clientX, initAspect: cellAspect };
    } else {
      modeRef.current = 'move';
    }
  }, [hitStem, hitEmoji, hitCell, cellAspect]);

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
      const [ecx, ecy] = emojiCenter();
      const dist = Math.max(Math.abs(cx - ecx), Math.abs(cy - ecy));
      onScaleChange(Math.max(0.08, Math.min(1.2, (dist * 2) / getTransform().scale)));
    } else if (modeRef.current === 'rotate') {
      const [ecx, ecy] = emojiCenter();
      onRotationChange(Math.atan2(cx - ecx, -(cy - ecy)));
    } else if (modeRef.current === 'aspect' && aspectDragRef.current) {
      const d = aspectDragRef.current;
      const delta = (e.clientX - d.startX) / 100;
      onAspectChange(Math.max(0.25, Math.min(4, d.initAspect + delta)));
    }
  }, [toLattice, emojiCenter, getTransform, onPositionChange, onScaleChange, onRotationChange, onAspectChange]);

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
    if (hitStem(cx, cy)) canvas.style.cursor = 'grab';
    else if (hitEmoji(cx, cy)) canvas.style.cursor = 'nwse-resize';
    else if (hitCell(cx, cy)) canvas.style.cursor = 'ew-resize';
    else canvas.style.cursor = 'crosshair';
  }, [hitStem, hitEmoji, hitCell]);

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
