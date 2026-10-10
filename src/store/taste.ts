import type { L, StyleProfile } from '../engine/types';
import { COLOR_L, MATERIAL_L, MOOD_L } from './labels';
import { MOODS, type Color, type Criteria, type Material, type Mood, type Product } from './types';

/**
 * 내 스타일을 에이전트 순위에 반영하는 규칙.
 * - 무드·자주 입는 색은 가산, 피하는 색은 감산. 순위만 바꾸고 확신도(요청 일치도)는 건드리지 않는다.
 * - 피하는 소재만 후보에서 뺀다.
 * - 요청이 항상 우선: 요청에 스타일(또는 해석 못 한 스타일 표현)이 있으면 무드를, 색이 있으면 색 취향을,
 *   요청에 적힌 소재는 피하는 소재에서 끈다.
 */

/** 취향 점수가 순위에 미치는 무게. 요청 점수 차이가 이보다 크면 순서를 뒤집지 못한다. */
export const TASTE_WEIGHT = 0.08;
export const MAX_MOODS = 3;

const COLORS = Object.keys(COLOR_L) as Color[];
const MATERIALS = Object.keys(MATERIAL_L) as Material[];

/** 저장값·입력값을 어휘 안으로 거른다. 무드는 3개까지, 같은 색은 '피하는 색'에서 뺀다. */
export function cleanProfile(raw: unknown): StyleProfile {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(xs: unknown, allowed: readonly T[]) =>
    Array.isArray(xs) ? [...new Set(xs.filter((x): x is T => typeof x === 'string' && (allowed as readonly string[]).includes(x)))] : [];
  const likeColors = pick(o.likeColors, COLORS);
  return {
    moods: pick(o.moods, MOODS).slice(0, MAX_MOODS),
    likeColors,
    avoidColors: pick(o.avoidColors, COLORS).filter((c) => !likeColors.includes(c)),
    avoidMaterials: pick(o.avoidMaterials, MATERIALS),
  };
}

export const isEmptyProfile = (p?: StyleProfile) => !p || (!p.moods.length && !p.likeColors.length && !p.avoidColors.length && !p.avoidMaterials.length);

/** '화려한' 같은 해석 못 한 꾸밈말도 스타일 요청으로 본다 */
const STYLE_WORD = /(한|스러운|적인|틱한|느낌|스타일|룩)$/;

/** 이번 요청에서 실제로 쓸 취향. 요청에 같은 종류의 조건이 있으면 그 부분은 끈다. */
export interface Applied {
  moods: Mood[];
  likeColors: Color[];
  avoidColors: Color[];
  /** 울을 피하면 울 혼방도 피한다 */
  avoidMaterials: Material[];
  /** 요청 때문에 꺼진 무드가 있는지 (칩에 '요청 우선'으로 보여준다) */
  moodsOverridden: boolean;
}

export function applyProfile(c: Criteria, p?: StyleProfile): Applied {
  const prof = cleanProfile(p);
  const styleAsked = c.styles.some((s) => s !== 'light' && s !== 'warm') || c.unknown.some((u) => STYLE_WORD.test(u));
  const colorAsked = c.colors.length > 0;
  let avoid = prof.avoidMaterials as Material[];
  if (avoid.includes('wool') && !avoid.includes('wool-blend')) avoid = [...avoid, 'wool-blend'];
  // 요청에 적은 소재는 피하는 소재여도 뺀다. '울'을 요청하면 울 혼방도 함께 허용한다
  avoid = avoid.filter((m) => !c.materials.includes(m) && !(m === 'wool-blend' && c.materials.includes('wool')));
  return {
    moods: styleAsked ? [] : (prof.moods as Mood[]),
    likeColors: colorAsked ? [] : (prof.likeColors as Color[]),
    avoidColors: colorAsked ? [] : (prof.avoidColors as Color[]),
    avoidMaterials: avoid,
    moodsOverridden: styleAsked && prof.moods.length > 0,
  };
}

/** 피하는 소재가 들어간 상품인지 */
export const avoided = (p: Product, a: Applied) => p.materials.some((m) => a.avoidMaterials.includes(m));

export interface Taste {
  /** -1 ~ 2. 무드 일치 +1, 자주 입는 색 +1, 피하는 색 -1 */
  pref: number;
  mood?: Mood;
  like?: Color;
  avoid?: Color;
}

export function tasteOf(p: Product, a: Applied): Taste {
  const mood = a.moods.find((m) => p.styles.includes(m));
  const like = a.likeColors.find((c) => p.colors.includes(c));
  const avoid = a.avoidColors.find((c) => p.colors.includes(c));
  return { pref: (mood ? 1 : 0) + (like ? 1 : 0) - (avoid ? 1 : 0), mood, like, avoid };
}

/** 요청 점수에 취향을 조금 더해 순위를 매긴다. 같은 순위면 기존처럼 낮은 가격 먼저. */
export function rankByTaste<T extends { score: number; product: Product }>(list: T[], a: Applied): T[] {
  const key = (s: T) => s.score + TASTE_WEIGHT * tasteOf(s.product, a).pref;
  return [...list].sort((x, y) => key(y) - key(x) || x.product.price - y.product.price);
}

/** 후보 근거 줄에 덧붙일 취향 설명. 없으면 null */
export function tasteReason(t: Taste): L | null {
  const ko: string[] = [];
  const en: string[] = [];
  if (t.mood) { ko.push(`내 스타일(${MOOD_L[t.mood].ko}) 일치`); en.push(`matches your style (${MOOD_L[t.mood].en})`); }
  if (t.like) { ko.push(`자주 입는 색(${COLOR_L[t.like].ko})`); en.push(`a color you wear (${COLOR_L[t.like].en})`); }
  if (t.avoid) { ko.push(`피하는 색(${COLOR_L[t.avoid].ko})`); en.push(`a color you avoid (${COLOR_L[t.avoid].en})`); }
  return ko.length ? { ko: ko.join(', '), en: en.join(', ') } : null;
}

/** 해석 칩: '내 스타일: 미니멀·클래식' 또는 '요청 우선' */
export function tasteChip(a: Applied, p?: StyleProfile): { label: L; value: L } | null {
  if (isEmptyProfile(p)) return null;
  const label = { ko: '내 스타일', en: 'My style' };
  if (a.moods.length) return { label, value: { ko: a.moods.map((m) => MOOD_L[m].ko).join('·'), en: a.moods.map((m) => MOOD_L[m].en).join(' · ') } };
  if (a.moodsOverridden) return { label, value: { ko: '요청 우선', en: 'Request first' } };
  if (a.likeColors.length || a.avoidColors.length || a.avoidMaterials.length) return { label, value: { ko: '색·소재 취향', en: 'Color & material' } };
  return null;
}

/** 기록용: '피하는 소재(울·울 혼방) 2개 제외' */
export function excludedNote(n: number, a: Applied): L {
  const mats = a.avoidMaterials.map((m) => MATERIAL_L[m]);
  return { ko: `피하는 소재(${mats.map((m) => m.ko).join('·')}) ${n}개 제외`, en: `${n} excluded for materials you avoid (${mats.map((m) => m.en).join(', ')})` };
}
