import React, { useMemo, useState } from 'react';
import {
  Blocks,
  Flame,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { BoardEditor } from './components/BoardEditor';
import { PieceSelector } from './components/PieceSelector';
import { ScreenshotUploader } from './components/ScreenshotUploader';
import { SolutionWalkthrough } from './components/SolutionWalkthrough';
import { GAME_PRESETS } from './data/presets';
import { cloneBoard, createEmptyBoard, solveBlockBlast } from './utils/solver';
import {
  Grid8x8,
  PieceShape,
  SolutionCandidate,
  SolverStrategy,
} from './types';

export const App: React.FC = () => {
  // Load initial exciting demo preset so user immediately sees how the step-by-step solver works!
  const initialPreset = GAME_PRESETS[0];

  const [board, setBoard] = useState<Grid8x8>(() =>
    cloneBoard(initialPreset.board)
  );
  const [boardHistory, setBoardHistory] = useState<Grid8x8[]>([]);
  const [pieces, setPieces] = useState<(PieceShape | null)[]>(() => [
    ...initialPreset.pieces,
  ]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [strategy, setStrategy] = useState<SolverStrategy>('balanced');
  const [currentStreak, setCurrentStreak] = useState<number>(
    initialPreset.streak
  );
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(0);

  const handleUpdateBoard = (nextBoard: Grid8x8) => {
    setBoardHistory((prev) => [...prev.slice(-15), cloneBoard(board)]);
    setBoard(nextBoard);
    setSelectedAltIndex(0);
  };

  const handleUndoBoard = () => {
    setBoardHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setBoard(last);
      return prev.slice(0, -1);
    });
    setSelectedAltIndex(0);
  };

  const handleClearBoard = () => {
    handleUpdateBoard(createEmptyBoard());
  };

  const handleAssignPiece = (slot: number, piece: PieceShape | null) => {
    setPieces((prev) => prev.map((p, idx) => (idx === slot ? piece : p)));
    setSelectedAltIndex(0);
  };

  const handleClearAllPieces = () => {
    setPieces([null, null, null]);
    setActiveSlot(0);
    setSelectedAltIndex(0);
  };

  const handleLoadPreset = (presetId: string) => {
    const found = GAME_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setBoardHistory((prev) => [...prev.slice(-15), cloneBoard(board)]);
    setBoard(cloneBoard(found.board));
    setPieces([...found.pieces]);
    setCurrentStreak(found.streak);
    setActiveSlot(0);
    setSelectedAltIndex(0);
  };

  const handleScreenshotDetected = (
    detectedBoard: Grid8x8,
    detectedPieces: (PieceShape | null)[]
  ) => {
    setBoardHistory((prev) => [...prev.slice(-15), cloneBoard(board)]);
    setBoard(detectedBoard);
    if (detectedPieces.some(Boolean)) {
      setPieces(detectedPieces);
    }
    setSelectedAltIndex(0);
  };

  const handleApplyFinalBoard = (candidate: SolutionCandidate) => {
    setBoardHistory((prev) => [...prev.slice(-15), cloneBoard(board)]);
    setBoard(cloneBoard(candidate.finalBoard));
    setCurrentStreak(candidate.finalCombo);
    setPieces([null, null, null]);
    setActiveSlot(0);
    setSelectedAltIndex(0);
  };

  const solverOutput = useMemo(
    () => solveBlockBlast(board, pieces, strategy, currentStreak),
    [board, pieces, strategy, currentStreak]
  );

  // Show ghost preview of Step 1 right on the manual board editor as well
  const activeCandidate = useMemo(() => {
    if (!solverOutput.best) return null;
    const all = [solverOutput.best, ...solverOutput.alternatives];
    return all[Math.min(selectedAltIndex, all.length - 1)] ?? solverOutput.best;
  }, [solverOutput, selectedAltIndex]);

  const step1PreviewCells = useMemo(() => {
    if (!activeCandidate || activeCandidate.steps.length === 0) return undefined;
    const firstStep = activeCandidate.steps[0];
    return firstStep.placedCells.map((c) => ({
      r: c.r,
      c: c.c,
      color: firstStep.piece.color,
    }));
  }, [activeCandidate]);

  return (
    <div className="min-h-screen pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/90 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Blocks className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Block Blast Solver
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Pencari Langkah
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Menunjukkan urutan & koordinat kotak paling pas untuk menaruh ke-3 balok
              </p>
            </div>
          </div>

          {/* Preset Quick Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">
              Contoh Kasus:
            </span>
            {GAME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset.id)}
                title={preset.subtitle}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Strategy & Combo Controls + Screenshot Uploader */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <ScreenshotUploader onDetected={handleScreenshotDetected} />
          </div>

          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Mode Strategi Solver
              </h2>
              <p className="text-xs text-slate-400 mb-3">
                Pilih prioritas perhitungan langkah terbaik sesuai kondisi permainanmu
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStrategy('balanced')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    strategy === 'balanced'
                      ? 'bg-indigo-600/25 border-indigo-400 text-white shadow'
                      : 'bg-[#131c33] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Target className="w-4 h-4 text-indigo-400 mb-1" />
                  <div className="text-xs font-bold">Seimbang</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Jaga Streak + Papan Aman
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy('survival')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    strategy === 'survival'
                      ? 'bg-emerald-600/25 border-emerald-400 text-white shadow'
                      : 'bg-[#131c33] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Shield className="w-4 h-4 text-emerald-400 mb-1" />
                  <div className="text-xs font-bold">Survival</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Anti-Mati & Buka Ruang 3×3
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy('combo')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    strategy === 'combo'
                      ? 'bg-amber-600/25 border-amber-400 text-white shadow'
                      : 'bg-[#131c33] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Trophy className="w-4 h-4 text-amber-400 mb-1" />
                  <div className="text-xs font-bold">Skor & Combo</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Kejar Multi-Clear & Streak
                  </div>
                </button>
              </div>
            </div>

            {/* Current Combo Streak Counter */}
            <div className="bg-[#131c33] border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Combo / Streak Saat Ini
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Membantu solver memprioritaskan penyelamatan streak aktif
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStreak((s) => Math.max(0, s - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center font-extrabold text-sm text-orange-300">
                  x{currentStreak}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStreak((s) => s + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Input Section: Left = 8x8 Board Editor, Right = 3 Piece Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5">
            <BoardEditor
              board={board}
              onChange={handleUpdateBoard}
              onClearBoard={handleClearBoard}
              onUndoBoard={handleUndoBoard}
              canUndo={boardHistory.length > 0}
              previewStepCells={step1PreviewCells}
            />
          </div>

          <div className="lg:col-span-7">
            <PieceSelector
              pieces={pieces}
              activeSlot={activeSlot}
              onSelectSlot={setActiveSlot}
              onAssignPiece={handleAssignPiece}
              onClearAllPieces={handleClearAllPieces}
            />
          </div>
        </div>

        {/* Step-by-Step Visual Solution Walkthrough */}
        <section aria-label="Panduan Langkah Solusi">
          <SolutionWalkthrough
            output={solverOutput}
            selectedAltIndex={selectedAltIndex}
            onSelectAlt={setSelectedAltIndex}
            onApplyFinalBoard={handleApplyFinalBoard}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
