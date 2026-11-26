import { resolvePieceFromMatrix } from '../data/pieces';
import { createEmptyBoard } from './solver';
import { Grid8x8, PieceShape } from '../types';

export interface CalibrationRect {
  /** Normalized 0..1 relative to image width */
  boardX: number;
  /** Normalized 0..1 relative to image height */
  boardY: number;
  /** Normalized 0..1 relative to image width (square size in px = boardSize * imgWidth) */
  boardSize: number;
  /** Normalized 0..1 relative to image height */
  trayY: number;
  /** Normalized 0..1 relative to image height */
  trayHeight: number;
}

export interface ScreenshotDetectionResult {
  board: Grid8x8;
  pieces: (PieceShape | null)[];
  calibration: CalibrationRect;
  confidence: number;
}

function colorDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Automatically estimates the 8x8 board square and tray region from an image's pixel buffer.
 */
export function autoLocateRegions(
  data: Uint8ClampedArray,
  width: number,
  height: number
): CalibrationRect {
  const aspect = height / width;

  // Sample outer background color near left/right edges across middle band
  const bgRs: number[] = [];
  const bgGs: number[] = [];
  const bgBs: number[] = [];
  for (let y = Math.floor(height * 0.18); y < Math.floor(height * 0.72); y += 6) {
    for (const x of [2, 4, width - 5, width - 3]) {
      if (x >= 0 && x < width) {
        const idx = (y * width + x) * 4;
        bgRs.push(data[idx]);
        bgGs.push(data[idx + 1]);
        bgBs.push(data[idx + 2]);
      }
    }
  }
  const outerR = median(bgRs);
  const outerG = median(bgGs);
  const outerB = median(bgBs);

  // Scan rows to find vertical span where horizontal center differs strongly from outer margin (the recessed dark board frame)
  const rowScores = new Float32Array(height);
  const xStart = Math.floor(width * 0.12);
  const xEnd = Math.floor(width * 0.88);

  for (let y = Math.floor(height * 0.05); y < Math.floor(height * 0.85); y++) {
    let diffSum = 0;
    let darkRecessedCount = 0;
    let samples = 0;
    const outerLum = 0.299 * outerR + 0.587 * outerG + 0.114 * outerB;

    for (let x = xStart; x <= xEnd; x += 4) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const d = colorDist(r, g, b, outerR, outerG, outerB);
      diffSum += d;
      if (lum < outerLum - 8 || d > 26) {
        darkRecessedCount++;
      }
      samples++;
    }
    rowScores[y] = samples > 0 ? darkRecessedCount / samples + diffSum / (samples * 180) : 0;
  }

  // Find best square window of size S (in [0.76*width .. 0.96*width] for phone screenshots, or smaller if tablet/desktop)
  const minS = aspect < 1.3 ? Math.floor(Math.min(width, height) * 0.48) : Math.floor(width * 0.80);
  const maxS = Math.floor(Math.min(width * 0.96, height * 0.72));

  let bestY = Math.floor(height * (aspect > 1.8 ? 0.235 : 0.16));
  let bestOuterSize = Math.floor(width * 0.90);
  let bestScore = -Infinity;

  for (let s = minS; s <= maxS; s += Math.max(4, Math.floor(width * 0.015))) {
    const maxY = Math.min(height - s - Math.floor(height * 0.12), Math.floor(height * 0.52));
    const minY = Math.floor(height * 0.04);
    for (let y0 = minY; y0 <= maxY; y0 += 4) {
      let sum = 0;
      for (let y = y0; y < y0 + s; y += 3) {
        sum += rowScores[y];
      }
      const meanInside = sum / (s / 3);
      // Contrast just above top edge and just below bottom edge (gap between board and tray)
      const aboveY = Math.max(0, y0 - 8);
      const belowY = Math.min(height - 1, y0 + s + 8);
      const edgeBonus =
        (meanInside - rowScores[aboveY]) * 0.65 +
        (meanInside - rowScores[belowY]) * 0.85;
      const total = meanInside + edgeBonus;

      if (total > bestScore) {
        bestScore = total;
        bestY = y0;
        bestOuterSize = s;
      }
    }
  }

  // Refine left & right edges of the board container within [bestY .. bestY + bestOuterSize]
  let leftEdge = Math.floor((width - bestOuterSize) / 2);
  let rightEdge = leftEdge + bestOuterSize;

  const colDiff = new Float32Array(width);
  for (let x = 2; x < width - 2; x++) {
    let acc = 0;
    let cnt = 0;
    for (let y = bestY + 12; y < bestY + bestOuterSize - 12; y += 6) {
      const idxL = (y * width + (x - 2)) * 4;
      const idxR = (y * width + (x + 2)) * 4;
      acc += colorDist(
        data[idxL],
        data[idxL + 1],
        data[idxL + 2],
        data[idxR],
        data[idxR + 1],
        data[idxR + 2]
      );
      cnt++;
    }
    colDiff[x] = cnt > 0 ? acc / cnt : 0;
  }

  let maxLeftGrad = 0;
  let detectedLeft = -1;
  for (let x = Math.floor(width * 0.02); x < Math.floor(width * 0.22); x++) {
    if (colDiff[x] > maxLeftGrad && colDiff[x] > 14) {
      maxLeftGrad = colDiff[x];
      detectedLeft = x;
    }
  }

  let maxRightGrad = 0;
  let detectedRight = -1;
  for (let x = Math.floor(width * 0.78); x < Math.floor(width * 0.98); x++) {
    if (colDiff[x] > maxRightGrad && colDiff[x] > 14) {
      maxRightGrad = colDiff[x];
      detectedRight = x;
    }
  }

  if (detectedLeft !== -1 && detectedRight !== -1 && detectedRight - detectedLeft > width * 0.65) {
    leftEdge = detectedLeft;
    rightEdge = detectedRight;
    bestOuterSize = rightEdge - leftEdge;
  }

  // Account for thin recessed board border padding (~1.8% on each side)
  const framePad = bestOuterSize * 0.018;
  const innerX = leftEdge + framePad;
  const innerY = bestY + framePad;
  const innerSize = bestOuterSize - framePad * 2;

  const trayTopPx = Math.min(height - 20, bestY + bestOuterSize + bestOuterSize * 0.035);
  const trayHeightPx = Math.min(
    height - trayTopPx - 4,
    bestOuterSize * 0.36
  );

  return {
    boardX: Math.max(0, Math.min(0.4, innerX / width)),
    boardY: Math.max(0, Math.min(0.75, innerY / height)),
    boardSize: Math.max(0.3, Math.min(0.98, innerSize / width)),
    trayY: Math.max(0.4, Math.min(0.92, trayTopPx / height)),
    trayHeight: Math.max(0.08, Math.min(0.4, trayHeightPx / height)),
  };
}

