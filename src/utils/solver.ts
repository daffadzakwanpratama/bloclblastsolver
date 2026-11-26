import {
  BoardMetrics,
  CellCoord,
  Grid8x8,
  PieceShape,
  PlacementStep,
  SolutionCandidate,
  SolverOutput,
  SolverStrategy,
} from '../types';
import { countPieceBlocks, matricesEqual } from '../data/pieces';

// Precomputed 8-bit lookup tables for ultra-fast bitboard evaluation
const POPCOUNT8 = new Uint8Array(256);
const ROW_H_TRANSITIONS = new Uint8Array(256);
const ROW_SPAN3_COUNT = new Uint8Array(256);
const ROW_SPAN5_COUNT = new Uint8Array(256);

for (let b = 0; b < 256; b++) {
  // Popcount
  let cnt = 0;
  for (let i = 0; i < 8; i++) {
    if ((b >>> i) & 1) cnt++;
  }
  POPCOUNT8[b] = cnt;

  // Horizontal transitions (walls at bit -1 and bit 8 treated as occupied = 1)
  let trans = 0;
  let prev = 1; // left wall occupied
  for (let i = 0; i < 8; i++) {
    const cur = (b >>> i) & 1;
    if (cur !== prev) trans++;
    prev = cur;
  }
  if (prev !== 1) trans++; // right wall occupied
  ROW_H_TRANSITIONS[b] = trans;

  // Count 3-wide empty runs (000) in 8-bit row
  let s3 = 0;
  for (let c = 0; c <= 5; c++) {
    if (((b >>> c) & 0b111) === 0) s3++;
  }
  ROW_SPAN3_COUNT[b] = s3;

  // Count 5-wide empty runs (00000) in 8-bit row
  let s5 = 0;
  for (let c = 0; c <= 3; c++) {
    if (((b >>> c) & 0b11111) === 0) s5++;
  }
  ROW_SPAN5_COUNT[b] = s5;
}

interface PrecomputedPlacement {
  row: number;
  col: number;
  pLo: number;
  pHi: number;
}

interface ActiveSlot {
  slotIndex: number;
  piece: PieceShape;
  blockCount: number;
  placements: PrecomputedPlacement[];
}

interface StepRecord {
  slotArrayIdx: number;
  placementIdx: number;
  linesCleared: number;
  comboAfter: number;
  pointsEarned: number;
  afterLo: number;
  afterHi: number;
}

export function createEmptyBoard(): Grid8x8 {
  return Array.from({ length: 8 }, () => Array(8).fill(false));
}

export function cloneBoard(board: Grid8x8): Grid8x8 {
  return board.map((row) => [...row]);
}

export function gridToBitboard(grid: Grid8x8): [number, number] {
  let lo = 0;
  let hi = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      if (grid[r]?.[c]) lo |= 1 << (r * 8 + c);
    }
  }
  for (let r = 4; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grid[r]?.[c]) hi |= 1 << ((r - 4) * 8 + c);
    }
  }
  return [lo, hi];
}

export function bitboardToGrid(lo: number, hi: number): Grid8x8 {
  const grid = createEmptyBoard();
  for (let r = 0; r < 4; r++) {
    const b = (lo >>> (r * 8)) & 0xff;
    for (let c = 0; c < 8; c++) {
      grid[r][c] = ((b >>> c) & 1) === 1;
    }
  }
  for (let r = 4; r < 8; r++) {
    const b = (hi >>> ((r - 4) * 8)) & 0xff;
    for (let c = 0; c < 8; c++) {
      grid[r][c] = ((b >>> c) & 1) === 1;
    }
  }
  return grid;
}

