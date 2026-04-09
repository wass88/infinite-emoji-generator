import { renderTiling } from '../wallpaper/renderer';
import type { WallpaperGroup } from '../wallpaper/types';

export function exportPng(
  group: WallpaperGroup,
  emojiUrl: string,
  cellSize: number,
  emojiU: number,
  emojiV: number,
  emojiScale = 0.4,
  emojiRotation = 0,
  cellAspect = 1,
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
      emojiSize: cellSize * emojiScale,
      emojiRotation,
      viewportWidth: width,
      viewportHeight: height,
      offsetX: 0,
      offsetY: 0,
      emojiU,
      emojiV,
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infinite-emoji-${group.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  img.src = emojiUrl;
}
