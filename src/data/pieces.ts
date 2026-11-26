import { PieceCategory, PieceShape } from '../types';

const b = (rows: number[][]): boolean[][] =>
  rows.map((r) => r.map((v) => v === 1));

export const CATEGORY_LABELS: Record<PieceCategory, string> = {
  garis: 'Titik & Garis',
  kotak: 'Kotak & Tebal',
  siku: 'Siku (Corner)',
  'huruf-l': 'Huruf L & J',
  't-dan-z': 'T, Z, S & Diagonal',
  kustom: 'Kustom',
};

export const PIECE_CATALOG: PieceShape[] = [
  // === GARIS (Titik & Garis) ===
  {
    id: 'dot-1x1',
    name: 'Titik 1×1',
    category: 'garis',
    color: '#38bdf8',
    matrix: b([[1]]),
  },
  {
    id: 'line-1x2',
    name: 'Garis 1×2 (H)',
    category: 'garis',
    color: '#fb923c',
    matrix: b([[1, 1]]),
  },
  {
    id: 'line-2x1',
    name: 'Garis 2×1 (V)',
    category: 'garis',
    color: '#fb923c',
    matrix: b([[1], [1]]),
  },
  {
    id: 'line-1x3',
    name: 'Garis 1×3 (H)',
    category: 'garis',
    color: '#facc15',
    matrix: b([[1, 1, 1]]),
  },
  {
    id: 'line-3x1',
    name: 'Garis 3×1 (V)',
    category: 'garis',
    color: '#facc15',
    matrix: b([[1], [1], [1]]),
  },
  {
    id: 'line-1x4',
    name: 'Garis 1×4 (H)',
    category: 'garis',
    color: '#22d3ee',
    matrix: b([[1, 1, 1, 1]]),
  },
  {
    id: 'line-4x1',
    name: 'Garis 4×1 (V)',
    category: 'garis',
    color: '#22d3ee',
    matrix: b([[1], [1], [1], [1]]),
  },
  {
    id: 'line-1x5',
    name: 'Garis 1×5 (H)',
    category: 'garis',
    color: '#f43f5e',
    matrix: b([[1, 1, 1, 1, 1]]),
  },
  {
    id: 'line-5x1',
    name: 'Garis 5×1 (V)',
    category: 'garis',
    color: '#f43f5e',
    matrix: b([[1], [1], [1], [1], [1]]),
  },

  // === KOTAK & PERSEGI PANJANG ===
  {
    id: 'box-2x2',
    name: 'Kotak 2×2',
    category: 'kotak',
    color: '#4ade80',
    matrix: b([
      [1, 1],
      [1, 1],
    ]),
  },
  {
    id: 'box-3x3',
    name: 'Kotak Besar 3×3',
    category: 'kotak',
    color: '#ef4444',
    matrix: b([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]),
  },
  {
    id: 'rect-2x3',
    name: 'Balok 2×3 (H)',
    category: 'kotak',
    color: '#a855f7',
    matrix: b([
      [1, 1, 1],
      [1, 1, 1],
    ]),
  },
  {
    id: 'rect-3x2',
    name: 'Balok 3×2 (V)',
    category: 'kotak',
    color: '#a855f7',
    matrix: b([
      [1, 1],
      [1, 1],
      [1, 1],
    ]),
  },

  // === SIKU KECIL (2x2 - 3 kotak) & SIKU BESAR (3x3 - 5 kotak) ===
  {
    id: 'corner2-tl',
    name: 'Siku Kecil ┌',
    category: 'siku',
    color: '#34d399',
    matrix: b([
      [1, 1],
      [1, 0],
    ]),
  },
  {
    id: 'corner2-tr',
    name: 'Siku Kecil ┐',
    category: 'siku',
    color: '#34d399',
    matrix: b([
      [1, 1],
      [0, 1],
    ]),
  },
  {
    id: 'corner2-bl',
    name: 'Siku Kecil └',
    category: 'siku',
    color: '#34d399',
    matrix: b([
      [1, 0],
      [1, 1],
    ]),
  },
  {
    id: 'corner2-br',
    name: 'Siku Kecil ┘',
    category: 'siku',
    color: '#34d399',
    matrix: b([
      [0, 1],
      [1, 1],
    ]),
  },
  {
    id: 'corner3-tl',
    name: 'Siku Besar 3×3 ┌',
    category: 'siku',
    color: '#f97316',
    matrix: b([
      [1, 1, 1],
      [1, 0, 0],
      [1, 0, 0],
    ]),
  },
  {
    id: 'corner3-tr',
    name: 'Siku Besar 3×3 ┐',
    category: 'siku',
    color: '#f97316',
    matrix: b([
      [1, 1, 1],
      [0, 0, 1],
      [0, 0, 1],
    ]),
  },
  {
    id: 'corner3-bl',
    name: 'Siku Besar 3×3 └',
    category: 'siku',
    color: '#f97316',
    matrix: b([
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ]),
  },
  {
    id: 'corner3-br',
    name: 'Siku Besar 3×3 ┘',
    category: 'siku',
    color: '#f97316',
    matrix: b([
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ]),
  },

  // === HURUF L & J (4 Kotak - 8 Orientasi) ===
  {
    id: 'l-up-right',
    name: 'Huruf L Tegak',
    category: 'huruf-l',
    color: '#60a5fa',
    matrix: b([
      [1, 0],
      [1, 0],
      [1, 1],
    ]),
  },
  {
    id: 'j-up-left',
    name: 'Huruf J Tegak',
    category: 'huruf-l',
    color: '#60a5fa',
    matrix: b([
      [0, 1],
      [0, 1],
      [1, 1],
    ]),
  },
  {
    id: 'l-inv-left',
    name: 'L Terbalik ┌',
    category: 'huruf-l',
    color: '#60a5fa',
    matrix: b([
      [1, 1],
      [1, 0],
      [1, 0],
    ]),
  },
  {
    id: 'l-inv-right',
    name: 'L Terbalik ┐',
    category: 'huruf-l',
    color: '#60a5fa',
    matrix: b([
      [1, 1],
      [0, 1],
      [0, 1],
    ]),
  },
  {
    id: 'l-flat-tl',
    name: 'L Tidur Kiri-Atas',
    category: 'huruf-l',
    color: '#818cf8',
    matrix: b([
      [1, 1, 1],
      [1, 0, 0],
    ]),
  },
  {
    id: 'l-flat-tr',
    name: 'L Tidur Kanan-Atas',
    category: 'huruf-l',
    color: '#818cf8',
    matrix: b([
      [1, 1, 1],
      [0, 0, 1],
    ]),
  },
  {
    id: 'l-flat-bl',
    name: 'L Tidur Kiri-Bawah',
    category: 'huruf-l',
    color: '#818cf8',
    matrix: b([
      [1, 0, 0],
      [1, 1, 1],
    ]),
  },
  {
    id: 'l-flat-br',
    name: 'L Tidur Kanan-Bawah',
    category: 'huruf-l',
    color: '#818cf8',
    matrix: b([
      [0, 0, 1],
      [1, 1, 1],
    ]),
  },

  // === BENTUK T, Z, S & DIAGONAL ===
  {
    id: 't-up',
    name: 'Huruf T Atas ┴',
    category: 't-dan-z',
    color: '#c084fc',
    matrix: b([
      [0, 1, 0],
      [1, 1, 1],
    ]),
  },
  {
    id: 't-down',
    name: 'Huruf T Bawah ┬',
    category: 't-dan-z',
    color: '#c084fc',
    matrix: b([
      [1, 1, 1],
      [0, 1, 0],
    ]),
  },
  {
    id: 't-right',
    name: 'Huruf T Kanan ├',
    category: 't-dan-z',
    color: '#c084fc',
    matrix: b([
      [1, 0],
      [1, 1],
      [1, 0],
    ]),
  },
  {
    id: 't-left',
    name: 'Huruf T Kiri ┤',
    category: 't-dan-z',
    color: '#c084fc',
    matrix: b([
      [0, 1],
      [1, 1],
      [0, 1],
    ]),
  },
  {
    id: 'z-horiz',
    name: 'Zigzag Z (H)',
    category: 't-dan-z',
    color: '#ec4899',
    matrix: b([
      [1, 1, 0],
      [0, 1, 1],
    ]),
  },
  {
    id: 's-horiz',
    name: 'Zigzag S (H)',
    category: 't-dan-z',
    color: '#ec4899',
    matrix: b([
      [0, 1, 1],
      [1, 1, 0],
    ]),
  },
  {
    id: 'z-vert',
    name: 'Zigzag Z (V)',
    category: 't-dan-z',
    color: '#ec4899',
    matrix: b([
      [0, 1],
      [1, 1],
      [1, 0],
    ]),
  },
  {
    id: 's-vert',
    name: 'Zigzag S (V)',
    category: 't-dan-z',
    color: '#ec4899',
    matrix: b([
      [1, 0],
      [1, 1],
      [0, 1],
    ]),
  },
  {
    id: 'diag-2-backslash',
    name: 'Diagonal 2 \\',
    category: 't-dan-z',
    color: '#fbbf24',
    matrix: b([
      [1, 0],
      [0, 1],
    ]),
  },
  {
    id: 'diag-2-slash',
    name: 'Diagonal 2 /',
    category: 't-dan-z',
    color: '#fbbf24',
    matrix: b([
      [0, 1],
      [1, 0],
    ]),
  },
  {
    id: 'diag-3-backslash',
    name: 'Diagonal 3 \\',
    category: 't-dan-z',
    color: '#f59e0b',
    matrix: b([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]),
  },
  {
    id: 'diag-3-slash',
    name: 'Diagonal 3 /',
    category: 't-dan-z',
    color: '#f59e0b',
    matrix: b([
      [0, 0, 1],
      [0, 1, 0],
      [1, 0, 0],
    ]),
  },
  {
    id: 'plus-5',
    name: 'Tanda Plus +',
    category: 't-dan-z',
    color: '#14b8a6',
    matrix: b([
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ]),
  },
];

