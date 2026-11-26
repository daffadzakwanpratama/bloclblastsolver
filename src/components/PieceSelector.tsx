import React, { useState } from 'react';
import { Check, PencilRuler, Plus, Trash2, X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  PIECE_CATALOG,
  resolvePieceFromMatrix,
} from '../data/pieces';
import { PieceCategory, PieceShape } from '../types';

interface PieceSelectorProps {
  pieces: (PieceShape | null)[];
  activeSlot: number;
  onSelectSlot: (slot: number) => void;
  onAssignPiece: (slot: number, piece: PieceShape | null) => void;
  onClearAllPieces: () => void;
}

const SLOT_NAMES = ['Balok Kiri (#1)', 'Balok Tengah (#2)', 'Balok Kanan (#3)'];

export const MiniPiecePreview: React.FC<{
  piece: PieceShape;
  cellSize?: number;
}> = ({ piece, cellSize = 14 }) => {
  const rows = piece.matrix.length;
  const cols = piece.matrix[0]?.length ?? 0;

  return (
    <div
      className="inline-grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      }}
    >
      {piece.matrix.map((row, r) =>
        row.map((val, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: val ? piece.color : 'transparent',
            }}
            className={val ? 'rounded-[3px] bb-tile-filled' : ''}
          />
        ))
      )}
    </div>
  );
};

export const PieceSelector: React.FC<PieceSelectorProps> = ({
  pieces,
  activeSlot,
  onSelectSlot,
  onAssignPiece,
  onClearAllPieces,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    PieceCategory | 'semua'
  >('semua');
  const [customGrid, setCustomGrid] = useState<boolean[][]>(() =>
    Array.from({ length: 5 }, () => Array(5).fill(false))
  );

  const categories: (PieceCategory | 'semua')[] = [
    'semua',
    'garis',
    'kotak',
    'siku',
    'huruf-l',
    't-dan-z',
    'kustom',
  ];

  const filteredCatalog =
    selectedCategory === 'semua'
      ? PIECE_CATALOG
      : PIECE_CATALOG.filter((p) => p.category === selectedCategory);

  const handlePickCatalogPiece = (piece: PieceShape) => {
    onAssignPiece(activeSlot, piece);
    // Auto-advance to next empty slot, or cycle 0 -> 1 -> 2
    const nextEmpty = pieces.findIndex(
      (p, idx) => idx !== activeSlot && p === null
    );
    if (nextEmpty !== -1) {
      onSelectSlot(nextEmpty);
    } else {
      onSelectSlot((activeSlot + 1) % 3);
    }
  };

  const toggleCustomCell = (r: number, c: number) => {
    setCustomGrid((prev) =>
      prev.map((row, ri) =>
        ri === r ? row.map((v, ci) => (ci === c ? !v : v)) : row
      )
    );
  };

  const applyCustomPiece = () => {
    const resolved = resolvePieceFromMatrix(customGrid, '#38bdf8');
    if (!resolved) return;
    handlePickCatalogPiece(resolved);
    setCustomGrid(Array.from({ length: 5 }, () => Array(5).fill(false)));
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            3 Balok Giliran Ini
          </h2>
          <p className="text-xs text-slate-400">
            Klik slot di bawah lalu pilih bentuk balok yang muncul di layar game
          </p>
        </div>

        {pieces.some(Boolean) && (
          <button
            type="button"
            onClick={onClearAllPieces}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Reset 3 Balok
          </button>
        )}
      </div>

      {/* 3 Candidate Slots (Tray) */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {[0, 1, 2].map((slotIdx) => {
          const piece = pieces[slotIdx];
          const isSelected = activeSlot === slotIdx;

          return (
            <div
              key={slotIdx}
              onClick={() => onSelectSlot(slotIdx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectSlot(slotIdx);
              }}
              className={`relative rounded-xl p-2.5 min-h-[106px] flex flex-col items-center justify-between cursor-pointer border-2 transition-all ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.3)]'
                  : 'bg-[#131c33] border-slate-700/80 hover:border-slate-500'
              }`}
            >
              <div className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span className="truncate">{SLOT_NAMES[slotIdx]}</span>
                {piece && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignPiece(slotIdx, null);
                      onSelectSlot(slotIdx);
                    }}
                    title="Hapus balok ini"
                    className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center py-1">
                {piece ? (
                  <MiniPiecePreview piece={piece} cellSize={14} />
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <Plus className="w-5 h-5 mb-0.5 opacity-70" />
                    <span className="text-[10px]">Pilih Bentuk</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 truncate max-w-full">
                {piece ? piece.name : isSelected ? 'Sedang dipilih...' : 'Kosong'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              selectedCategory === cat
                ? 'bg-indigo-500 text-white shadow'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cat === 'semua'
              ? 'Semua Bentuk'
              : cat === 'kustom'
                ? '✏️ Gambar Kustom'
                : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Catalog Grid OR Custom 5x5 Drawer */}
      {selectedCategory === 'kustom' ? (
        <div className="bg-[#131c33] border border-slate-700/70 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
              <PencilRuler className="w-4 h-4 text-sky-400" />
              Gambar Bentuk Balok Kustom (Maks 5×5)
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Klik kotak di samping untuk membuat bentuk unik lalu masukkan ke{' '}
              <span className="text-indigo-300 font-semibold">
                {SLOT_NAMES[activeSlot]}
              </span>
              .
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyCustomPiece}
                disabled={!customGrid.some((r) => r.some(Boolean))}
                className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Check className="w-3.5 h-3.5" />
                Pasang ke Slot #{activeSlot + 1}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomGrid(
                    Array.from({ length: 5 }, () => Array(5).fill(false))
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Bersihkan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-700">
            {customGrid.map((row, r) =>
              row.map((active, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => toggleCustomCell(r, c)}
                  className={`w-8 h-8 rounded-md transition ${
                    active
                      ? 'bg-sky-400 bb-tile-filled'
                      : 'bg-[#1b2644] hover:bg-[#26365e] border border-slate-800'
                  }`}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[250px] overflow-y-auto pr-1">
          {filteredCatalog.map((piece) => (
            <button
              key={piece.id}
              type="button"
              onClick={() => handlePickCatalogPiece(piece)}
              title={`${piece.name} — Klik untuk pasang ke ${SLOT_NAMES[activeSlot]}`}
              className="group bg-[#131c33] hover:bg-indigo-950/70 border border-slate-800 hover:border-indigo-400/80 rounded-xl p-2 flex flex-col items-center justify-center min-h-[72px] transition"
            >
              <div className="flex-1 flex items-center justify-center">
                <MiniPiecePreview piece={piece} cellSize={10} />
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-200 mt-1 truncate max-w-full">
                {piece.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
