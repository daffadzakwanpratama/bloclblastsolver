import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardPaste,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import {
  CalibrationRect,
  detectFromImageElement,
} from '../utils/screenshotDetector';
import { Grid8x8, PieceShape } from '../types';

interface ScreenshotUploaderProps {
  onDetected: (board: Grid8x8, pieces: (PieceShape | null)[]) => void;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  onDetected,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<CalibrationRect | null>(null);
  const [detectedBoard, setDetectedBoard] = useState<Grid8x8 | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [showCalibration, setShowCalibration] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setCalibration(null);
    setStatusMsg('Mendeteksi papan 8×8 & 3 balok dari screenshot...');
  };

  // Global Ctrl+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const runDetection = async (
    imgEl: HTMLImageElement,
    overrideCal?: CalibrationRect
  ) => {
    try {
      const res = await detectFromImageElement(imgEl, overrideCal);
      setCalibration(res.calibration);
      setDetectedBoard(res.board);
      setConfidence(res.confidence);
      onDetected(res.board, res.pieces);
      const foundPiecesCount = res.pieces.filter(Boolean).length;
      setStatusMsg(
        `Terdeteksi otomatis! (${foundPiecesCount}/3 balok terbaca • Akurasi grid ~${res.confidence}%). Silakan klik papan/balok jika perlu koreksi.`
      );
    } catch {
      setStatusMsg(
        'Gagal memproses gambar. Pastikan gambar adalah screenshot penuh Block Blast.'
      );
    }
  };

  const handleCalChange = (key: keyof CalibrationRect, val: number) => {
    if (!calibration || !imgRef.current) return;
    const nextCal = { ...calibration, [key]: val };
    setCalibration(nextCal);
    runDetection(imgRef.current, nextCal);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Scan Otomatis dari Screenshot
            </h2>
            <p className="text-xs text-slate-400">
              Upload screenshot game HP atau tekan{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono text-slate-200">
                Ctrl+V
              </kbd>{' '}
              untuk paste langsung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Pilih Screenshot
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => {
                setImageUrl(null);
                setCalibration(null);
                setDetectedBoard(null);
                setStatusMsg(null);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Tutup preview screenshot"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!imageUrl ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) processFile(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-[#131c33]/60 hover:bg-[#131c33] rounded-xl p-4 text-center cursor-pointer transition flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <ClipboardPaste className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-emerald-300">
              Tarik & lepas screenshot Block Blast ke sini
            </span>{' '}
            atau klik untuk memilih gambar (mendukung Android, iOS & tablet)
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {statusMsg && (
            <div className="flex items-center justify-between gap-2 bg-emerald-950/50 border border-emerald-700/50 rounded-xl px-3 py-2 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCalibration((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1 shrink-0 font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showCalibration ? 'Tutup Kalibrasi' : 'Kalibrasi Kotak'}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Screenshot Preview with Live 8x8 + Tray Overlay */}
            <div className="relative mx-auto sm:mx-0 max-w-[210px] rounded-xl overflow-hidden border border-slate-700 shadow-lg shrink-0">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Screenshot Block Blast"
                onLoad={(e) => runDetection(e.currentTarget)}
                className="w-full h-auto block"
              />

              {calibration && (
                <>
                  {/* 8x8 Board Overlay */}
                  <div
                    style={{
                      left: `${calibration.boardX * 100}%`,
                      top: `${calibration.boardY * 100}%`,
                      width: `${calibration.boardSize * 100}%`,
                      aspectRatio: '1 / 1',
                    }}
                    className="absolute border-2 border-emerald-400 grid grid-cols-8 grid-rows-8 pointer-events-none"
                  >
                    {detectedBoard?.map((row, r) =>
                      row.map((filled, c) => (
                        <div
                          key={`${r}-${c}`}
                          className={`border border-emerald-400/30 ${
                            filled ? 'bg-emerald-400/30' : ''
                          }`}
                        />
                      ))
                    )}
                  </div>

                  {/* 3-Piece Tray Overlay */}
                  <div
                    style={{
                      left: `${calibration.boardX * 100}%`,
                      top: `${calibration.trayY * 100}%`,
                      width: `${calibration.boardSize * 100}%`,
                      height: `${calibration.trayHeight * 100}%`,
                    }}
                    className="absolute border-2 border-amber-400 grid grid-cols-3 pointer-events-none"
                  >
                    <div className="border-r border-amber-400/50" />
                    <div className="border-r border-amber-400/50" />
                    <div />
                  </div>
                </>
              )}
            </div>

            {showCalibration && calibration && (
              <div className="flex-1 w-full bg-[#131c33] border border-slate-700/80 rounded-xl p-3 space-y-2.5 text-xs">
                <div className="font-bold text-slate-200 mb-1">
                  Sesuaikan Garis Hijau (Papan 8×8) & Kuning (3 Balok)
                </div>

                <label className="block">
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Posisi Vertikal Papan (Y)</span>
                    <span>{Math.round(calibration.boardY * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={0.55}
                    step={0.005}
                    value={calibration.boardY}
                    onChange={(e) =>
                      handleCalChange('boardY', parseFloat(e.target.value))
                    }
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Posisi Horizontal Papan (X)</span>
                    <span>{Math.round(calibration.boardX * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={0.35}
                    step={0.005}
                    value={calibration.boardX}
                    onChange={(e) =>
                      handleCalChange('boardX', parseFloat(e.target.value))
                    }
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Lebar / Ukuran Papan</span>
                    <span>{Math.round(calibration.boardSize * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={0.98}
                    step={0.005}
                    value={calibration.boardSize}
                    onChange={(e) =>
                      handleCalChange('boardSize', parseFloat(e.target.value))
                    }
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Posisi Vertikal Tray 3 Balok</span>
                    <span>{Math.round(calibration.trayY * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.45}
                    max={0.9}
                    step={0.005}
                    value={calibration.trayY}
                    onChange={(e) =>
                      handleCalChange('trayY', parseFloat(e.target.value))
                    }
                    className="w-full accent-amber-400"
                  />
                </label>

                <p className="text-[11px] text-slate-400 pt-1">
                  Akurasi kontras saat ini: <strong>{confidence}%</strong>. Jika
                  ada 1-2 kotak meleset karena efek animasi, klik langsung di Papan
                  8×8 untuk mengoreksinya.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