/**
 * Trim empty outer rows/columns from a boolean matrix.
 */
export function trimMatrix(matrix: boolean[][]): boolean[][] {
  let minR = Infinity;
  let maxR = -1;
  let minC = Infinity;
  let maxC = -1;

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (maxR === -1) return [];

  const result: boolean[][] = [];
  for (let r = minR; r <= maxR; r++) {
    const row: boolean[] = [];
    for (let c = minC; c <= maxC; c++) {
      row.push(Boolean(matrix[r]?.[c]));
    }
    result.push(row);
  }
  return result;
}

export function matricesEqual(a: boolean[][], bMat: boolean[][]): boolean {
  if (a.length !== bMat.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== bMat[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== bMat[r][c]) return false;
    }
  }
  return true;
}

/**
 * Matches an arbitrary boolean matrix against PIECE_CATALOG, or wraps it as a custom PieceShape.
 */
export function resolvePieceFromMatrix(
  rawMatrix: boolean[][],
  fallbackColor = '#38bdf8'
): PieceShape | null {
  const trimmed = trimMatrix(rawMatrix);
  if (trimmed.length === 0) return null;

  const found = PIECE_CATALOG.find((p) => matricesEqual(p.matrix, trimmed));
  if (found) return found;

  const h = trimmed.length;
  const w = trimmed[0].length;
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `Kustom ${h}×${w}`,
    category: 'kustom',
    color: fallbackColor,
    matrix: trimmed,
  };
}

export function countPieceBlocks(piece: PieceShape): number {
  let count = 0;
  for (const row of piece.matrix) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}
