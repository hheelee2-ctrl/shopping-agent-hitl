import type { L } from '../engine/types';
import { CATEGORY_L, COLOR_L, DIM_L, MATERIAL_L, SEASON_L, STYLE_L } from './labels';
import type { Category, Color, Criteria, Material, Season, Style } from './types';

type Dict<T extends string> = [T, string[]][];

const CATEGORIES: Dict<Category> = [
  ['coat', ['코트', 'coat']],
  ['jacket', ['자켓', '재킷', '점퍼', '바람막이', '블루종', '블레이저', 'jacket']],
  ['sneakers', ['스니커즈', '스니커', '운동화', 'sneaker']],
  ['loafers', ['로퍼', 'loafer']],
  ['knit', ['니트', '스웨터', 'knit']],
  ['shirt', ['셔츠', 'shirt']],
  ['pants', ['바지', '팬츠', '슬랙스', '청바지', 'pants']],
  ['bag', ['가방', '백팩', '토트', 'bag']],
];
const COLORS: Dict<Color> = [
  ['black', ['블랙', '검정', '검은', '까만', 'black']],
  ['white', ['화이트', '하얀', '흰', 'white']],
  ['navy', ['네이비', '남색', 'navy']],
  ['beige', ['베이지', 'beige']],
  ['gray', ['그레이', '회색', 'gray', 'grey']],
  ['brown', ['브라운', '갈색', 'brown']],
  ['khaki', ['카키', 'khaki']],
  ['blue', ['블루', '파란', 'blue']],
];
const MATERIALS: Dict<Material> = [
  ['cashmere', ['캐시미어', 'cashmere']],
  ['wool', ['울', 'wool']],
  ['cotton', ['코튼', '순면', 'cotton']],
  ['leather', ['레더', '가죽', 'leather']],
  ['denim', ['데님', 'denim']],
  ['nylon', ['나일론', 'nylon']],
  ['canvas', ['캔버스', 'canvas']],
];
const SEASONS: Dict<Season> = [
  ['spring', ['봄', 'spring']],
  ['summer', ['여름', 'summer']],
  ['autumn', ['가을', 'autumn', 'fall']],
  ['winter', ['겨울', 'winter']],
];
const STYLES: Dict<Style> = [
  ['formal', ['단정', '포멀', '격식', '깔끔', 'formal']],
  ['casual', ['캐주얼', '편한', 'casual']],
  ['light', ['가벼운', '가볍', 'light']],
  ['warm', ['따뜻', '보온', 'warm']],
  ['minimal', ['미니멀', '심플', 'minimal']],
];

const STOP = new Set([
  '추천', '해줘', '해주세요', '찾아줘', '찾아', '사줘', '좀', '한', '켤레', '개', '입기', '좋은', '있는', '같은',
  '정도', '이하', '이상', '원', '만', '에서', '으로', '하고', '그리고', '주세요', '싶어', '싶은', '어울리는',
  '요즘', '오늘', '같이', '둘다', '모두', '각각', '합쳐서', '합쳐', '합계', '해서', '총', 'and', 'a', 'an', 'the', 'for', 'me', 'find', 'under', 'good',
]);

function take<T extends string>(text: string, dict: Dict<T>): { found: T[]; rest: string } {
  const found: T[] = [];
  let rest = text;
  for (const [value, words] of dict) {
    for (const w of words) {
      if (rest.includes(w)) {
        if (!found.includes(value)) found.push(value);
        rest = rest.split(w).join(' ');
      }
    }
  }
  return { found, rest };
}

const num = (s: string) => Math.round(parseFloat(s.replace(/,/g, '')) * 1);

/** 규칙 기반 요청 해석. 모르는 표현은 unknown으로 남겨 에이전트가 Escalation하게 한다. */
export function parseRequest(input: string): Criteria {
  let text = input.toLowerCase();
  let maxPrice: number | undefined;
  let minPrice: number | undefined;

  const take$ = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = text.match(re);
    if (m) {
      fn(m);
      text = text.replace(re, ' ');
    }
  };
  take$(/(\d+(?:\.\d+)?)\s*만\s*원?\s*(이하|미만|까지|안쪽|이내|아래)/, (m) => (maxPrice = num(m[1]) * 10000));
  take$(/(\d+(?:\.\d+)?)\s*만\s*원?\s*(이상|넘는|부터)/, (m) => (minPrice = num(m[1]) * 10000));
  take$(/예산\s*(\d+(?:\.\d+)?)\s*만\s*원?/, (m) => (maxPrice = num(m[1]) * 10000));
  take$(/(\d[\d,]{3,})\s*원\s*(이하|미만|까지|이내)/, (m) => (maxPrice = num(m[1])));
  take$(/(\d[\d,]{3,})\s*원\s*(이상|부터)/, (m) => (minPrice = num(m[1])));
  take$(/under\s*(\d[\d,]*)/, (m) => (maxPrice = num(m[1])));

  const cat = take(text, CATEGORIES);
  const color = take(cat.rest, COLORS);
  const mat = take(color.rest, MATERIALS);
  const season = take(mat.rest, SEASONS);
  const style = take(season.rest, STYLES);

  const unknown = style.rest
    .split(/[\s,./·!?]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));

  return {
    category: cat.found[0],
    colors: color.found,
    materials: mat.found,
    seasons: season.found,
    styles: style.found,
    maxPrice,
    minPrice,
    unknown,
  };
}

