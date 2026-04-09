import type { AffineOp, WallpaperGroup } from './types';

const I: AffineOp = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

const SQRT3_2 = Math.sqrt(3) / 2;

const RECT: [[number, number], [number, number]] = [[1, 0], [0, 1]];
const HEX: [[number, number], [number, number]] = [[1, 0], [0.5, SQRT3_2]];

function op(a: number, b: number, c: number, d: number, tx = 0, ty = 0): AffineOp {
  return { a, b, c, d, tx, ty };
}

// ── Oblique ──

const p1: WallpaperGroup = {
  name: 'p1',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I],
};

const p2: WallpaperGroup = {
  name: 'p2',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I, op(-1, 0, 0, -1, 1, 1)],
};

// ── Rectangular ──

const pm: WallpaperGroup = {
  name: 'pm',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I, op(-1, 0, 0, 1, 1, 0)],
};

const pg: WallpaperGroup = {
  name: 'pg',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I, op(-1, 0, 0, 1, 1, 0.5)],
};

const pmm: WallpaperGroup = {
  name: 'pmm',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I, op(-1, 0, 0, 1, 1, 0), op(1, 0, 0, -1, 0, 1), op(-1, 0, 0, -1, 1, 1)],
};

const pmg: WallpaperGroup = {
  name: 'pmg',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I, op(-1, 0, 0, 1, 0, 0), op(1, 0, 0, -1, 0.5, 0), op(-1, 0, 0, -1, 0.5, 0)],
};

const pgg: WallpaperGroup = {
  name: 'pgg',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [I, op(1, 0, 0, -1, 0.5, 0), op(-1, 0, 0, 1, 0, 0.5), op(-1, 0, 0, -1, 0.5, 0.5)],
};

// ── Centered Rectangular (conventional cell with centering) ──

const cm: WallpaperGroup = {
  name: 'cm',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [
    I,
    op(1, 0, 0, -1, 0, 1),       // mirror at y=0.5
    op(1, 0, 0, 1, 0.5, 0.5),    // centering
    op(1, 0, 0, -1, 0.5, 0.5),   // mirror + centering
  ],
};

const cmm: WallpaperGroup = {
  name: 'cmm',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [
    I,
    op(-1, 0, 0, 1, 1, 0),       // mirror x
    op(1, 0, 0, -1, 0, 1),       // mirror y
    op(-1, 0, 0, -1, 1, 1),      // rot 180
    op(1, 0, 0, 1, 0.5, 0.5),    // centering
    op(-1, 0, 0, 1, 0.5, 0.5),   // mirror x + center
    op(1, 0, 0, -1, 0.5, 0.5),   // mirror y + center
    op(-1, 0, 0, -1, 0.5, 0.5),  // rot 180 + center
  ],
};

// ── Square ──

const p4: WallpaperGroup = {
  name: 'p4',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [
    I,
    op(0, -1, 1, 0, 1, 0),   // R90 about (0.5,0.5)
    op(-1, 0, 0, -1, 1, 1),  // R180
    op(0, 1, -1, 0, 0, 1),   // R270
  ],
};

const p4m: WallpaperGroup = {
  name: 'p4m',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [
    I,
    op(0, -1, 1, 0, 1, 0),    // R90
    op(-1, 0, 0, -1, 1, 1),   // R180
    op(0, 1, -1, 0, 0, 1),    // R270
    op(-1, 0, 0, 1, 1, 0),    // mirror x=0.5
    op(1, 0, 0, -1, 0, 1),    // mirror y=0.5
    op(0, 1, 1, 0, 0, 0),     // mirror y=x
    op(0, -1, -1, 0, 1, 1),   // mirror y=-x+1
  ],
};

const p4g: WallpaperGroup = {
  name: 'p4g',
  latticeA: RECT[0], latticeB: RECT[1],
  ops: [
    I,
    op(0, -1, 1, 0, 0, 0),    // R90 about origin
    op(-1, 0, 0, -1, 0, 0),   // R180 about origin
    op(0, 1, -1, 0, 0, 0),    // R270 about origin
    op(0, 1, 1, 0, 0, 0),     // mirror y=x
    op(-1, 0, 0, 1, 0, 0),    // mirror x=0
    op(0, -1, -1, 0, 0, 0),   // mirror y=-x
    op(1, 0, 0, -1, 0, 0),    // mirror y=0
  ],
};

// ── Hexagonal ──

const p3: WallpaperGroup = {
  name: 'p3',
  latticeA: HEX[0], latticeB: HEX[1],
  ops: [
    I,
    op(-1, -1, 1, 0, 0, 0),  // R120
    op(0, 1, -1, -1, 0, 0),  // R240
  ],
};

const p3m1: WallpaperGroup = {
  name: 'p3m1',
  latticeA: HEX[0], latticeB: HEX[1],
  ops: [
    I,
    op(-1, -1, 1, 0, 0, 0),   // R120
    op(0, 1, -1, -1, 0, 0),   // R240
    op(1, 1, 0, -1, 0, 0),    // mirror across x-axis
    op(-1, 0, 1, 1, 0, 0),    // mirror across 60 deg
    op(0, -1, -1, 0, 0, 0),   // mirror across 120 deg
  ],
};

const p31m: WallpaperGroup = {
  name: 'p31m',
  latticeA: HEX[0], latticeB: HEX[1],
  ops: [
    I,
    op(-1, -1, 1, 0, 0, 0),   // R120
    op(0, 1, -1, -1, 0, 0),   // R240
    op(0, 1, 1, 0, 0, 0),     // mirror across 30 deg
    op(1, 0, -1, -1, 0, 0),   // mirror across 90 deg
    op(-1, -1, 0, 1, 0, 0),   // mirror across 150 deg
  ],
};

const p6: WallpaperGroup = {
  name: 'p6',
  latticeA: HEX[0], latticeB: HEX[1],
  ops: [
    I,
    op(0, -1, 1, 1, 0, 0),    // R60
    op(-1, -1, 1, 0, 0, 0),   // R120
    op(-1, 0, 0, -1, 0, 0),   // R180
    op(0, 1, -1, -1, 0, 0),   // R240
    op(1, 1, -1, 0, 0, 0),    // R300
  ],
};

const p6m: WallpaperGroup = {
  name: 'p6m',
  latticeA: HEX[0], latticeB: HEX[1],
  ops: [
    // 6 rotations
    I,
    op(0, -1, 1, 1, 0, 0),    // R60
    op(-1, -1, 1, 0, 0, 0),   // R120
    op(-1, 0, 0, -1, 0, 0),   // R180
    op(0, 1, -1, -1, 0, 0),   // R240
    op(1, 1, -1, 0, 0, 0),    // R300
    // 6 reflections
    op(1, 1, 0, -1, 0, 0),    // mirror 0 deg
    op(-1, 0, 1, 1, 0, 0),    // mirror 60 deg
    op(0, -1, -1, 0, 0, 0),   // mirror 120 deg
    op(0, 1, 1, 0, 0, 0),     // mirror 30 deg
    op(1, 0, -1, -1, 0, 0),   // mirror 90 deg
    op(-1, -1, 0, 1, 0, 0),   // mirror 150 deg
  ],
};

export const WALLPAPER_GROUPS: WallpaperGroup[] = [
  p1, p2, pm, pg, cm, pmm, pmg, pgg, cmm, p4, p4m, p4g, p3, p3m1, p31m, p6, p6m,
];

export function getGroup(name: string): WallpaperGroup {
  return WALLPAPER_GROUPS.find(g => g.name === name) ?? p1;
}
