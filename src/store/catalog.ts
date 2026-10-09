import { officialId, SELLERS } from './sellers';
import { SIZE_SETS, sizeKindOf, type Category, type Color, type Material, type Offer, type Product, type Season, type Style } from './types';
import type { SizeProfile } from '../engine/types';

// 전부 가상 데이터. 실제 브랜드·가격·재고와 무관.
type Row = [
  id: string, category: Category, ko: string, en: string, brand: string, price: number, stock: number,
  colors: Color[], materials: Material[], seasons: Season[], styles: Style[],
];

const A: Season[] = ['spring', 'autumn'];
const AW: Season[] = ['autumn', 'winter'];
const ALL: Season[] = ['spring', 'summer', 'autumn', 'winter'];

const ROWS: Row[] = [
  // coats
  ['c1', 'coat', '미드나잇 울 싱글 코트', 'Midnight Wool Single Coat', 'NOIR LAB', 178000, 4, ['black'], ['wool'], AW, ['formal', 'minimal']],
  ['c2', 'coat', '헤링본 울 블렌드 코트', 'Herringbone Wool-Blend Coat', 'MAISON ARC', 214000, 2, ['gray'], ['wool-blend'], AW, ['formal']],
  ['c3', 'coat', '블랙 롱 코트 (울 혼방)', 'Black Long Coat (Wool Blend)', 'OAKWARD', 189000, 7, ['black'], ['wool-blend'], ['winter'], ['formal']],
  ['c4', 'coat', '캐시미어 더블 코트', 'Cashmere Double Coat', 'ATELIER 9', 428000, 2, ['beige'], ['cashmere'], ['winter'], ['formal', 'warm']],
  ['c5', 'coat', '오버핏 울 코트', 'Oversized Wool Coat', 'NOIR LAB', 236000, 5, ['black'], ['wool'], ['winter'], ['casual', 'minimal']],
  // jackets
  ['j1', 'jacket', '라이트 쉘 바람막이 자켓', 'Light Shell Windbreaker', 'TRAIL & CO', 129000, 9, ['navy'], ['nylon'], A, ['light', 'casual']],
  ['j2', 'jacket', '크롭 코튼 블레이저', 'Cropped Cotton Blazer', 'MAISON ARC', 156000, 5, ['beige'], ['cotton'], A, ['formal']],
  ['j3', 'jacket', '울 블렌드 블루종', 'Wool-Blend Blouson', 'OAKWARD', 198000, 3, ['brown'], ['wool-blend'], AW, ['warm', 'casual']],
  ['j4', 'jacket', '데님 트러커 자켓', 'Denim Trucker Jacket', 'NOIR LAB', 98000, 12, ['blue'], ['denim'], A, ['casual']],
  ['j5', 'jacket', '코튼 헌팅 자켓', 'Cotton Hunting Jacket', 'OAKWARD', 142000, 6, ['khaki'], ['cotton'], ['autumn'], ['casual', 'warm']],
  ['j6', 'jacket', '리넨 블렌드 블레이저', 'Linen-Blend Blazer', 'MAISON ARC', 135000, 4, ['beige'], ['cotton'], ['spring', 'summer'], ['formal', 'light']],
  // sneakers
  ['s1', 'sneakers', '클린 레더 스니커즈 (화이트)', 'Clean Leather Sneakers (White)', 'STRIDE', 119000, 1, ['white'], ['leather'], ALL, ['minimal', 'casual']],
  ['s2', 'sneakers', '캔버스 로우 (화이트)', 'Canvas Low (White)', 'STRIDE', 79000, 14, ['white'], ['canvas'], ALL, ['casual']],
  ['s3', 'sneakers', '프리미엄 레더 로우 (화이트)', 'Premium Leather Low (White)', 'ATELIER 9', 342000, 2, ['white'], ['leather'], ALL, ['minimal', 'formal']],
  ['s4', 'sneakers', '블랙 러닝 스니커즈', 'Black Running Sneakers', 'TRAIL & CO', 109000, 8, ['black'], ['nylon'], ALL, ['light', 'casual']],
  ['s5', 'sneakers', '그레이 데일리 스니커즈', 'Gray Daily Sneakers', 'STRIDE', 99000, 6, ['gray'], ['canvas'], ALL, ['casual']],
  // loafers
  ['l1', 'loafers', '페니 로퍼 (블랙)', 'Penny Loafer (Black)', 'ATELIER 9', 289000, 3, ['black'], ['leather'], ALL, ['formal']],
  ['l2', 'loafers', '스웨이드 로퍼 (브라운)', 'Suede Loafer (Brown)', 'OAKWARD', 198000, 4, ['brown'], ['leather'], AW, ['casual']],
  ['l3', 'loafers', '미니멀 로퍼 (블랙)', 'Minimal Loafer (Black)', 'NOIR LAB', 159000, 6, ['black'], ['leather'], ALL, ['formal', 'minimal']],
  // knits
  ['k1', 'knit', '캐시미어 크루넥 니트', 'Cashmere Crewneck Knit', 'ATELIER 9', 168000, 5, ['beige'], ['cashmere'], AW, ['minimal', 'warm']],
  ['k2', 'knit', '울 블렌드 니트 (네이비)', 'Wool-Blend Knit (Navy)', 'OAKWARD', 118000, 8, ['navy'], ['wool-blend'], AW, ['warm']],
  ['k3', 'knit', '코튼 케이블 니트 (화이트)', 'Cotton Cable Knit (White)', 'MAISON ARC', 89000, 9, ['white'], ['cotton'], A, ['casual']],
  ['k4', 'knit', '블랙 울 터틀넥', 'Black Wool Turtleneck', 'NOIR LAB', 129000, 6, ['black'], ['wool'], ['winter'], ['minimal', 'warm']],
  // shirts
  ['sh1', 'shirt', '화이트 옥스포드 셔츠', 'White Oxford Shirt', 'MAISON ARC', 69000, 15, ['white'], ['cotton'], ALL, ['formal']],
  ['sh2', 'shirt', '블루 스트라이프 셔츠', 'Blue Stripe Shirt', 'MAISON ARC', 74000, 10, ['blue'], ['cotton'], ['spring', 'summer', 'autumn'], ['casual']],
  ['sh3', 'shirt', '베이지 리넨 셔츠', 'Beige Linen Shirt', 'TRAIL & CO', 79000, 7, ['beige'], ['cotton'], ['summer'], ['light', 'casual']],
  ['sh4', 'shirt', '블랙 코튼 셔츠', 'Black Cotton Shirt', 'NOIR LAB', 85000, 8, ['black'], ['cotton'], ALL, ['formal', 'minimal']],
  // pants
  ['pt1', 'pants', '블랙 울 슬랙스', 'Black Wool Slacks', 'MAISON ARC', 118000, 8, ['black'], ['wool-blend'], AW, ['formal']],
  ['pt2', 'pants', '데님 와이드 팬츠', 'Denim Wide Pants', 'NOIR LAB', 89000, 11, ['blue'], ['denim'], ALL, ['casual']],
  ['pt3', 'pants', '베이지 치노 팬츠', 'Beige Chino Pants', 'OAKWARD', 79000, 9, ['beige'], ['cotton'], A, ['casual', 'minimal']],
  ['pt4', 'pants', '카키 카고 팬츠', 'Khaki Cargo Pants', 'TRAIL & CO', 98000, 6, ['khaki'], ['cotton'], A, ['casual']],
  // bags
  ['b1', 'bag', '블랙 레더 토트', 'Black Leather Tote', 'ATELIER 9', 248000, 3, ['black'], ['leather'], ALL, ['formal', 'minimal']],
  ['b2', 'bag', '캔버스 크로스백 (베이지)', 'Canvas Crossbody (Beige)', 'TRAIL & CO', 59000, 12, ['beige'], ['canvas'], ALL, ['casual']],
  ['b3', 'bag', '나일론 백팩 (블랙)', 'Nylon Backpack (Black)', 'TRAIL & CO', 88000, 9, ['black'], ['nylon'], ALL, ['light', 'casual']],
];

