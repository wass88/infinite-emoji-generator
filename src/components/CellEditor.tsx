import { useRef, useEffect, useCallback } from 'react';
import type { WallpaperGroup } from '../wallpaper/types';
import './CellEditor.css';

interface CellEditorProps {
  group: WallpaperGroup;
  emojiUrl: string;
  emojiU: number;
  emojiV: number;
  onPositionChange: (u: number, v: number) => void;
}

const SIZE = 280;
const PAD = 30;

export function CellEditor({ group, emojiUrl, emojiU, emojiV, onPositionChange }: CellEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const draggingRef = useRef(false);

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
    if (img?.complete && img.naturalWidth > 0) {
      const [cx, cy] = toCanvas(...toWorld(emojiU, emojiV));
      const s = 36;
      ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
    }

    // Coordinate label
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    ctx.fillText(`(${emojiU.toFixed(2)}, ${emojiV.toFixed(2)})`, 4, SIZE - 4);
  }, [emojiU, emojiV, toCanvas, toWorld]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = emojiUrl;
    return () => { img.onload = null; };
  }, [emojiUrl, draw]);

  useEffect(() => { draw(); }, [draw]);

  const handlePointer = useCallback(
    (e: React.PointerEvent, down?: boolean) => {
      if (down) {
        draggingRef.current = true;
        canvasRef.current?.setPointerCapture(e.pointerId);
      }
      if (!draggingRef.current) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      let [u, v] = toLattice(e.clientX - rect.left, e.clientY - rect.top);
      u = Math.max(0, Math.min(1, u));
      v = Math.max(0, Math.min(1, v));
      onPositionChange(u, v);
    },
    [toLattice, onPositionChange],
  );

  return (
    <div className="cell-editor">
      <div className="cell-editor-label">Unit Cell</div>
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE, cursor: 'crosshair' }}
        onPointerDown={(e) => handlePointer(e, true)}
        onPointerMove={handlePointer}
        onPointerUp={() => { draggingRef.current = false; }}
        onPointerCancel={() => { draggingRef.current = false; }}
      />
    </div>
  );
}
