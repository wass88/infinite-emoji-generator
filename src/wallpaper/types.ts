/** Affine operation in lattice coordinates: (u,v) -> (a*u + b*v + tx, c*u + d*v + ty) */
export interface AffineOp {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface WallpaperGroup {
  name: string;
  /** Lattice vector a (world coords, unit scale) */
  latticeA: [number, number];
  /** Lattice vector b (world coords, unit scale) */
  latticeB: [number, number];
  /** Symmetry operations in lattice coordinates */
  ops: AffineOp[];
}

/** 2x2 matrix in world coordinates */
export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
}