/** 사이즈 분포의 중심. 처음 채워 두는 내 사이즈와 같고, 어느 판매처든 이 사이즈는 하나 이상 둔다. */
const CENTER: Record<string, string> = { top: 'M', shoe: '270', bottom: '32', free: 'FREE' };
/** 사이즈 수가 많은 체계일수록 상품 재고를 늘려 끝 사이즈까지 닿게 한다. 1개 남은 상품은 그대로 둔다. */
const SCALE: Record<string, number> = { top: 2, shoe: 3, bottom: 2.5, free: 1 };

/** 문자열 시드 → [0,1) 난수. 같은 상품·판매처면 늘 같은 분포가 나온다. */
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * total개를 사이즈 전체에 나눠 담는다. 가운데 사이즈에 많이, 끝으로 갈수록 적게(종 모양).
 * 상품·판매처마다 분포를 조금씩 흔들고 몇 사이즈는 비워서, 같은 사이즈라도 판매처별로 있고 없음이 갈린다.
 */
export function allocate(category: Category, total: number, seed = ''): Record<string, number> {
  const kind = sizeKindOf(category);
  const set = SIZE_SETS[kind];
  const out = Object.fromEntries(set.map((s) => [s, 0])) as Record<string, number>;
  if (total <= 0) return out;
  const rng = seeded(`${category}:${seed}`);
  const c = set.indexOf(CENTER[kind]);
  const mid = c + (rng() - 0.5) * 2;
  const sigma = Math.max(1, set.length / 3.2);
  const w = set.map((_, i) => {
    const bell = Math.exp(-((i - mid) ** 2) / (2 * sigma * sigma));
    const gap = i !== c && rng() < 0.15 ? 0 : 1; // 가끔 한 사이즈가 비어 있다
    return bell * (0.5 + rng()) * gap;
  });
  const sum = w.reduce((a, b) => a + b, 0);
  // 첫 하나는 중심 사이즈에, 나머지는 최대 나머지 방식으로 정수 배분
  const raw = w.map((x) => (x / sum) * (total - 1));
  set.forEach((z, i) => { out[z] = Math.floor(raw[i]); });
  out[set[c]]++;
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[set[order[k][1]]]++;
  return out;
}

