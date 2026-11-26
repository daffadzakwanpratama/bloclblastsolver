import React, { useRef, useState } from 'react';
import { Eraser, Grid, RotateCcw, Sparkles } from 'lucide-react';
import { Grid8x8 } from '../types';

interface BoardEditorProps {
  board: Grid8x8;
  onChange: (nextBoard: Grid8x8) => void;
  onClearBoard: () => void;
  onUndoBoard?: () => void;
  canUndo?: boolean;
  previewStepCells?: { r: number; c: number; color: string }[];
}

export const BoardEditor: React.FC<BoardEditorProps> = ({
  board,
  onChange,
  onClearBoard,
  onUndoBoard,
  canUndo,
  previewStepCells,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const paintModeRef = useRef<boolean>(true);

  const filledCount = board.reduce(
    (sum, row) => sum + row.filter(Boolean).length,
    0
  );

  const hasAlreadyFullLine =
    board.some((row) => row.every(Boolean)) ||
    [0, 1, 2, 3, 4, 5, 6, 7].some((c) => board.every((row) => row[c]));

  const toggleCell = (r: number, c: number, forceValue?: boolean) => {
    const nextValue = forceValue !== undefined ? forceValue : !board[r][c];
    if (board[r][c] === nextValue) return;
    const next = board.map((row, ri) =>
      ri === r ? row.map((val, ci) => (ci === c ? nextValue : val)) : row
    );
    onChange(next);
  };

  const handlePointerDown = (r: number, c: number) => {
    const targetVal = !board[r][c];
    paintModeRef.current = targetVal;
    setIsDragging(true);
    toggleCell(r, c, targetVal);
  };

  const handlePointerEnter = (r: number, c: number) => {
    if (!isDragging) return;
    toggleCell(r, c, paintModeRef.current);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleFillRandom = () => {
    const next: Grid8x8 = Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => Math.random() < 0.42)
    );
    onChange(next);
  };

  const previewMap = new Map<string, string>();
  if (previewStepCells) {
    for (const item of previewStepCells) {
      previewMap.set(`${item.r},${item.c}`, item.color);
    }
  }

  return (
    <div
      className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-xl select-none"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-400" />
            Papan 8×8 Saat Ini
          </h2>
          <p className="text-xs text-slate-400">
            Klik atau tahan-geser untuk menandai kotak yang sudah terisi di game ({filledCount}/64 terisi)
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {onUndoBoard && (
            <button
              type="button"
              onClick={onUndoBoard}
              disabled={!canUndo}
              title="Kembalikan perubahan papan sebelumnya"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={handleFillRandom}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 flex items-center gap-1 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Acak
          </button>
          <button
            type="button"
            onClick={onClearBoard}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 flex items-center gap-1 transition"
          >
            <Eraser className="w-3.5 h-3.5" />
            Kosongkan
          </button>
        </div>
      </div>

      {hasAlreadyFullLine && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-200">
          Catatan: Ada baris/kolom yang penuh 8 kotak (di dalam game biasanya langsung hancur otomatis).
        </div>
      )}

      {/* 8x8 Grid with Coordinate Headers */}
      <div className="max-w-[380px] mx-auto">
        {/* Column Headers 1..8 */}
        <div className="grid grid-cols-[24px_repeat(8,minmax(0,1fr))] gap-1.5 mb-1">
          <div />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((colNum) => (
            <div
              key={colNum}
              className="text-center text-[11px] font-bold text-slate-400"
            >
              K{colNum}
            </div>
          ))}
        </div>

        <div className="bg-[#131c33] p-2.5 rounded-xl border-2 border-slate-700/80 shadow-inner">
          {board.map((row, rIdx) => (
            <div
              key={rIdx}
              className="grid grid-cols-[24px_repeat(8,minmax(0,1fr))] gap-1.5 mb-1.5 last:mb-0 items-center"
            >
              {/* Row Header B1..B8 */}
              <div className="text-right pr-1 text-[11px] font-bold text-slate-400">
                B{rIdx + 1}
              </div>

              {row.map((filled, cIdx) => {
                const ghostColor = previewMap.get(`${rIdx},${cIdx}`);
                return (
                  <button
                    key={cIdx}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handlePointerDown(rIdx, cIdx);
                    }}
                    onPointerEnter={() => handlePointerEnter(rIdx, cIdx)}
                    aria-label={`Baris ${rIdx + 1} Kolom ${cIdx + 1}`}
                    style={
                      ghostColor && !filled
                        ? {
                            backgroundColor: `${ghostColor}55`,
                            borderColor: ghostColor,
                          }
                        : undefined
                    }
                    className={`aspect-square w-full rounded-md transition-all duration-100 touch-none relative ${
                      filled
                        ? 'bg-gradient-to-br from-indigo-400 to-blue-600 bb-tile-filled scale-[0.99]'
                        : ghostColor
                          ? 'border-2 bb-tile-ghost animate-pulse-fast'
                          : 'bg-[#1b2644] hover:bg-[#25345c] bb-tile-empty border border-slate-800/80'
                    }`}
                  >
                    {ghostColor && !filled && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">
                        1
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