function precomputePlacements(piece: PieceShape): PrecomputedPlacement[] {
  const h = piece.matrix.length;
  const w = piece.matrix[0]?.length ?? 0;
  if (h === 0 || w === 0 || h > 8 || w > 8) return [];

  const list: PrecomputedPlacement[] = [];
  for (let r0 = 0; r0 <= 8 - h; r0++) {
    for (let c0 = 0; c0 <= 8 - w; c0++) {
      let pLo = 0;
      let pHi = 0;
      for (let dr = 0; dr < h; dr++) {
        for (let dc = 0; dc < w; dc++) {
          if (piece.matrix[dr][dc]) {
            const r = r0 + dr;
            const c = c0 + dc;
            if (r < 4) {
              pLo |= 1 << (r * 8 + c);
            } else {
              pHi |= 1 << ((r - 4) * 8 + c);
            }
          }
        }
      }
      list.push({ row: r0, col: c0, pLo, pHi });
    }
  }
  return list;
}

/**
 * Simulates placing (pLo, pHi) onto (boardLo, boardHi) and clearing completed rows & columns simultaneously.
 */
function applyBitMove(
  boardLo: number,
  boardHi: number,
  pLo: number,
  pHi: number
): [number, number, number] {
  const nLo = boardLo | pLo;
  const nHi = boardHi | pHi;

  let rowClearLo = 0;
  let rowClearHi = 0;
  let lines = 0;

  if ((nLo & 0x000000ff) === 0x000000ff) {
    rowClearLo |= 0x000000ff;
    lines++;
  }
  if ((nLo & 0x0000ff00) === 0x0000ff00) {
    rowClearLo |= 0x0000ff00;
    lines++;
  }
  if ((nLo & 0x00ff0000) === 0x00ff0000) {
    rowClearLo |= 0x00ff0000;
    lines++;
  }
  if (((nLo >>> 24) & 0xff) === 0xff) {
    rowClearLo |= 0xff000000;
    lines++;
  }

  if ((nHi & 0x000000ff) === 0x000000ff) {
    rowClearHi |= 0x000000ff;
    lines++;
  }
  if ((nHi & 0x0000ff00) === 0x0000ff00) {
    rowClearHi |= 0x0000ff00;
    lines++;
  }
  if ((nHi & 0x00ff0000) === 0x00ff0000) {
    rowClearHi |= 0x00ff0000;
    lines++;
  }
  if (((nHi >>> 24) & 0xff) === 0xff) {
    rowClearHi |= 0xff000000;
    lines++;
  }

  const fullColsByte =
    nLo &
    (nLo >>> 8) &
    (nLo >>> 16) &
    (nLo >>> 24) &
    nHi &
    (nHi >>> 8) &
    (nHi >>> 16) &
    (nHi >>> 24) &
    0xff;

  let afterLo = nLo & ~rowClearLo;
  let afterHi = nHi & ~rowClearHi;

  if (fullColsByte !== 0) {
    lines += POPCOUNT8[fullColsByte];
    const colMask32 = Math.imul(fullColsByte, 0x01010101);
    afterLo &= ~colMask32;
    afterHi &= ~colMask32;
  }

  return [afterLo, afterHi, lines];
}