const SHELF = new Set(['NOIR LAB', 'MAISON ARC', 'OAKWARD', 'STRIDE']);
const ABROAD = new Set(['ATELIER 9', 'STRIDE', 'TRAIL & CO']);
/** 판매처별 가격을 따로 정한 상품. 표시가 최저인 판매처가 배송비를 더하면 최저가 아닌 경우를 만든다. */
const OVERRIDE: Record<string, Partial<Record<string, number>>> = {
  sh1: { shelf: 68000, daero: 69900 },
  k3: { shelf: 84000, daero: 88900 },
  b2: { daero: 59900 },
  s2: { shelf: 76000, daero: 79900 },
  pt3: { shelf: 76000 },
};
const r1k = (n: number) => Math.round(n / 1000) * 1000;
const r100 = (n: number) => Math.round(n / 100) * 100;

/** 오퍼에서 상품 요약(price·sizes·stock)을 다시 계산한다. price는 재고 있는 국내 판매처의 최저 판매가. */
export function summarize(p: Product, offers: Offer[]): Product {
  const mine = offers.filter((o) => o.productId === p.id);
  const sizes = Object.fromEntries(SIZE_SETS[sizeKindOf(p.category)].map((z) => [z, 0])) as Record<string, number>;
  for (const o of mine) for (const [z, n] of Object.entries(o.sizes)) sizes[z] = (sizes[z] ?? 0) + n;
  const domestic = mine.filter((o) => !SELLERS[o.sellerId]?.overseas);
  const live = domestic.filter((o) => o.stock > 0);
  const price = Math.min(...(live.length ? live : domestic.length ? domestic : mine).map((o) => o.price));
  return { ...p, sizes, stock: Object.values(sizes).reduce((a, b) => a + b, 0), price };
}

export function buildCatalog(): { products: Record<string, Product>; offers: Record<string, Offer> } {
  const offers: Offer[] = [];
  const products: Product[] = [];
  for (const [id, category, ko, en, brand, price, listed, colors, materials, seasons, styles] of ROWS) {
    const ov = OVERRIDE[id] ?? {};
    const stock = listed <= 1 ? listed : Math.round(listed * SCALE[sizeKindOf(category)]);
    const shelf = SHELF.has(brand);
    const nOff = Math.ceil(stock * 0.5);
    const nShelf = shelf ? Math.floor(stock * 0.25) : 0;
    const nDaero = stock - nOff - nShelf;
    const mk = (sellerId: string, p: number, n: number) => {
      const sizes = allocate(category, n, `${id}@${sellerId}`);
      offers.push({ id: `${id}@${sellerId}`, productId: id, sellerId, price: p, sizes, stock: n });
    };
    mk(officialId(brand), ov.official ?? price, nOff);
    if (shelf) mk('shelf', ov.shelf ?? r1k(price * 1.02), nShelf);
    mk('daero', ov.daero ?? r1k(price * 1.05) - 100, nDaero);
    if (ABROAD.has(brand)) mk('abroad', ov.abroad ?? r100(price * 0.86), 3);
    products.push({ id, category, name: { ko, en }, brand, price, sizes: {}, stock: 0, colors, materials, seasons, styles });
  }
  return {
    products: Object.fromEntries(products.map((p) => [p.id, summarize(p, offers)])),
    offers: Object.fromEntries(offers.map((o) => [o.id, o])),
  };
}

/** 국내 쇼핑몰 카드에 붙는 정보: 정가(할인율 계산용), 별점, 리뷰 수, 좋아요 수, 배지. 상품마다 고정이다. */
export interface Social { listPrice: number; rating: number; reviews: number; likes: number; best: boolean }
const DISCOUNTS = [0, 0, 0, 10, 15, 20, 25, 30];
export const SOCIAL: Record<string, Social> = (() => {
  const out: Record<string, Social> = {};
  for (const [id, , , , , price, stock] of ROWS) {
    const rng = seeded(`social:${id}`);
    const d = DISCOUNTS[Math.floor(rng() * DISCOUNTS.length)];
    // 재고가 많은(잘 나가는) 상품일수록 리뷰가 많다
    const reviews = Math.round((20 + rng() * 120) * Math.max(1, stock) ** 1.25);
    out[id] = {
      listPrice: d ? r1k(price / (1 - d / 100)) : price,
      rating: Math.round((4.3 + rng() * 0.6) * 10) / 10,
      reviews,
      likes: Math.round(reviews * (2.5 + rng() * 5)),
      best: false,
    };
  }
  // 리뷰가 가장 많은 6개에 BEST
  Object.values(out).sort((a, b) => b.reviews - a.reviews).slice(0, 6).forEach((x) => { x.best = true; });
  return out;
})();

/** 처음 시작할 때 채워 두는 내 사이즈. 재고가 가장 많이 배분되는 사이즈다. */
export const DEFAULT_PROFILE: SizeProfile = { top: 'M', shoe: '270', bottom: '32' };
export const DEFAULT_LIMIT = 300000;
