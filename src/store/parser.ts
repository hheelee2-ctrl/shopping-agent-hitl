import type { L } from '../engine/types';
import { CATEGORY_L, COLOR_L, DIM_L, MATERIAL_L, SEASON_L, STYLE_L } from './labels';
import { weekdayL } from './sellers';
import type { Category, Color, Criteria, Material, Season, Style } from './types';

type Dict<T extends string> = [T, string[]][];

// 카탈로그에 없는 종류(패딩, 맨투맨, 구두 등)는 가장 가까운 종류로 잇는다
const CATEGORIES: Dict<Category> = [
  ['coat', ['코트', '트렌치', '롱패딩', '파카', 'coat', 'trench', 'parka']],
  ['jacket', ['자켓', '재킷', '점퍼', '잠바', '바람막이', '블루종', '블레이저', '패딩', '야상', 'jacket', 'blazer', 'windbreaker', 'puffer', 'padding']],
  ['sneakers', ['스니커즈', '스니커', '운동화', 'sneaker', 'trainers']],
  ['loafers', ['로퍼', '구두', 'loafer', 'dress shoes']],
  ['knit', ['니트', '스웨터', '터틀넥', '가디건', '맨투맨', '후드', 'knit', 'sweater', 'turtleneck', 'cardigan', 'sweatshirt', 'hoodie']],
  ['shirt', ['셔츠', '블라우스', '남방', 'shirt', 'blouse']],
  ['pants', ['바지', '팬츠', '슬랙스', '청바지', '치노', 'pants', 'trousers', 'slacks', 'jeans', 'chinos', 'shorts']],
  ['bag', ['가방', '백팩', '토트', 'bag', 'backpack', 'tote']],
];

/** 묶음 표현. 구체적인 종류가 함께 오면 그쪽을 따른다("아우터 코트" → 코트). */
const GROUPS: { cats: Category[]; label: L; words: string[] }[] = [
  { cats: ['coat', 'jacket'], label: { ko: '아우터', en: 'Outerwear' }, words: ['아우터', '외투', '겉옷', 'outerwear', 'outer'] },
  { cats: ['knit', 'shirt'], label: { ko: '상의', en: 'Tops' }, words: ['상의', 'tops'] },
  { cats: ['pants'], label: { ko: '하의', en: 'Bottoms' }, words: ['하의', 'bottoms'] },
  { cats: ['sneakers', 'loafers'], label: { ko: '신발', en: 'Shoes' }, words: ['신발', 'shoes', 'footwear'] },
];

function takeGroup(text: string): { cats: Category[]; labels: L[]; rest: string } {
  const cats: Category[] = [];
  const labels: L[] = [];
  let rest = text;
  for (const g of GROUPS) {
    const hit = g.words.filter((w) => rest.includes(w));
    if (!hit.length) continue;
    for (const w of hit) rest = rest.split(w).join(' ');
    labels.push(g.label);
    for (const c of g.cats) if (!cats.includes(c)) cats.push(c);
  }
  return { cats, labels, rest };
}
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
  ['formal', ['단정', '포멀', '격식', '깔끔', '출근용', '출근', '하객', 'formal', 'office', 'work']],
  ['casual', ['캐주얼', '편한', '데일리', '주말', 'casual']],
  ['light', ['가벼운', '가볍', 'light']],
  ['warm', ['따뜻', '보온', '두툼', 'warm']],
  ['minimal', ['미니멀', '심플', 'minimal']],
];