export function computeBoardMetrics(lo: number, hi: number): BoardMetrics {
  const r0 = lo & 0xff;
  const r1 = (lo >>> 8) & 0xff;
  const r2 = (lo >>> 16) & 0xff;
  const r3 = (lo >>> 24) & 0xff;
  const r4 = hi & 0xff;
  const r5 = (hi >>> 8) & 0xff;
  const r6 = (hi >>> 16) & 0xff;
  const r7 = (hi >>> 24) & 0xff;

  const rows = [r0, r1, r2, r3, r4, r5, r6, r7];

  const occupied =
    POPCOUNT8[r0] +
    POPCOUNT8[r1] +
    POPCOUNT8[r2] +
    POPCOUNT8[r3] +
    POPCOUNT8[r4] +
    POPCOUNT8[r5] +
    POPCOUNT8[r6] +
    POPCOUNT8[r7];

  const emptyCells = 64 - occupied;

  const fit3x3Count =
    ROW_SPAN3_COUNT[r0 | r1 | r2] +
    ROW_SPAN3_COUNT[r1 | r2 | r3] +
    ROW_SPAN3_COUNT[r2 | r3 | r4] +
    ROW_SPAN3_COUNT[r3 | r4 | r5] +
    ROW_SPAN3_COUNT[r4 | r5 | r6] +
    ROW_SPAN3_COUNT[r5 | r6 | r7];

  const fit1x5Count =
    ROW_SPAN5_COUNT[r0] +
    ROW_SPAN5_COUNT[r1] +
    ROW_SPAN5_COUNT[r2] +
    ROW_SPAN5_COUNT[r3] +
    ROW_SPAN5_COUNT[r4] +
    ROW_SPAN5_COUNT[r5] +
    ROW_SPAN5_COUNT[r6] +
    ROW_SPAN5_COUNT[r7];

  const fit5x1Count =
    (8 - POPCOUNT8[r0 | r1 | r2 | r3 | r4]) +
    (8 - POPCOUNT8[r1 | r2 | r3 | r4 | r5]) +
    (8 - POPCOUNT8[r2 | r3 | r4 | r5 | r6]) +
    (8 - POPCOUNT8[r3 | r4 | r5 | r6 | r7]);

  let isolatedHoles = 0;
  let transitions = 0;
  for (let i = 0; i < 8; i++) {
    const cur = rows[i];
    const up = i === 0 ? 0xff : rows[i - 1];
    const down = i === 7 ? 0xff : rows[i + 1];
    const leftOcc = ((cur << 1) | 1) & 0xff;
    const rightOcc = ((cur >>> 1) | 0x80) & 0xff;
    const empty = ~cur & 0xff;
    const trapped4 = empty & leftOcc & rightOcc & up & down;
    isolatedHoles += POPCOUNT8[trapped4];
    transitions += ROW_H_TRANSITIONS[cur];
  }
  transitions +=
    POPCOUNT8[~r0 & 0xff] +
    POPCOUNT8[r0 ^ r1] +
    POPCOUNT8[r1 ^ r2] +
    POPCOUNT8[r2 ^ r3] +
    POPCOUNT8[r3 ^ r4] +
    POPCOUNT8[r4 ^ r5] +
    POPCOUNT8[r5 ^ r6] +
    POPCOUNT8[r6 ^ r7] +
    POPCOUNT8[~r7 & 0xff];

  // Health percentage (0..100)
  let rawHealth =
    (emptyCells / 64) * 58 +
    Math.min(fit3x3Count, 6) * 5.2 +
    Math.min(fit1x5Count + fit5x1Count, 8) * 2.0 -
    isolatedHoles * 8 -
    Math.max(0, transitions - 20) * 0.85;

  if (fit3x3Count === 0) rawHealth -= 18;
  const healthPercent = Math.max(5, Math.min(100, Math.round(rawHealth)));

  return {
    emptyCells,
    fit3x3Count,
    fit1x5Count,
    fit5x1Count,
    isolatedHoles,
    healthPercent,
  };
}

/**
 * Fast leaf board + sequence scoring heuristic.
 */
