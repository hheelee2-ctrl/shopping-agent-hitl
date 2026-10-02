import type { L } from '../engine/types';
import { DIM_L, type Dim } from './labels';
import type { Criteria, Product } from './types';

export interface Scored {
  product: Product;
  /** 0~1. 지정된 조건에 대한 가중 일치도. */
  score: number;
  matched: Dim[];
  partial: Dim[];
  missed: Dim[];
}

const WEIGHT: Record<Exclude<Dim, 'category'>, number> = {
  color: 0.25,
  material: 0.2,
  season: 0.15,
  style: 0.15,
  budget: 0.25,
};

export function scoreProduct(p: Product, c: Criteria): Scored | null {
  if (c.category && p.category !== c.category) return null;

  const matched: Dim[] = [];
  const partial: Dim[] = [];
  const missed: Dim[] = [];
  let total = 0;
  let got = 0;

  const add = (dim: Exclude<Dim, 'category'>, m: number) => {
    total += WEIGHT[dim];
    got += WEIGHT[dim] * m;
    (m === 1 ? matched : m > 0 ? partial : missed).push(dim);
  };

  if (c.colors.length) add('color', c.colors.some((x) => p.colors.includes(x)) ? 1 : 0);
  if (c.materials.length) {
    const exact = c.materials.some((x) => p.materials.includes(x));
    const blend = !exact && c.materials.includes('wool') && p.materials.includes('wool-blend');
    add('material', exact ? 1 : blend ? 0.5 : 0);
  }
  if (c.seasons.length) add('season', c.seasons.some((x) => p.seasons.includes(x)) ? 1 : 0);
  if (c.styles.length) add('style', c.styles.some((x) => p.styles.includes(x)) ? 1 : 0);
  if (c.maxPrice !== undefined || c.minPrice !== undefined) {
    const ok = (c.maxPrice === undefined || p.price <= c.maxPrice) && (c.minPrice === undefined || p.price >= c.minPrice);
    add('budget', ok ? 1 : 0);
  }

  return { product: p, score: total === 0 ? 1 : got / total, matched, partial, missed };
}

/** 점수 내림차순, 같으면 낮은 가격 먼저. 사람의 검색창과 에이전트가 같이 쓴다. */
export function searchProducts(products: Product[], c: Criteria): Scored[] {
  return products
    .map((p) => scoreProduct(p, c))
    .filter((s): s is Scored => s !== null)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price);
}

export const isEligible = (s: Scored) => !s.missed.includes('budget') && s.product.stock > 0;

const list = (dims: Dim[], lang: keyof L) => dims.map((d) => DIM_L[d][lang]).join('·');

/** 일치/불일치 근거를 한 줄로. */
export function reasonOf(s: Scored): L {
  const part = (lang: keyof L) => {
    const out: string[] = [];
    if (s.matched.length) out.push(lang === 'ko' ? `${list(s.matched, lang)} 일치` : `${list(s.matched, lang)} match`);
    if (s.partial.length) out.push(lang === 'ko' ? `${list(s.partial, lang)} 부분 일치` : `${list(s.partial, lang)} partial`);
    const budget = s.missed.includes('budget');
    const others = s.missed.filter((d) => d !== 'budget');
    if (others.length) out.push(lang === 'ko' ? `${list(others, lang)} 불일치` : `${list(others, lang)} mismatch`);
    if (budget) out.push(lang === 'ko' ? '예산 초과' : 'over budget');
    if (out.length === 0) out.push(lang === 'ko' ? '종류만 일치 (구분할 조건이 적음)' : 'Type only (few criteria to tell apart)');
    return out.join(' · ');
  };
  return { ko: part('ko'), en: part('en') };
}
