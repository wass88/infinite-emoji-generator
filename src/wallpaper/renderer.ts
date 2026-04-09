import type { WallpaperGroup, AffineOp, Matrix2D } from './types';

function mod1(x: number): number {
  return ((x % 1) + 1) % 1;
}

/** Convert lattice-space op matrix to world-space matrix via L * M * L^(-1) */
function toWorldMatrix(group: WallpaperGroup, op: AffineOp): Matrix2D {
  const [ax, ay] = group.latticeA;
  const [bx, by] = group.latticeB;
  const det = ax * by - bx * ay;
  const ia = by / det, ib = -bx / det;
  const ic = -ay / det, id = ax / det;
  // T = M * L^(-1)
  const ta = op.a * ia + op.b * ic;
  const tb = op.a * ib + op.b * id;
  const tc = op.c * ia + op.d * ic;
  const td = op.c * ib + op.d * id;
  // Mw = L * T
  return {
    a: ax * ta + bx * tc,
    b: ax * tb + bx * td,
    c: ay * ta + by * tc,
    d: ay * tb + by * td,
  };
}

export interface RenderParams {
  group: WallpaperGroup;
  emojiImg: HTMLImageElement;
  cellSize: number;
  cellAspect: number;
  cellSkew: number;
  emojiSize: number;
  emojiRotation: number;
  viewportWidth: number;
  viewportHeight: number;
  offsetX: number;
  offsetY: number;
  emojiU: number;
  emojiV: number;
}

/** Info about the emoji closest to viewport center */
export interface FocusEmoji {
  cx: number;
  cy: number;
  cellI: number;
  cellJ: number;
}

export function renderTiling(ctx: CanvasRenderingContext2D, params: RenderParams): FocusEmoji | null {
  const {
    group, emojiImg, cellSize, cellAspect, cellSkew, emojiSize, emojiRotation,
    viewportWidth, viewportHeight,
    offsetX, offsetY, emojiU, emojiV,
  } = params;

  const [ax, ay] = group.latticeA;
  const [bx, by] = group.latticeB;
  // Scaled lattice vectors (aspect stretches A, skew tilts B)
  const sax = ax * cellSize * cellAspect, say = ay * cellSize * cellAspect;
  const sbx = (bx + cellSkew) * cellSize, sby = by * cellSize;

  // Precompute world matrices for all ops
  const worldMatrices = group.ops.map(op => toWorldMatrix(group, op));

  // Precompute transformed emoji positions (in lattice coords, wrapped)
  const transformedPositions = group.ops.map(op => [
    mod1(op.a * emojiU + op.b * emojiV + op.tx),
    mod1(op.c * emojiU + op.d * emojiV + op.ty),
  ] as [number, number]);

  // Find cell range covering viewport
  // Inverse lattice: world -> lattice coords
  const det = sax * sby - sbx * say;
  const invA = sby / det, invB = -sbx / det;
  const invC = -say / det, invD = sax / det;

  const corners = [
    [offsetX, offsetY],
    [offsetX + viewportWidth, offsetY],
    [offsetX, offsetY + viewportHeight],
    [offsetX + viewportWidth, offsetY + viewportHeight],
  ];

  let minI = Infinity, maxI = -Infinity;
  let minJ = Infinity, maxJ = -Infinity;
  for (const [wx, wy] of corners) {
    const li = wx * invA + wy * invB;
    const lj = wx * invC + wy * invD;
    minI = Math.min(minI, li);
    maxI = Math.max(maxI, li);
    minJ = Math.min(minJ, lj);
    maxJ = Math.max(maxJ, lj);
  }

  const i0 = Math.floor(minI) - 1;
  const i1 = Math.ceil(maxI) + 1;
  const j0 = Math.floor(minJ) - 1;
  const j1 = Math.ceil(maxJ) + 1;

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  const halfEmoji = emojiSize / 2;
  const midX = viewportWidth / 2;
  const midY = viewportHeight / 2;
  let bestDist = Infinity;
  let focus: FocusEmoji | null = null;

  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      for (let k = 0; k < group.ops.length; k++) {
        const [eu, ev] = transformedPositions[k];
        // World position
        const wx = (i + eu) * sax + (j + ev) * sbx;
        const wy = (i + eu) * say + (j + ev) * sby;
        // Canvas position
        const cx = wx - offsetX;
        const cy = wy - offsetY;

        // Cull if far outside viewport
        if (cx < -emojiSize || cx > viewportWidth + emojiSize ||
            cy < -emojiSize || cy > viewportHeight + emojiSize) {
          continue;
        }

        const m = worldMatrices[k];
        ctx.save();
        ctx.translate(cx, cy);
        ctx.transform(m.a, m.c, m.b, m.d, 0, 0);
        if (emojiRotation) ctx.rotate(emojiRotation);
        ctx.drawImage(emojiImg, -halfEmoji, -halfEmoji, emojiSize, emojiSize);
        ctx.restore();

        // Track the emoji closest to viewport center
        const dx = cx - midX, dy = cy - midY;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          focus = { cx, cy, cellI: i, cellJ: j };
        }
      }
    }
  }

  return focus;
}