function evaluateSequence(
  lo: number,
  hi: number,
  totalLines: number,
  clearStepsMask: number, // bit 0: step1 cleared, bit 1: step2 cleared, bit 2: step3 cleared
  totalPoints: number,
  currentStreak: number,
  strategy: SolverStrategy
): number {
  const r0 = lo & 0xff;
  const r1 = (lo >>> 8) & 0xff;
  const r2 = (lo >>> 16) & 0xff;
  const r3 = (lo >>> 24) & 0xff;
  const r4 = hi & 0xff;
  const r5 = (hi >>> 8) & 0xff;
  const r6 = (hi >>> 16) & 0xff;
  const r7 = (hi >>> 24) & 0xff;

  const occupied =
    POPCOUNT8[r0] +
    POPCOUNT8[r1] +
    POPCOUNT8[r2] +
    POPCOUNT8[r3] +
    POPCOUNT8[r4] +
    POPCOUNT8[r5] +
    POPCOUNT8[r6] +
    POPCOUNT8[r7];
  const emptyCells = 64 - occupied;

  // Compactness / surface roughness (lower transitions = cleaner open blocks)
  const hTrans =
    ROW_H_TRANSITIONS[r0] +
    ROW_H_TRANSITIONS[r1] +
    ROW_H_TRANSITIONS[r2] +
    ROW_H_TRANSITIONS[r3] +
    ROW_H_TRANSITIONS[r4] +
    ROW_H_TRANSITIONS[r5] +
    ROW_H_TRANSITIONS[r6] +
    ROW_H_TRANSITIONS[r7];

  const vTrans =
    POPCOUNT8[~r0 & 0xff] +
    POPCOUNT8[r0 ^ r1] +
    POPCOUNT8[r1 ^ r2] +
    POPCOUNT8[r2 ^ r3] +
    POPCOUNT8[r3 ^ r4] +
    POPCOUNT8[r4 ^ r5] +
    POPCOUNT8[r5 ^ r6] +
    POPCOUNT8[r6 ^ r7] +
    POPCOUNT8[~r7 & 0xff];

  const totalTrans = hTrans + vTrans;

  // Big piece survival checks (3x3, 1x5, 5x1)
  const fit3x3 =
    ROW_SPAN3_COUNT[r0 | r1 | r2] +
    ROW_SPAN3_COUNT[r1 | r2 | r3] +
    ROW_SPAN3_COUNT[r2 | r3 | r4] +
    ROW_SPAN3_COUNT[r3 | r4 | r5] +
    ROW_SPAN3_COUNT[r4 | r5 | r6] +
    ROW_SPAN3_COUNT[r5 | r6 | r7];

  const fit1x5 =
    ROW_SPAN5_COUNT[r0] +
    ROW_SPAN5_COUNT[r1] +
    ROW_SPAN5_COUNT[r2] +
    ROW_SPAN5_COUNT[r3] +
    ROW_SPAN5_COUNT[r4] +
    ROW_SPAN5_COUNT[r5] +
    ROW_SPAN5_COUNT[r6] +
    ROW_SPAN5_COUNT[r7];

  const fit5x1 =
    (8 - POPCOUNT8[r0 | r1 | r2 | r3 | r4]) +
    (8 - POPCOUNT8[r1 | r2 | r3 | r4 | r5]) +
    (8 - POPCOUNT8[r2 | r3 | r4 | r5 | r6]) +
    (8 - POPCOUNT8[r3 | r4 | r5 | r6 | r7]);

  // Isolated 1x1 & 3-sided dead pockets
  let holes4 = 0;
  let pockets3 = 0;
  const rows = [r0, r1, r2, r3, r4, r5, r6, r7];
  for (let i = 0; i < 8; i++) {
    const cur = rows[i];
    const up = i === 0 ? 0xff : rows[i - 1];
    const down = i === 7 ? 0xff : rows[i + 1];
    const l = ((cur << 1) | 1) & 0xff;
    const r = ((cur >>> 1) | 0x80) & 0xff;
    const emp = ~cur & 0xff;
    const h4 = emp & l & r & up & down;
    holes4 += POPCOUNT8[h4];
    // 3 walls occupied around empty cell
    const p3 =
      emp &
      ~h4 &
      ((l & r & up) | (l & r & down) | (l & up & down) | (r & up & down));
    pockets3 += POPCOUNT8[p3];
  }

  // Center openness (rows 2..5, cols 2..5 = 0x3C mask)
  const centerOcc =
    POPCOUNT8[r2 & 0x3c] +
    POPCOUNT8[r3 & 0x3c] +
    POPCOUNT8[r4 & 0x3c] +
    POPCOUNT8[r5 & 0x3c];

  const anyClear = clearStepsMask !== 0;
  const numClearingSteps = POPCOUNT8[clearStepsMask];
  // Late clear bonus: clearing on the final piece resets the 3-move heart timer for next round
  const clearedLateBonus =
    (clearStepsMask & 0b100 ? 45 : 0) + (clearStepsMask & 0b010 ? 20 : 0);

  // Base structural board score
  let boardStructure =
    emptyCells * 14.0 -
    totalTrans * 9.5 -
    holes4 * 52.0 -
    pockets3 * 13.0 -
    centerOcc * 3.5 +
    Math.min(fit3x3, 8) * 26.0 +
    Math.min(fit1x5, 5) * 14.0 +
    Math.min(fit5x1, 5) * 14.0;

  // Severe warning penalties if board cannot fit common run-ending shapes
  if (fit3x3 === 0) boardStructure -= 220;
  else if (fit3x3 === 1) boardStructure -= 55;
  if (fit1x5 === 0) boardStructure -= 65;
  if (fit5x1 === 0) boardStructure -= 65;
  if (occupied === 0) boardStructure += 180; // All-clear bonus!

  if (strategy === 'survival') {
    return (
      boardStructure * 1.45 +
      totalLines * 30 +
      (anyClear ? 40 : 0)
    );
  }

  if (strategy === 'combo') {
    const streakValue = anyClear
      ? 380 + currentStreak * 55 + numClearingSteps * 150 + clearedLateBonus * 1.8
      : -250;
    return (
      boardStructure * 0.85 +
      streakValue +
      totalLines * 120 +
      totalPoints * 0.45
    );
  }

  // Default: 'balanced' (Pertahankan Combo/Streak + Papan Aman)
  const streakKeepBonus = anyClear
    ? 220 + Math.min(currentStreak, 10) * 28 + numClearingSteps * 75 + clearedLateBonus
    : currentStreak > 0
      ? -160
      : 0;

  return (
    boardStructure +
    streakKeepBonus +
    totalLines * 65 +
    totalPoints * 0.18
  );
}

