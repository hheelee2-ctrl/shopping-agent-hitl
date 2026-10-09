// 서버 함수(api/parse.ts)가 Node ESM으로 직접 불러오므로 런타임 import에는 확장자(.js)를 붙이고, 의존성 없는 모듈만 쓴다
import type { L } from '../engine/types';
import type { Parsed } from '../store/parser';
import { CATEGORY_L, COLOR_L, MATERIAL_L, SEASON_L, STYLE_L } from '../store/labels.js';
import { MAX_ITEMS, SIZE_SETS, type Category, type Color, type Criteria, type Material, type Season, type Style } from '../store/types.js';

/**
 * LLM 요청 해석의 계약. 서버(api/parse.ts)와 클라이언트가 같은 파일을 쓴다.
 * LLM은 규칙 파서와 같은 Parsed 구조를 돌려주고, 클라이언트는 받은 값을 이 파일의 sanitize로 다시 걸러서만 쓴다.
 * 에이전트가 담기·결제 전에 묻는 구조는 그대로라, 해석이 틀려도 사람이 승인 전에 본다.
 */

const CATS = Object.keys(CATEGORY_L) as Category[];
const COLORS = Object.keys(COLOR_L) as Color[];
const MATS = Object.keys(MATERIAL_L) as Material[];
const SEASONS = Object.keys(SEASON_L) as Season[];
const STYLES = Object.keys(STYLE_L) as Style[];
const SIZES = [...new Set(Object.values(SIZE_SETS).flat())];

/** 요청 길이 상한. 서버도 이보다 긴 요청은 받지 않는다. */
export const MAX_REQUEST = 200;

export const SYSTEM = `You turn a shopping request for a small fashion shop into search criteria.
The request is usually Korean, sometimes English. Output only what the request states or clearly implies.

Vocabulary (use these ids only):
- category: ${CATS.join(', ')}
- colors: ${COLORS.join(', ')}
- materials: ${MATS.join(', ')}
- seasons: ${SEASONS.join(', ')}
- styles: ${STYLES.join(', ')}
- size: one of ${SIZES.join(', ')}. Tops use XS-XXL, shoes use mm (230-290), pants use waist inches (25-36).

Rules:
- Group words like "아우터"/"outerwear" (coat, jacket), "신발" (sneakers, loafers), "상의" (knit, shirt) go in "categories" with "category" null. A single specific kind goes in "category".
- Prices are KRW integers. "20만원 이하" means maxPrice 200000. "10만원 이상" means minPrice 100000.
- Several products in one request ("코트랑 로퍼") become separate items, at most ${MAX_ITEMS}. A total for everything ("합쳐서 35만원") goes in "budget", not maxPrice. With a single item, a total is that item's maxPrice.
- Delivery deadlines: "금요일까지" is weekday 5 (Sunday 0 ... Saturday 6). "내일까지" is days 1, "오늘" days 0.
- Words that matter to the shopper but fit no field (a brand you do not know, "힙한", a pattern) go in "unknown" as the original word. Filler words do not.
- Do not invent preferences. Leave a field empty or null when the request does not say it.`;

// 구조화 출력이 문서로 지원하는 형태(anyOf)로만 null을 허용한다
const nullable = (type: string) => ({ anyOf: [{ type }, { type: 'null' }] });
const enumArray = (values: string[]) => ({ type: 'array', items: { type: 'string', enum: values } });

const ITEM = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'categories', 'colors', 'materials', 'seasons', 'styles', 'maxPrice', 'minPrice', 'size', 'deliverBy', 'unknown'],
  properties: {
    category: { anyOf: [{ type: 'string', enum: CATS }, { type: 'null' }] },
    categories: enumArray(CATS),
    colors: enumArray(COLORS),
    materials: enumArray(MATS),
    seasons: enumArray(SEASONS),
    styles: enumArray(STYLES),
    maxPrice: nullable('integer'),
    minPrice: nullable('integer'),
    size: { anyOf: [{ type: 'string', enum: SIZES }, { type: 'null' }] },
    deliverBy: {
      anyOf: [
        { type: 'object', additionalProperties: false, required: ['weekday', 'days'], properties: { weekday: nullable('integer'), days: nullable('integer') } },
        { type: 'null' },
      ],
    },
    unknown: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'budget'],
  properties: {
    items: { type: 'array', items: ITEM },
    budget: nullable('integer'),
  },
} as const;

const pick = <T extends string>(xs: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(xs) ? [...new Set(xs.filter((x): x is T => typeof x === 'string' && (allowed as readonly string[]).includes(x)))] : [];
const won = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 100_000_000 ? Math.round(x) : undefined);
const join = (cats: Category[]): L => ({ ko: cats.map((c) => CATEGORY_L[c].ko).join('·'), en: cats.map((c) => CATEGORY_L[c].en).join(' & ') });

/** LLM이 돌려준 JSON을 규칙 파서와 같은 Parsed로. 어휘 밖의 값·이상한 숫자는 버린다. 쓸 수 없으면 null. */
export function sanitize(raw: unknown): Parsed | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { items?: unknown; budget?: unknown };
  if (!Array.isArray(r.items) || r.items.length === 0) return null;
  const items: Criteria[] = r.items.slice(0, MAX_ITEMS).map((it): Criteria => {
    const o = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
    const category = pick([o.category], CATS)[0];
    const categories = category ? [] : pick(o.categories, CATS);
    const dl = (o.deliverBy && typeof o.deliverBy === 'object' ? o.deliverBy : null) as { weekday?: unknown; days?: unknown } | null;
    const weekday = typeof dl?.weekday === 'number' && dl.weekday >= 0 && dl.weekday <= 6 ? Math.round(dl.weekday) : undefined;
    const days = typeof dl?.days === 'number' && dl.days >= 0 && dl.days <= 14 ? Math.round(dl.days) : undefined;
    const size = pick([o.size], SIZES)[0];
    return {
      category,
      ...(categories.length > 1 ? { categories, group: join(categories) } : categories.length === 1 ? { category: categories[0] } : {}),
      colors: pick(o.colors, COLORS),
      materials: pick(o.materials, MATS),
      seasons: pick(o.seasons, SEASONS),
      styles: pick(o.styles, STYLES),
      maxPrice: won(o.maxPrice),
      minPrice: won(o.minPrice),
      size,
      deliverBy: weekday !== undefined ? { weekday } : days !== undefined ? { days } : undefined,
      unknown: Array.isArray(o.unknown) ? o.unknown.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim().slice(0, 20)).slice(0, 5) : [],
    };
  });
  const budget = items.length > 1 ? won(r.budget) : undefined;
  return { items, budget };
}
