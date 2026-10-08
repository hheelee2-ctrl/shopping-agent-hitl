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

/** 가운데 사이즈부터 한 개씩 나눠 담는다. 재고가 적은 상품은 일부 사이즈만 남는다. */
/** 주력 4사이즈(가운데부터)에 재고를 나눠 담는다. 그 밖의 사이즈는 재고가 넉넉한 상품만 한두 개씩 둔다. */
const CORE: Record<string, string[]> = {
  top: ['M', 'L', 'S', 'XL'],
  shoe: ['270', '260', '280', '250'],
  bottom: ['32', '30', '34', '28'],
  free: ['FREE'],
};
export function allocate(category: Category, total: number): Record<string, number> {
  const kind = sizeKindOf(category);
  const set = SIZE_SETS[kind];
  const out = Object.fromEntries(set.map((s) => [s, 0])) as Record<string, number>;
  const core = CORE[kind];
  for (let i = 0; i < total; i++) out[core[i % core.length]]++;
  // 재고 8개 이상인 상품만 주변 사이즈를 1개씩 더 둔다(가운데에 가까운 순)
  if (total >= 8) {
    const extra = set.filter((z) => !core.includes(z));
    const mid = set.indexOf(core[0]);
    extra.sort((a, b) => Math.abs(set.indexOf(a) - mid) - Math.abs(set.indexOf(b) - mid));
    extra.slice(0, Math.min(extra.length, Math.floor(total / 4))).forEach((z) => { out[z] = 1; });
  }
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
  for (const [id, category, ko, en, brand, price, stock, colors, materials, seasons, styles] of ROWS) {
    const ov = OVERRIDE[id] ?? {};
    const shelf = SHELF.has(brand);
    const nOff = Math.ceil(stock * 0.5);
    const nShelf = shelf ? Math.floor(stock * 0.25) : 0;
    const nDaero = stock - nOff - nShelf;
    const mk = (sellerId: string, p: number, n: number) => {
      const sizes = allocate(category, n);
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

/** 처음 시작할 때 채워 두는 내 사이즈. 재고가 가장 많이 배분되는 사이즈다. */
export const DEFAULT_PROFILE: SizeProfile = { top: 'M', shoe: '270', bottom: '32' };
export const DEFAULT_LIMIT = 300000;