/**
 * Estimates Block Blast points for a single placement step.
 */
function calculateStepPoints(
  blockCount: number,
  linesCleared: number,
  comboAfter: number
): number {
  if (linesCleared === 0) return blockCount;
  // Base line points (10 per line, scaled for multi-line clear) + combo multiplier
  const lineBase = linesCleared === 1 ? 10 : linesCleared * linesCleared * 10;
  const comboBonus = comboAfter * 10 * linesCleared;
  return blockCount + lineBase + comboBonus;
}

/**
 * Reconstructs detailed rich PlacementStep objects for the UI walkthrough.
 */
function buildDetailedCandidate(
  initialBoard: Grid8x8,
  activeSlots: ActiveSlot[],
  records: StepRecord[],
  currentStreak: number,
  evalScore: number
): SolutionCandidate {
  let curBoard = cloneBoard(initialBoard);
  const steps: PlacementStep[] = [];
  let totalLinesCleared = 0;
  let estimatedScore = 0;
  let finalCombo = currentStreak;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const slot = activeSlots[rec.slotArrayIdx];
    const placement = slot.placements[rec.placementIdx];
    const boardBefore = cloneBoard(curBoard);
    const boardWithPiece = cloneBoard(curBoard);
    const placedCells: CellCoord[] = [];

    for (let dr = 0; dr < slot.piece.matrix.length; dr++) {
      for (let dc = 0; dc < slot.piece.matrix[dr].length; dc++) {
        if (slot.piece.matrix[dr][dc]) {
          const r = placement.row + dr;
          const c = placement.col + dc;
          boardWithPiece[r][c] = true;
          placedCells.push({ r, c });
        }
      }
    }

    const clearedRows: number[] = [];
    const clearedCols: number[] = [];

    for (let r = 0; r < 8; r++) {
      if (boardWithPiece[r].every(Boolean)) clearedRows.push(r);
    }
    for (let c = 0; c < 8; c++) {
      let full = true;
      for (let r = 0; r < 8; r++) {
        if (!boardWithPiece[r][c]) {
          full = false;
          break;
        }
      }
      if (full) clearedCols.push(c);
    }

    const boardAfter = cloneBoard(boardWithPiece);
    for (const r of clearedRows) {
      for (let c = 0; c < 8; c++) boardAfter[r][c] = false;
    }
    for (const c of clearedCols) {
      for (let r = 0; r < 8; r++) boardAfter[r][c] = false;
    }

    totalLinesCleared += rec.linesCleared;
    estimatedScore += rec.pointsEarned;
    finalCombo = rec.comboAfter;

    steps.push({
      stepNumber: i + 1,
      slotIndex: slot.slotIndex,
      piece: slot.piece,
      row: placement.row,
      col: placement.col,
      placedCells,
      boardBefore,
      boardWithPiece,
      clearedRows,
      clearedCols,
      boardAfter,
      linesCleared: rec.linesCleared,
      pointsEarned: rec.pointsEarned,
      comboAfter: rec.comboAfter,
    });

    curBoard = boardAfter;
  }

  const lastRec = records[records.length - 1];
  const metrics = computeBoardMetrics(lastRec.afterLo, lastRec.afterHi);

  return {
    steps,
    finalBoard: curBoard,
    totalLinesCleared,
    estimatedScore,
    finalCombo,
    maintainsStreak: totalLinesCleared > 0,
    metrics,
    evaluationScore: Math.round(evalScore),
  };
}

