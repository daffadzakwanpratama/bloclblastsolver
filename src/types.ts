export type Grid8x8 = boolean[][];

export type PieceCategory =
  | 'garis'
  | 'kotak'
  | 'siku'
  | 'huruf-l'
  | 't-dan-z'
  | 'kustom';

export interface PieceShape {
  id: string;
  name: string;
  category: PieceCategory;
  matrix: boolean[][];
  color: string;
}

export type SolverStrategy = 'balanced' | 'survival' | 'combo';

export interface CellCoord {
  r: number;
  c: number;
}

export interface PlacementStep {
  stepNumber: number; // 1, 2, or 3
  slotIndex: number; // 0 (Kiri), 1 (Tengah), 2 (Kanan)
  piece: PieceShape;
  row: number; // Top-left bounding box anchor row (0..7)
  col: number; // Top-left bounding box anchor col (0..7)
  placedCells: CellCoord[];
  boardBefore: Grid8x8;
  boardWithPiece: Grid8x8; // Before line clears happen
  clearedRows: number[];
  clearedCols: number[];
  boardAfter: Grid8x8; // After line clears happen
  linesCleared: number;
  pointsEarned: number;
  comboAfter: number;
}

export interface BoardMetrics {
  emptyCells: number;
  fit3x3Count: number;
  fit1x5Count: number;
  fit5x1Count: number;
  isolatedHoles: number;
  healthPercent: number;
}

export interface SolutionCandidate {
  steps: PlacementStep[];
  finalBoard: Grid8x8;
  totalLinesCleared: number;
  estimatedScore: number;
  finalCombo: number;
  maintainsStreak: boolean;
  metrics: BoardMetrics;
  evaluationScore: number;
}

export interface SolverOutput {
  solved: boolean;
  best: SolutionCandidate | null;
  alternatives: SolutionCandidate[];
  exploredStates: number;
  solveTimeMs: number;
  reason?: string;
}