const STOP = new Set([
  '추천', '해줘', '해주세요', '찾아줘', '찾아', '사줘', '좀', '한', '켤레', '개', '입기', '좋은', '있는', '같은',
  '정도', '이하', '이상', '원', '만', '에서', '으로', '하고', '그리고', '주세요', '싶어', '싶은', '어울리는',
  '요즘', '오늘', '와이드', '룩', '코디', '느낌', '중에', '중에서', '입을', '신을', '들', '같이', '둘다', '모두', '각각', '합쳐서', '합쳐', '합계', '해서', '총', 'and', 'a', 'an', 'the', 'for', 'me', 'find', 'under', 'good',
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
const SIZE_WORDS: [RegExp, string][] = [
  [/엑스라지|extra\s*large/i, 'XL'], [/스몰|small/i, 'S'], [/미디엄|medium/i, 'M'], [/라지|large/i, 'L'],
];

/** 요청에서 사이즈를 뽑는다. 뽑은 부분은 지워서 unknown으로 남지 않게 한다. */
function takeSize(text: string): { size?: string; rest: string } {
  for (const [re, v] of SIZE_WORDS) if (re.test(text)) return { size: v, rest: text.replace(re, ' ') };
  // 알파벳 사이즈: 'M 사이즈', 'size L'처럼 표시가 있거나, 대문자 단독 토큰일 때만
  const marked = text.match(/(?:^|[\s,])(xxl|xl|xs|s|m|l)\s*(?:사이즈|size)(?=$|[\s,.])/i) ?? text.match(/\bsize\s*(xxl|xl|xs|s|m|l)\b/i);
  if (marked) return { size: marked[1].toUpperCase(), rest: text.replace(marked[0], ' ') };
  const bare = text.match(/(?:^|[\s,])(XXL|XL|XS|S|M|L)(?=$|[\s,.])/);
  if (bare) return { size: bare[1], rest: text.replace(bare[0], ' ') };
  const shoe = text.match(/(?:^|[\s,])(2[2-9][05])\s*(?:mm|사이즈)?(?=$|[\s,.])/);
  if (shoe) return { size: shoe[1], rest: text.replace(shoe[0], ' ') };
  const waist = text.match(/(?:^|[\s,])(2[6-9]|3[0-6])\s*(?:인치|사이즈)(?=$|[\s,.])/);
  if (waist) return { size: waist[1], rest: text.replace(waist[0], ' ') };
  return { rest: text };
}

const WEEKDAYS: [RegExp, number][] = [
  [/일요일|sunday/, 0], [/월요일|monday/, 1], [/화요일|tuesday/, 2], [/수요일|wednesday/, 3],
  [/목요일|thursday/, 4], [/금요일|friday/, 5], [/토요일|saturday/, 6],
];

/** "금요일까지", "내일까지 받아야 해", "이번 주 안에", "by friday" → 도착 마감. 뽑은 부분은 지운다. */
export function takeDeadline(input: string): { deliverBy?: { weekday?: number; days?: number }; rest: string } {
  const text = input;
  const tail = '\\s*(?:까지|전에|안에|내로|이내)?\\s*(?:도착|받(?:아야|을\\s*수\\s*있게|고\\s*싶|게)?\\s*(?:해|돼|하는|함|어)?)?';
  const tries: [RegExp, { weekday?: number; days?: number }][] = [
    [new RegExp(`(?:오늘)${tail}(?=$|[\\s,.])`), { days: 0 }],
    [new RegExp(`(?:내일)${tail}(?=$|[\\s,.])`), { days: 1 }],
    [new RegExp(`(?:모레)${tail}(?=$|[\\s,.])`), { days: 2 }],
    [new RegExp(`(?:이번\\s*주)${tail}(?=$|[\\s,.])`), { weekday: 6 }],
    [/\bby\s+tomorrow\b/i, { days: 1 }],
  ];
  for (const [re, spec] of tries) {
    const m = text.match(re);
    if (m && /까지|전에|안에|내로|이내|도착|받|by/.test(m[0])) return { deliverBy: spec, rest: text.replace(m[0], ' ') };
  }
  for (const [w, n] of WEEKDAYS) {
    const re = new RegExp(`(?:이번\\s*주\\s*)?(?:${w.source})${tail}`, 'i');
    const m = text.match(re);
    if (m && /까지|전에|안에|내로|이내|도착|받/.test(m[0])) return { deliverBy: { weekday: n }, rest: text.replace(m[0], ' ') };
    const en = text.match(new RegExp(`\\bby\\s+(?:${w.source})\\b`, 'i'));
    if (en) return { deliverBy: { weekday: n }, rest: text.replace(en[0], ' ') };
  }
  return { rest: text };
}

export function parseRequest(input: string): Criteria {
  const dl = takeDeadline(input);
  const sz = takeSize(dl.rest);
  let text = sz.rest.toLowerCase();
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
  const grp = takeGroup(cat.rest);
  const category = cat.found[0] ?? (grp.cats.length === 1 ? grp.cats[0] : undefined);
  const many = !cat.found.length && grp.cats.length > 1;
  const color = take(grp.rest, COLORS);
  const mat = take(color.rest, MATERIALS);
  const season = take(mat.rest, SEASONS);
  const style = take(season.rest, STYLES);

  const unknown = style.rest
    .split(/[\s,./·!?]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t));

  return {
    category,
    ...(many ? { categories: grp.cats, group: join(grp.labels) } : {}),
    colors: color.found,
    materials: mat.found,
    seasons: season.found,
    styles: style.found,
    maxPrice,
    minPrice,
    size: sz.size,
    deliverBy: dl.deliverBy,
    unknown,
  };
}

export interface Chip {
  label: L;
  value: L;
}

const join = (ls: L[]): L => ({ ko: ls.map((l) => l.ko).join(', '), en: ls.map((l) => l.en).join(', ') });
const won = (n: number): L => ({ ko: `${n.toLocaleString('ko-KR')}원`, en: `KRW ${n.toLocaleString('en-US')}` });

/** 해석 결과를 사람이 확인할 수 있는 칩 목록으로 바꾼다. */
export function describeCriteria(c: Criteria): Chip[] {
  const chips: Chip[] = [];
  if (c.category) chips.push({ label: DIM_L.category, value: CATEGORY_L[c.category] });
  else if (c.categories?.length) {
    const kinds = c.categories.map((x) => CATEGORY_L[x]);
    const g = c.group ?? join(kinds);
    chips.push({ label: DIM_L.category, value: { ko: `${g.ko} (${kinds.map((k) => k.ko).join('·')})`, en: `${g.en} (${kinds.map((k) => k.en).join('/')})` } });
  }
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
  if (c.size) chips.push({ label: DIM_L.size, value: { ko: c.size, en: c.size } });
  if (c.deliverBy) chips.push({ label: { ko: '도착', en: 'Arrive' }, value: deadlineL(c.deliverBy) });
  return chips;
}

export function deadlineL(d: { weekday?: number; days?: number }): L {
  if (d.days === 0) return { ko: '오늘 안에', en: 'today' };
  if (d.days === 1) return { ko: '내일까지', en: 'by tomorrow' };
  if (d.days === 2) return { ko: '모레까지', en: 'in two days' };
  if (d.weekday === 6 && d.days === undefined) return { ko: '토요일까지', en: 'by Saturday' };
  const w = weekdayL(d.weekday ?? 0);
  return { ko: `${w.ko}요일까지`, en: `by ${w.en}` };
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
  const dl = takeDeadline(input);
  let text = dl.rest;
  const withDl = (c: Criteria): Criteria => (dl.deliverBy ? { ...c, deliverBy: dl.deliverBy } : c);
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
    if (items.every((c) => c.category || c.categories)) return { items: items.map(withDl), budget };
  }
  const single = parseRequest(text);
  // 상품이 하나뿐이면 합계 예산은 그 상품의 가격 상한과 같다
  return { items: [withDl(budget !== undefined && single.maxPrice === undefined ? { ...single, maxPrice: budget } : single)], budget: undefined };
}
