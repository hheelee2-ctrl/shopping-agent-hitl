import type { L } from '../engine/types';
import type { Category, Color, Material, Season, Style } from './types';

export type Dim = 'category' | 'color' | 'material' | 'season' | 'style' | 'budget';

export const DIM_L: Record<Dim, L> = {
  category: { ko: '종류', en: 'type' },
  color: { ko: '색상', en: 'color' },
  material: { ko: '소재', en: 'material' },
  season: { ko: '계절', en: 'season' },
  style: { ko: '스타일', en: 'style' },
  budget: { ko: '예산', en: 'budget' },
};

export const CATEGORY_L: Record<Category, L> = {
  coat: { ko: '코트', en: 'Coats' },
  jacket: { ko: '자켓', en: 'Jackets' },
  sneakers: { ko: '스니커즈', en: 'Sneakers' },
  loafers: { ko: '로퍼', en: 'Loafers' },
  knit: { ko: '니트', en: 'Knits' },
  shirt: { ko: '셔츠', en: 'Shirts' },
  pants: { ko: '팬츠', en: 'Pants' },
  bag: { ko: '가방', en: 'Bags' },
};

export const COLOR_L: Record<Color, L> = {
  black: { ko: '블랙', en: 'Black' },
  white: { ko: '화이트', en: 'White' },
  navy: { ko: '네이비', en: 'Navy' },
  beige: { ko: '베이지', en: 'Beige' },
  gray: { ko: '그레이', en: 'Gray' },
  brown: { ko: '브라운', en: 'Brown' },
  khaki: { ko: '카키', en: 'Khaki' },
  blue: { ko: '블루', en: 'Blue' },
};

export const MATERIAL_L: Record<Material, L> = {
  wool: { ko: '울', en: 'Wool' },
  'wool-blend': { ko: '울 혼방', en: 'Wool blend' },
  cotton: { ko: '코튼', en: 'Cotton' },
  leather: { ko: '레더', en: 'Leather' },
  denim: { ko: '데님', en: 'Denim' },
  cashmere: { ko: '캐시미어', en: 'Cashmere' },
  nylon: { ko: '나일론', en: 'Nylon' },
  canvas: { ko: '캔버스', en: 'Canvas' },
  polyester: { ko: '폴리에스터', en: 'Polyester' },
};

export const SEASON_L: Record<Season, L> = {
  spring: { ko: '봄', en: 'Spring' },
  summer: { ko: '여름', en: 'Summer' },
  autumn: { ko: '가을', en: 'Autumn' },
  winter: { ko: '겨울', en: 'Winter' },
};

export const STYLE_L: Record<Style, L> = {
  formal: { ko: '단정한', en: 'Formal' },
  casual: { ko: '캐주얼', en: 'Casual' },
  light: { ko: '가벼운', en: 'Light' },
  warm: { ko: '따뜻한', en: 'Warm' },
  minimal: { ko: '미니멀', en: 'Minimal' },
};