/**
 * Generates unique index permutations for active slots (skipping duplicate piece matrices).
 */
function getUniquePermutations(slots: ActiveSlot[]): number[][] {
  const n = slots.length;
  const results: number[][] = [];
  const used = new Array(n).fill(false);
  const current: number[] = [];

  function backtrack() {
    if (current.length === n) {
      results.push([...current]);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      // Symmetry breaking for identical piece matrices
      let skipDuplicate = false;
      for (let j = 0; j < i; j++) {
        if (
          !used[j] &&
          matricesEqual(slots[j].piece.matrix, slots[i].piece.matrix)
        ) {
          skipDuplicate = true;
          break;
        }
      }
      if (skipDuplicate) continue;

      used[i] = true;
      current.push(i);
      backtrack();
      current.pop();
      used[i] = false;
    }
  }

  backtrack();
  return results;
}

/**
 * Main Block Blast Solver Entrypoint.
 * Finds the optimal placement order and exact coordinates for 1, 2, or 3 candidate blocks.
 */
export function solveBlockBlast(
  board: Grid8x8,
  pieces: (PieceShape | null)[],
  strategy: SolverStrategy = 'balanced',
  currentStreak = 0
): SolverOutput {
  const t0 = performance.now();

  const activeSlots: ActiveSlot[] = [];
  pieces.forEach((piece, slotIndex) => {
    if (piece && piece.matrix.length > 0) {
      activeSlots.push({
        slotIndex,
        piece,
        blockCount: countPieceBlocks(piece),
        placements: precomputePlacements(piece),
      });
    }
  });

  if (activeSlots.length === 0) {
    return {
      solved: false,
      best: null,
      alternatives: [],
      exploredStates: 0,
      solveTimeMs: 0,
      reason: 'Pilih minimal 1 balok terlebih dahulu untuk dicari solusinya.',
    };
  }

  const [initLo, initHi] = gridToBitboard(board);
  const initEmpty =
    64 -
    (POPCOUNT8[initLo & 0xff] +
      POPCOUNT8[(initLo >>> 8) & 0xff] +
      POPCOUNT8[(initLo >>> 16) & 0xff] +
      POPCOUNT8[(initLo >>> 24) & 0xff] +
      POPCOUNT8[initHi & 0xff] +
      POPCOUNT8[(initHi >>> 8) & 0xff] +
      POPCOUNT8[(initHi >>> 16) & 0xff] +
      POPCOUNT8[(initHi >>> 24) & 0xff]);

  // Only beam-prune quiet moves on nearly completely blank boards (>50 empty cells) so solve stays <20ms
  const capPerStep = initEmpty > 50 ? 28 : 64;

  const perms = getUniquePermutations(activeSlots);
  let exploredStates = 0;

  interface TopEntry {
    score: number;
    sig: string;
    records: StepRecord[];
  }

  const topSolutions: TopEntry[] = [];
  const MAX_TOP = 4;

  function pushCandidate(score: number, records: StepRecord[]) {
    const last = records[records.length - 1];
    // Deduplicate alternatives that end up on the exact same final board with same step1 anchor
    const first = records[0];
    const sig = `${last.afterLo}:${last.afterHi}:${first.slotArrayIdx}:${first.placementIdx}`;
    const existingIdx = topSolutions.findIndex((t) => t.sig === sig);
    if (existingIdx !== -1) {
      if (score > topSolutions[existingIdx].score) {
        topSolutions[existingIdx] = {
          score,
          sig,
          records: records.map((r) => ({ ...r })),
        };
        topSolutions.sort((a, b) => b.score - a.score);
      }
      return;
    }

    if (
      topSolutions.length < MAX_TOP ||
      score > topSolutions[topSolutions.length - 1].score
    ) {
      topSolutions.push({
        score,
        sig,
        records: records.map((r) => ({ ...r })),
      });
      topSolutions.sort((a, b) => b.score - a.score);
      if (topSolutions.length > MAX_TOP) topSolutions.pop();
    }
  }

  const workingPath: StepRecord[] = [];

  function searchStep(
    perm: number[],
    depth: number,
    curLo: number,
    curHi: number,
    combo: number,
    movesSinceClear: number,
    totalLines: number,
    clearMask: number,
    totalPoints: number
  ) {
    if (depth === perm.length) {
      exploredStates++;
      const score = evaluateSequence(
        curLo,
        curHi,
        totalLines,
        clearMask,
        totalPoints,
        currentStreak,
        strategy
      );
      pushCandidate(score, workingPath);
      return;
    }

    const slotArrIdx = perm[depth];
    const slot = activeSlots[slotArrIdx];
    const placements = slot.placements;
    const pLen = placements.length;

    let quietCount = 0;

    for (let pIdx = 0; pIdx < pLen; pIdx++) {
      const pl = placements[pIdx];
      if ((curLo & pl.pLo) !== 0 || (curHi & pl.pHi) !== 0) continue;

      const [afterLo, afterHi, lines] = applyBitMove(
        curLo,
        curHi,
        pl.pLo,
        pl.pHi
      );

      if (lines === 0) {
        quietCount++;
        if (quietCount > capPerStep && depth < perm.length - 1) {
          continue;
        }
      }

      let nextCombo = combo;
      let nextMovesSinceClear = movesSinceClear;
      if (lines > 0) {
        nextCombo = combo + 1;
        nextMovesSinceClear = 0;
      } else {
        nextMovesSinceClear = movesSinceClear + 1;
        if (nextMovesSinceClear >= 3) {
          nextCombo = 0;
        }
      }

      const pts = calculateStepPoints(slot.blockCount, lines, nextCombo);

      workingPath.push({
        slotArrayIdx: slotArrIdx,
        placementIdx: pIdx,
        linesCleared: lines,
        comboAfter: nextCombo,
        pointsEarned: pts,
        afterLo,
        afterHi,
      });

      searchStep(
        perm,
        depth + 1,
        afterLo,
        afterHi,
        nextCombo,
        nextMovesSinceClear,
        totalLines + lines,
        lines > 0 ? clearMask | (1 << depth) : clearMask,
        totalPoints + pts
      );

      workingPath.pop();
    }
  }

  for (const perm of perms) {
    searchStep(perm, 0, initLo, initHi, currentStreak, 0, 0, 0, 0);
  }

  const solveTimeMs = Math.round((performance.now() - t0) * 10) / 10;

  if (topSolutions.length === 0) {
    return {
      solved: false,
      best: null,
      alternatives: [],
      exploredStates,
      solveTimeMs,
      reason:
        'Tidak ada kombinasi urutan & posisi yang muat untuk semua balok ini (Game Over). Periksa kembali bentuk balok atau kotak papan.',
    };
  }

  const candidates = topSolutions.map((entry) =>
    buildDetailedCandidate(
      board,
      activeSlots,
      entry.records,
      currentStreak,
      entry.score
    )
  );

  return {
    solved: true,
    best: candidates[0],
    alternatives: candidates.slice(1),
    exploredStates,
    solveTimeMs,
  };
}