/**
 * Extracts the 8x8 boolean board and 3 candidate pieces using a CalibrationRect.
 */
export function extractFromCalibration(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cal: CalibrationRect
): { board: Grid8x8; pieces: (PieceShape | null)[]; confidence: number } {
  const bx = cal.boardX * width;
  const by = cal.boardY * height;
  const bSize = cal.boardSize * width;
  const cellPx = bSize / 8;

  interface CellStats {
    r: number;
    g: number;
    b: number;
    lum: number;
    sat: number;
  }

  const cellStats: CellStats[][] = Array.from({ length: 8 }, () => []);
  const allLums: number[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cx0 = Math.floor(bx + (col + 0.24) * cellPx);
      const cx1 = Math.ceil(bx + (col + 0.76) * cellPx);
      const cy0 = Math.floor(by + (row + 0.24) * cellPx);
      const cy1 = Math.ceil(by + (row + 0.76) * cellPx);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let y = cy0; y <= cy1; y++) {
        if (y < 0 || y >= height) continue;
        for (let x = cx0; x <= cx1; x++) {
          if (x < 0 || x >= width) continue;
          const idx = (y * width + x) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const mr = count > 0 ? sumR / count : 0;
      const mg = count > 0 ? sumG / count : 0;
      const mb = count > 0 ? sumB / count : 0;
      const lum = 0.299 * mr + 0.587 * mg + 0.114 * mb;
      const sat = rgbSaturation(mr, mg, mb);

      cellStats[row][col] = { r: mr, g: mg, b: mb, lum, sat };
      allLums.push(lum);
    }
  }

  // Determine dark empty-cell baseline from darkest 15% of cells on the 8x8 board
  const flatCells = cellStats.flat();
  const sortedByDarkness = [...flatCells].sort(
    (a, b) => a.lum + a.sat * 40 - (b.lum + b.sat * 40)
  );
  const darkCount = Math.max(3, Math.floor(sortedByDarkness.length * 0.15));
  const emptySlice = sortedByDarkness.slice(0, darkCount);

  const emptyR = median(emptySlice.map((c) => c.r));
  const emptyG = median(emptySlice.map((c) => c.g));
  const emptyB = median(emptySlice.map((c) => c.b));
  const emptyLum = 0.299 * emptyR + 0.587 * emptyG + 0.114 * emptyB;
  const emptySat = rgbSaturation(emptyR, emptyG, emptyB);

  const board = createEmptyBoard();
  let clearSeparations = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const st = cellStats[row][col];
      const dist = colorDist(st.r, st.g, st.b, emptyR, emptyG, emptyB);
      const lumDelta = st.lum - emptyLum;
      const satDelta = st.sat - emptySat;

      const isFilled =
        dist > 34 ||
        (lumDelta > 20 && satDelta > 0.12) ||
        satDelta > 0.25;

      board[row][col] = isFilled;
      if (dist < 16 || dist > 48) clearSeparations++;
    }
  }

  // === DETECT 3 CANDIDATE PIECES IN TRAY ===
  const trayTop = Math.floor(cal.trayY * height);
  const trayBottom = Math.min(
    height - 2,
    Math.floor((cal.trayY + cal.trayHeight) * height)
  );
  const trayLeft = Math.floor(bx);
  const trayRight = Math.min(width - 2, Math.floor(bx + bSize));
  const slotWidth = (trayRight - trayLeft) / 3;

  // Estimate tray background color from perimeter of tray
  const trayBgR: number[] = [];
  const trayBgG: number[] = [];
  const trayBgB: number[] = [];

  for (let x = trayLeft; x < trayRight; x += 5) {
    for (const y of [trayTop + 2, trayBottom - 2]) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        const idx = (y * width + x) * 4;
        trayBgR.push(data[idx]);
        trayBgG.push(data[idx + 1]);
        trayBgB.push(data[idx + 2]);
      }
    }
  }
  const tBgR = median(trayBgR);
  const tBgG = median(trayBgG);
  const tBgB = median(trayBgB);
  const tBgLum = 0.299 * tBgR + 0.587 * tBgG + 0.114 * tBgB;
  const tBgSat = rgbSaturation(tBgR, tBgG, tBgB);

  const pieces: (PieceShape | null)[] = [null, null, null];

  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const sx0 = Math.floor(trayLeft + sIdx * slotWidth + slotWidth * 0.04);
    const sx1 = Math.floor(trayLeft + (sIdx + 1) * slotWidth - slotWidth * 0.04);
    const sy0 = trayTop + 3;
    const sy1 = trayBottom - 3;

    const sw = sx1 - sx0 + 1;
    const sh = sy1 - sy0 + 1;
    if (sw <= 8 || sh <= 8) continue;

    // Build foreground mask
    const mask = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = ((sy0 + y) * width + (sx0 + x)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const dist = colorDist(r, g, b, tBgR, tBgG, tBgB);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = rgbSaturation(r, g, b);

        if (
          dist > 38 &&
          (lum > tBgLum + 14 || sat > tBgSat + 0.18 || dist > 62)
        ) {
          mask[y * sw + x] = 1;
        }
      }
    }

    // Simple 3x3 speckle filter (keep pixel if >=5 of 9 neighbors are 1)
    let fgCount = 0;
    let minX = sw;
    let maxX = -1;
    let minY = sh;
    let maxY = -1;
    let avgR = 0;
    let avgG = 0;
    let avgB = 0;

    const cleanMask = new Uint8Array(sw * sh);
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            neighbors += mask[(y + dy) * sw + (x + dx)];
          }
        }
        if (neighbors >= 5) {
          cleanMask[y * sw + x] = 1;
          fgCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          const idx = ((sy0 + y) * width + (sx0 + x)) * 4;
          avgR += data[idx];
          avgG += data[idx + 1];
          avgB += data[idx + 2];
        }
      }
    }

    const minPieceArea = Math.pow(cellPx * 0.24, 2);
    if (fgCount < minPieceArea || maxX <= minX || maxY <= minY) {
      pieces[sIdx] = null;
      continue;
    }

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;

    // Infer (rows, cols) in 1..5 x 1..5 using square-tile constraint + expected scale (~0.54 * cellPx)
    let bestRows = 1;
    let bestCols = 1;
    let bestFitScore = -Infinity;

    for (let rows = 1; rows <= 5; rows++) {
      for (let cols = 1; cols <= 5; cols++) {
        const tileW = bboxW / cols;
        const tileH = bboxH / rows;
        const maxT = Math.max(tileW, tileH);
        const aspectErr = Math.abs(tileW - tileH) / maxT;
        if (aspectErr > 0.26) continue;

        const meanTile = (tileW + tileH) / 2;
        if (meanTile < cellPx * 0.30 || meanTile > cellPx * 0.84) continue;

        // Expected scale in Block Blast tray (~0.55x for <=3 span, ~0.46x for 4-5 span)
        const maxSpan = Math.max(rows, cols);
        const expectedTile =
          maxSpan >= 5
            ? cellPx * 0.45
            : maxSpan === 4
              ? cellPx * 0.50
              : cellPx * 0.55;

        const scaleErr = Math.abs(meanTile - expectedTile) / expectedTile;

        // Measure sub-cell bimodality (each sub-cell should be cleanly full or cleanly empty)
        let crispness = 0;
        let nonEmptyCells = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const subX0 = Math.floor(minX + (c + 0.22) * tileW);
            const subX1 = Math.ceil(minX + (c + 0.78) * tileW);
            const subY0 = Math.floor(minY + (r + 0.22) * tileH);
            const subY1 = Math.ceil(minY + (r + 0.78) * tileH);
            let ones = 0;
            let tot = 0;
            for (let yy = subY0; yy <= subY1; yy++) {
              for (let xx = subX0; xx <= subX1; xx++) {
                if (yy >= 0 && yy < sh && xx >= 0 && xx < sw) {
                  ones += cleanMask[yy * sw + xx];
                  tot++;
                }
              }
            }
            const fillRatio = tot > 0 ? ones / tot : 0;
            if (fillRatio > 0.45) nonEmptyCells++;
            // Distance from 0.5 (0.5 is ambiguous, 0.0 or 1.0 is super crisp)
            crispness += Math.abs(fillRatio - 0.42) * 2;
          }
        }
        crispness /= rows * cols;
        if (nonEmptyCells === 0) continue;

        const score = crispness * 2.2 - aspectErr * 3.8 - scaleErr * 2.4;
        if (score > bestFitScore) {
          bestFitScore = score;
          bestRows = rows;
          bestCols = cols;
        }
      }
    }

    const tileW = bboxW / bestCols;
    const tileH = bboxH / bestRows;
    const rawMat: boolean[][] = [];
    for (let r = 0; r < bestRows; r++) {
      const rowArr: boolean[] = [];
      for (let c = 0; c < bestCols; c++) {
        const subX0 = Math.floor(minX + (c + 0.2) * tileW);
        const subX1 = Math.ceil(minX + (c + 0.8) * tileW);
        const subY0 = Math.floor(minY + (r + 0.2) * tileH);
        const subY1 = Math.ceil(minY + (r + 0.8) * tileH);
        let ones = 0;
        let tot = 0;
        for (let yy = subY0; yy <= subY1; yy++) {
          for (let xx = subX0; xx <= subX1; xx++) {
            if (yy >= 0 && yy < sh && xx >= 0 && xx < sw) {
              ones += cleanMask[yy * sw + xx];
              tot++;
            }
          }
        }
        rowArr.push(tot > 0 && ones / tot > 0.4);
      }
      rawMat.push(rowArr);
    }

    const domHex = `#${Math.round(avgR / fgCount)
      .toString(16)
      .padStart(2, '0')}${Math.round(avgG / fgCount)
      .toString(16)
      .padStart(2, '0')}${Math.round(avgB / fgCount)
      .toString(16)
      .padStart(2, '0')}`;

    pieces[sIdx] = resolvePieceFromMatrix(rawMat, domHex);
  }

  const confidence = Math.round((clearSeparations / 64) * 100);
  return { board, pieces, confidence };
}

/**
 * Loads an image URL / DataURL and detects both the 8x8 board and 3 tray pieces.
 */
export async function detectFromImageElement(
  img: HTMLImageElement,
  overrideCalibration?: CalibrationRect
): Promise<ScreenshotDetectionResult> {
  const maxDim = 640;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(64, Math.round(img.naturalWidth * scale));
  const height = Math.max(64, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const calibration =
    overrideCalibration ?? autoLocateRegions(imageData.data, width, height);
  const { board, pieces, confidence } = extractFromCalibration(
    imageData.data,
    width,
    height,
    calibration
  );

  return {
    board,
    pieces,
    calibration,
    confidence,
  };
}
