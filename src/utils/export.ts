import { renderTiling } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';

function download(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function exportPng(
  group: WallpaperGroup,
  emojiUrl: string,
  cellSize: number,
  emojiU: number,
  emojiV: number,
  emojiScale = 0.4,
  emojiRotation = 0,
  cellAspect = 1,
  cellSkew = 0,
  width = 1920,
  height = 1080,
): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    renderTiling(ctx, {
      group,
      emojiImg: img,
      cellSize,
      cellAspect,
      cellSkew,
      emojiSize: cellSize * emojiScale,
      emojiRotation,
      viewportWidth: width,
      viewportHeight: height,
      offsetX: 0,
      offsetY: 0,
      emojiU,
      emojiV,
    });

    download(canvas, `infinite-emoji-${group.name}.png`);
  };
  img.src = emojiUrl;
}

/** Export a single unit cell as PNG */
export function exportCell(
  group: WallpaperGroup,
  emojiUrl: string,
  cellSize: number,
  emojiU: number,
  emojiV: number,
  emojiScale = 0.4,
  emojiRotation = 0,
  cellAspect = 1,
  cellSkew = 0,
): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const [ax, ay] = group.latticeA;
    const [bx, by] = group.latticeB;
    const sax = ax * cellSize * cellAspect, say = ay * cellSize * cellAspect;
    const sbx = (bx + cellSkew) * cellSize, sby = by * cellSize;

    // Bounding box of one cell
    const xs = [0, sax, sax + sbx, sbx];
    const ys = [0, say, say + sby, sby];
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = Math.ceil(maxX - minX);
    const h = Math.ceil(maxY - minY);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Render a 3x3 grid centered on (0,0) cell, offset so cell fits in canvas
    renderTiling(ctx, {
      group,
      emojiImg: img,
      cellSize,
      cellAspect,
      cellSkew,
      emojiSize: cellSize * emojiScale,
      emojiRotation,
      viewportWidth: w,
      viewportHeight: h,
      offsetX: minX,
      offsetY: minY,
      emojiU,
      emojiV,
    });

    // Clip to parallelogram
    const clipped = document.createElement('canvas');
    clipped.width = w;
    clipped.height = h;
    const cctx = clipped.getContext('2d')!;
    cctx.beginPath();
    cctx.moveTo(-minX, -minY);
    cctx.lineTo(sax - minX, say - minY);
    cctx.lineTo(sax + sbx - minX, say + sby - minY);
    cctx.lineTo(sbx - minX, sby - minY);
    cctx.closePath();
    cctx.clip();
    cctx.drawImage(canvas, 0, 0);

    download(clipped, `cell-${group.name}.png`);
  };
  img.src = emojiUrl;
}