export interface Chip {
  label: L;
  value: L;
}

const join = (ls: L[]): L => ({ ko: ls.map((l) => l.ko).join(' · '), en: ls.map((l) => l.en).join(' · ') });
const won = (n: number): L => ({ ko: `${n.toLocaleString('ko-KR')}원`, en: `KRW ${n.toLocaleString('en-US')}` });

/** 해석 결과를 사람이 확인할 수 있는 칩 목록으로 바꾼다. */
export function describeCriteria(c: Criteria): Chip[] {
  const chips: Chip[] = [];
  if (c.category) chips.push({ label: DIM_L.category, value: CATEGORY_L[c.category] });
  if (c.colors.length) chips.push({ label: DIM_L.color, value: join(c.colors.map((x) => COLOR_L[x])) });
  if (c.materials.length) chips.push({ label: DIM_L.material, value: join(c.materials.map((x) => MATERIAL_L[x])) });
  if (c.seasons.length) chips.push({ label: DIM_L.season, value: join(c.seasons.map((x) => SEASON_L[x])) });
  if (c.styles.length) chips.push({ label: DIM_L.style, value: join(c.styles.map((x) => STYLE_L[x])) });
  if (c.maxPrice !== undefined) {
    const v = won(c.maxPrice);
    chips.push({ label: DIM_L.budget, value: { ko: `${v.ko} 이하`, en: `up to ${v.en}` } });
  }
  if (c.minPrice !== undefined) {
    const v = won(c.minPrice);
    chips.push({ label: DIM_L.budget, value: { ko: `${v.ko} 이상`, en: `from ${v.en}` } });
  }
  return chips;
}

export interface Parsed {
  items: Criteria[];
  /** 요청 전체에 걸린 합계 예산("합쳐서 30만원"). 항목별 가격 상한(maxPrice)과 다르다. */
  budget?: number;
}

const BUDGET_RE = /(?:합쳐서|합쳐|합계|총|다 합쳐서|전부 해서|모두 해서)\s*(\d+(?:\.\d+)?)\s*만\s*원?\s*(?:이하|미만|까지|안쪽|이내|아래|으로|에)?/;
const EN_BUDGET_RE = /\b(?:in total|total|combined|altogether)\s*(?:of\s*)?(?:under|up to|max|within)?\s*(\d[\d,]{3,})/i;
const SPLIT_RE = /(?:이랑|랑|하고|과|와|,|그리고|및)\s+|\s+and\s+/;
export const MAX_ITEMS = 3;

/**
 * 한 요청에 여러 상품이 있으면 항목으로 나눈다("검정 울 코트랑 가죽 로퍼, 합쳐서 35만원").
 * 나눈 조각마다 종류가 하나씩 잡힐 때만 나눈다 — 그렇지 않으면 단일 요청으로 둔다(오탐 방지).
 */
export function parseMulti(input: string): Parsed {
  let text = input;
  let budget: number | undefined;
  const m = text.toLowerCase().match(BUDGET_RE);
  const en = text.match(EN_BUDGET_RE);
  if (m) {
    budget = num(m[1]) * 10000;
    text = text.replace(new RegExp(BUDGET_RE.source, 'i'), ' ');
  } else if (en) {
    budget = num(en[1]);
    text = text.replace(EN_BUDGET_RE, ' ');
  }
  const parts = text.split(SPLIT_RE).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.length <= MAX_ITEMS) {
    const items = parts.map(parseRequest);
    if (items.every((c) => c.category)) return { items, budget };
  }
  const single = parseRequest(text);
  // 상품이 하나뿐이면 합계 예산은 그 상품의 가격 상한과 같다
  return { items: [budget !== undefined && single.maxPrice === undefined ? { ...single, maxPrice: budget } : single], budget: undefined };
}
