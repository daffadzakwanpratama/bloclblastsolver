import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Layers,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PlacementStep, SolutionCandidate, SolverOutput } from '../types';
import { MiniPiecePreview } from './PieceSelector';

interface SolutionWalkthroughProps {
  output: SolverOutput;
  selectedAltIndex: number; // 0 = best, 1..n = alternatives
  onSelectAlt: (idx: number) => void;
  onApplyFinalBoard: (candidate: SolutionCandidate) => void;
}

const SLOT_BADGES = ['Balok Kiri (#1)', 'Balok Tengah (#2)', 'Balok Kanan (#3)'];

const StepBoardVisual: React.FC<{
  step: PlacementStep;
  showAfterClear: boolean;
}> = ({ step, showAfterClear }) => {
  const placedSet = new Set(step.placedCells.map((c) => `${c.r},${c.c}`));
  const clearedRowSet = new Set(step.clearedRows);
  const clearedColSet = new Set(step.clearedCols);

  const displayGrid = showAfterClear ? step.boardAfter : step.boardBefore;

  return (
    <div className="w-full max-w-[270px] mx-auto select-none">
      {/* Column Numbers 1..8 */}
      <div className="grid grid-cols-[18px_repeat(8,minmax(0,1fr))] gap-[3px] mb-1">
        <div />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => {
          const isAnchorCol =
            col - 1 >= step.col &&
            col - 1 < step.col + (step.piece.matrix[0]?.length ?? 0);
          return (
            <div
              key={col}
              className={`text-center text-[10px] font-bold ${
                isAnchorCol ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {col}
            </div>
          );
        })}
      </div>

      <div className="bg-[#0e1629] p-1.5 rounded-xl border border-slate-700/90 shadow-inner">
        {displayGrid.map((row, r) => {
          const isAnchorRow =
            r >= step.row && r < step.row + step.piece.matrix.length;
          return (
            <div
              key={r}
              className="grid grid-cols-[18px_repeat(8,minmax(0,1fr))] gap-[3px] mb-[3px] last:mb-0 items-center"
            >
              <div
                className={`text-right pr-1 text-[10px] font-bold ${
                  isAnchorRow ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                {r + 1}
              </div>

              {row.map((cellFilled, c) => {
                const isTarget = placedSet.has(`${r},${c}`);
                const willClear =
                  !showAfterClear &&
                  (clearedRowSet.has(r) || clearedColSet.has(c));

                if (!showAfterClear && isTarget) {
                  return (
                    <div
                      key={c}
                      style={{ backgroundColor: step.piece.color }}
                      className={`aspect-square rounded-[4px] bb-tile-filled relative flex items-center justify-center ring-2 ring-white z-10 ${
                        willClear ? 'animate-pulse-fast' : ''
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow" />
                    </div>
                  );
                }

                if (cellFilled) {
                  return (
                    <div
                      key={c}
                      className={`aspect-square rounded-[4px] transition-all ${
                        willClear
                          ? 'bg-gradient-to-br from-amber-300 to-orange-500 bb-tile-filled ring-1 ring-amber-200/90'
                          : 'bg-slate-500/85 bb-tile-filled'
                      }`}
                    />
                  );
                }

                return (
                  <div
                    key={c}
                    className="aspect-square rounded-[4px] bg-[#18233f] border border-slate-800/70"
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SolutionWalkthrough: React.FC<SolutionWalkthroughProps> = ({
  output,
  selectedAltIndex,
  onSelectAlt,
  onApplyFinalBoard,
}) => {
  const [showAfterClearMap, setShowAfterClearMap] = useState<
    Record<number, boolean>
  >({});
  const [activeAnimStep, setActiveAnimStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  const allCandidates: SolutionCandidate[] = output.best
    ? [output.best, ...output.alternatives]
    : [];
  const current =
    allCandidates[Math.min(selectedAltIndex, allCandidates.length - 1)] ?? null;

  useEffect(() => {
    setShowAfterClearMap({});
    setActiveAnimStep(0);
    setIsAutoPlaying(false);
  }, [output, selectedAltIndex]);

  useEffect(() => {
    if (!isAutoPlaying || !current) return;
    const totalPhases = current.steps.length * 2;
    const timer = setInterval(() => {
      setActiveAnimStep((prev) => (prev + 1) % totalPhases);
    }, 1100);
    return () => clearInterval(timer);
  }, [isAutoPlaying, current]);

  if (!output.solved || !current) {
    return (
      <div className="bg-slate-900/85 border border-rose-500/40 rounded-2xl p-6 text-center shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          Belum Ada Solusi Ditemukan
        </h3>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          {output.reason ||
            'Pastikan kondisi papan dan ketiga balok sudah sesuai dengan yang ada di game.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900/95 to-emerald-950/75 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Solusi Terbaik Ditemukan ({output.solveTimeMs} ms •{' '}
              {output.exploredStates.toLocaleString('id-ID')} jalur diuji)
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Ikuti Urutan Langkah {current.steps.map((s) => s.stepNumber).join(' → ')} di Bawah Ini
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Kotak berwarna terang berbingkai putih adalah{' '}
              <strong className="text-white">posisi pas menaruh balok</strong>.
              Kotak emas/oranye menunjukkan{' '}
              <strong className="text-amber-300">
                baris/kolom yang langsung hancur
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoPlaying((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                isAutoPlaying
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
              }`}
            >
              {isAutoPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Hentikan Animasi
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400" /> Simulasi Otomatis
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onApplyFinalBoard(current)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition"
            >
              Pakai Papan Akhir untuk Giliran Berikutnya
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800/90">
          <div className="bg-slate-900/75 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Garis Hancur</div>
              <div className="text-sm font-extrabold text-white">
                {current.totalLinesCleared} Garis (+{current.estimatedScore} poin)
              </div>
            </div>
          </div>

          <div className="bg-slate-900/75 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Flame
              className={`w-5 h-5 shrink-0 ${
                current.maintainsStreak ? 'text-orange-400' : 'text-slate-500'
              }`}
            />
            <div>
              <div className="text-[11px] text-slate-400">Status Combo</div>
              <div className="text-sm font-extrabold text-white">
                {current.maintainsStreak
                  ? `Streak Terjaga (x${current.finalCombo})`
                  : 'Tanpa Clear Giliran Ini'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/75 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Keamanan Papan Akhir</div>
              <div className="text-sm font-extrabold text-white">
                {current.metrics.healthPercent}% ({current.metrics.emptyCells} kosong)
              </div>
            </div>
          </div>

          <div className="bg-slate-900/75 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Kesiapan Balok Besar</div>
              <div className="text-sm font-extrabold text-white">
                {current.metrics.fit3x3Count > 0
                  ? `Muat ${current.metrics.fit3x3Count} posisi 3×3`
                  : '⚠️ Ruang 3×3 Sempit'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Cards Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {current.steps.map((step, idx) => {
          const autoStepIdx = Math.floor(activeAnimStep / 2);
          const autoAfterClear = activeAnimStep % 2 === 1;

          const showAfter = isAutoPlaying
            ? idx < autoStepIdx
              ? true
              : idx === autoStepIdx
                ? autoAfterClear && step.linesCleared > 0
                : false
            : Boolean(showAfterClearMap[step.stepNumber]);

          const isHighlightedCard =
            isAutoPlaying && idx === autoStepIdx;

          const rowEnd = step.row + step.piece.matrix.length;
          const colEnd = step.col + (step.piece.matrix[0]?.length ?? 1);

          return (
            <div
              key={step.stepNumber}
              className={`bg-slate-900/90 rounded-2xl p-4 border-2 transition-all flex flex-col justify-between shadow-xl ${
                isHighlightedCard
                  ? 'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.25)] scale-[1.01]'
                  : 'border-slate-700/80'
              }`}
            >
              <div>
                {/* Step Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-sm flex items-center justify-center shadow">
                      {step.stepNumber}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                        Langkah {step.stepNumber}
                      </div>
                      <div className="text-sm font-extrabold text-white">
                        Ambil {SLOT_BADGES[step.slotIndex]}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#131c33] px-2.5 py-1.5 rounded-lg border border-slate-700">
                    <MiniPiecePreview piece={step.piece} cellSize={10} />
                  </div>
                </div>

                {/* Exact Coordinate Callout */}
                <div className="bg-[#131c33] border border-slate-700/90 rounded-xl px-3 py-2 mb-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-300">
                    Taruh di{' '}
                    <span className="font-extrabold text-white">
                      Baris {step.row + 1}
                      {rowEnd > step.row + 1 ? `–${rowEnd}` : ''}, Kolom{' '}
                      {step.col + 1}
                      {colEnd > step.col + 1 ? `–${colEnd}` : ''}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shrink-0">
                    B{step.row + 1} : K{step.col + 1}
                  </span>
                </div>

                {/* 8x8 Step Board */}
                <StepBoardVisual step={step} showAfterClear={showAfter} />
              </div>

              {/* Footer: Line Clear Info & Toggle */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 min-h-[40px]">
                {step.linesCleared > 0 ? (
                  <>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>
                        Hancur {step.linesCleared} Garis! (
                        {[
                          ...step.clearedRows.map((r) => `Baris ${r + 1}`),
                          ...step.clearedCols.map((c) => `Kolom ${c + 1}`),
                        ].join(', ')}
                        )
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAutoPlaying(false);
                        setShowAfterClearMap((prev) => ({
                          ...prev,
                          [step.stepNumber]: !prev[step.stepNumber],
                        }));
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold shrink-0 transition"
                    >
                      {showAfter ? 'Lihat Posisi Taruh' : 'Lihat Sesudah Hancur'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">
                    Tidak ada garis hancur pada langkah ini (membuka struktur)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Routes Selector (if available) */}
      {allCandidates.length > 1 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-400">
            Jalur Alternatif Lainnya:
          </span>
          <div className="flex flex-wrap gap-2">
            {allCandidates.map((cand, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectAlt(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  selectedAltIndex === idx
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {idx === 0 ? '⭐ Rekomendasi #1' : `Opsi #${idx + 1}`} •{' '}
                {cand.totalLinesCleared} Clear • Aman {cand.metrics.healthPercent}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
