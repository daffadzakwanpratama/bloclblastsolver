import { PIECE_CATALOG } from './pieces';
import { Grid8x8, PieceShape } from '../types';

export interface GamePreset {
  id: string;
  title: string;
  subtitle: string;
  streak: number;
  board: Grid8x8;
  pieces: (PieceShape | null)[];
}

const byId = (id: string): PieceShape => {
  const found = PIECE_CATALOG.find((p) => p.id === id);
  if (!found) throw new Error(`Missing piece ${id}`);
  return found;
};

const gridFromStrings = (rows: string[]): Grid8x8 =>
  rows.map((r) => r.split('').map((ch) => ch === '#'));

export const GAME_PRESETS: GamePreset[] = [
  {
    id: 'rescue-3x3',
    title: 'Penyelamatan Kotak 3×3',
    subtitle: 'Papan sempit tanpa ruang 3×3! Lihat urutan pas pembuka jalan & Quadruple Clear.',
    streak: 5,
    board: gridFromStrings([
      '###..#..',
      '###.#.#.',
      '###..##.',
      '...#####',
      '#######.',
      '#######.',
      '###.###.',
      '###..#..',
    ]),
    pieces: [byId('box-3x3'), byId('line-1x3'), byId('line-3x1')],
  },
  {
    id: 'combo-cross',
    title: 'Combo Silang (Baris + Kolom)',
    subtitle: 'Susun Siku Besar 3×3, Huruf L, dan Garis 1×5 untuk jaga streak x8.',
    streak: 8,
    board: gridFromStrings([
      '##...###',
      '###..###',
      '....####',
      '###..#..',
      '######..',
      '###.###.',
      '..#.###.',
      '..#.###.',
    ]),
    pieces: [byId('corner3-br'), byId('l-up-right'), byId('line-1x5')],
  },
  {
    id: 'midgame-clean',
    title: 'Mid-Game Standar',
    subtitle: 'Contoh kondisi tengah permainan dengan 3 balok medium.',
    streak: 2,
    board: gridFromStrings([
      '........',
      '..###...',
      '..####..',
      '#####...',
      '######..',
      '####.##.',
      '###..###',
      '##...###',
    ]),
    pieces: [byId('rect-2x3'), byId('t-up'), byId('line-4x1')],
  },
];
