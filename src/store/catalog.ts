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
  ['c2', 'coat', '그레이 울 블렌드 코트', 'Gray Wool-Blend Coat', 'MAISON ARC', 214000, 2, ['gray'], ['wool-blend'], AW, ['classic', 'formal']],
  ['c3', 'coat', '블랙 테일러드 하프 코트 (울 혼방)', 'Black Tailored Half Coat (Wool Blend)', 'OAKWARD', 189000, 7, ['black'], ['wool-blend'], ['winter'], ['classic', 'minimal']],
  ['c4', 'coat', '캐멀 캐시미어 더블 코트', 'Camel Cashmere Double Coat', 'ATELIER 9', 428000, 2, ['beige'], ['cashmere'], ['winter'], ['classic', 'formal', 'warm']],
  ['c5', 'coat', '블랙 오버핏 울 패딩 코트', 'Black Oversized Wool Puffer Coat', 'NOIR LAB', 236000, 5, ['black'], ['wool'], ['winter'], ['casual', 'street']],
  ['c6', 'coat', '베이지 더블 트렌치 코트', 'Beige Double Trench Coat', 'MAISON ARC', 248000, 3, ['beige'], ['cotton'], A, ['classic', 'formal']],
  ['c7', 'coat', '카멜 벨티드 트렌치 코트', 'Camel Belted Trench Coat', 'OAKWARD', 226000, 4, ['brown'], ['cotton'], A, ['classic', 'casual']],
  // jackets
  ['j1', 'jacket', '올리브 퀼팅 자켓', 'Olive Quilted Jacket', 'TRAIL & CO', 129000, 9, ['khaki'], ['nylon'], AW, ['outdoor', 'casual', 'warm']],
  ['j2', 'jacket', '베이지 테일러드 블레이저', 'Beige Tailored Blazer', 'MAISON ARC', 156000, 5, ['beige'], ['wool-blend'], A, ['formal', 'minimal']],
  ['j3', 'jacket', '크림 숏 패딩', 'Cream Short Puffer', 'OAKWARD', 198000, 3, ['white'], ['nylon'], ['winter'], ['casual', 'street', 'warm']],
  ['j4', 'jacket', '데님 트러커 자켓', 'Denim Trucker Jacket', 'NOIR LAB', 98000, 12, ['blue'], ['denim'], A, ['casual', 'street']],
  ['j5', 'jacket', '인디고 데님 자켓', 'Indigo Denim Jacket', 'OAKWARD', 112000, 6, ['navy'], ['denim'], A, ['casual', 'classic']],
  ['j7', 'jacket', '블랙 레더 라이더 자켓', 'Black Leather Rider Jacket', 'NOIR LAB', 289000, 3, ['black'], ['leather'], A, ['street', 'casual']],
  // dresses
  ['d1', 'dress', '아이보리 셔링 원피스', 'Ivory Shirred Dress', 'MAISON ARC', 89000, 6, ['white'], ['cotton'], ['spring', 'summer'], ['casual', 'minimal', 'light']],
  ['d2', 'dress', '블랙 셔링 원피스', 'Black Shirred Dress', 'NOIR LAB', 92000, 6, ['black'], ['cotton'], ['spring', 'summer', 'autumn'], ['formal', 'minimal']],
  ['d3', 'dress', '베이지 셔링 원피스', 'Beige Shirred Dress', 'OAKWARD', 89000, 5, ['beige'], ['cotton'], ['spring', 'summer'], ['casual', 'classic', 'light']],
  ['d4', 'dress', '스카이 블루 원피스', 'Sky Blue Dress', 'MAISON ARC', 86000, 5, ['blue'], ['cotton'], ['spring', 'summer'], ['casual', 'light']],
  // sneakers
  ['s1', 'sneakers', '클린 레더 스니커즈 (화이트)', 'Clean Leather Sneakers (White)', 'STRIDE', 119000, 1, ['white'], ['leather'], ALL, ['minimal', 'casual']],
  ['s2', 'sneakers', '캔버스 하이 (아이보리)', 'Canvas High (Ivory)', 'STRIDE', 79000, 14, ['white'], ['canvas'], ALL, ['casual', 'street']],
  ['s3', 'sneakers', '프리미엄 레더 로우 (화이트)', 'Premium Leather Low (White)', 'ATELIER 9', 342000, 2, ['white'], ['leather'], ALL, ['minimal', 'classic']],
  ['s4', 'sneakers', '블랙 청키 스니커즈', 'Black Chunky Sneakers', 'TRAIL & CO', 109000, 8, ['black'], ['nylon'], ALL, ['outdoor', 'street', 'light']],
  ['s5', 'sneakers', '블랙·화이트 청키 스니커즈', 'Black/White Chunky Sneakers', 'STRIDE', 99000, 6, ['black'], ['leather'], ALL, ['casual', 'street']],
  ['s6', 'sneakers', '화이트 청키 스니커즈', 'White Chunky Sneakers', 'STRIDE', 129000, 7, ['white'], ['leather'], ALL, ['minimal', 'casual']],
  ['s7', 'sneakers', '트레이너 스니커즈 (화이트·베이지)', 'Trainer Sneakers (White/Beige)', 'ATELIER 9', 189000, 4, ['white', 'beige'], ['leather'], ALL, ['classic', 'minimal']],
  // boots
  ['bt1', 'boots', '블랙 첼시 부츠', 'Black Chelsea Boots', 'NOIR LAB', 219000, 4, ['black'], ['leather'], AW, ['minimal', 'formal']],
  ['bt2', 'boots', '브라운 첼시 부츠', 'Brown Chelsea Boots', 'OAKWARD', 239000, 3, ['brown'], ['leather'], AW, ['classic']],
  ['bt3', 'boots', '스웨이드 숏 부츠 (토프)', 'Suede Short Boots (Taupe)', 'OAKWARD', 209000, 5, ['beige'], ['leather'], ['autumn', 'winter'], ['classic', 'casual']],
  ['bt4', 'boots', '블랙 컴뱃 부츠', 'Black Combat Boots', 'TRAIL & CO', 179000, 6, ['black'], ['leather'], AW, ['street', 'outdoor', 'warm']],
  ['bt5', 'boots', '브라운 레이스업 부츠', 'Brown Lace-Up Boots', 'TRAIL & CO', 199000, 4, ['brown'], ['leather'], AW, ['outdoor', 'classic']],
  ['bt6', 'boots', '블랙 레더 롱부츠', 'Black Leather Tall Boots', 'NOIR LAB', 269000, 3, ['black'], ['leather'], AW, ['formal', 'minimal']],
  ['bt7', 'boots', '브라운 레더 롱부츠', 'Brown Leather Tall Boots', 'MAISON ARC', 279000, 3, ['brown'], ['leather'], AW, ['classic', 'formal']],
  ['bt8', 'boots', '블랙 앵클 부츠', 'Black Ankle Boots', 'OAKWARD', 189000, 5, ['black'], ['leather'], AW, ['minimal', 'casual']],
  ['bt9', 'boots', '카멜 시어링 부츠', 'Camel Shearling Boots', 'TRAIL & CO', 159000, 7, ['beige'], ['leather'], ['winter'], ['casual', 'warm']],
  ['bt10', 'boots', '블랙 레이스업 미드 부츠', 'Black Lace-Up Mid Boots', 'NOIR LAB', 229000, 4, ['black'], ['leather'], AW, ['street', 'casual']],
  ['bt11', 'boots', '베이지 웨스턴 부츠', 'Beige Western Boots', 'ATELIER 9', 259000, 3, ['beige'], ['leather'], ['autumn'], ['street', 'classic']],
  ['bt12', 'boots', '블랙 레이스업 롱부츠', 'Black Lace-Up Tall Boots', 'TRAIL & CO', 249000, 3, ['black'], ['leather'], AW, ['street', 'outdoor', 'warm']],
  // loafers · flats
  ['l1', 'loafers', '홀스빗 로퍼 (블랙)', 'Horsebit Loafer (Black)', 'ATELIER 9', 289000, 3, ['black'], ['leather'], ALL, ['classic', 'formal']],
  ['l2', 'loafers', '홀스빗 로퍼 (브라운)', 'Horsebit Loafer (Brown)', 'OAKWARD', 198000, 4, ['brown'], ['leather'], AW, ['classic', 'casual']],
  ['l3', 'loafers', '리본 플랫 (블랙)', 'Bow Flats (Black)', 'NOIR LAB', 159000, 6, ['black'], ['leather'], ALL, ['formal', 'minimal']],
  ['l4', 'loafers', '홀스빗 로퍼 (아이보리)', 'Horsebit Loafer (Ivory)', 'MAISON ARC', 209000, 4, ['white'], ['leather'], ALL, ['classic', 'minimal']],
  ['l5', 'loafers', '리본 플랫 (베이지)', 'Bow Flats (Beige)', 'MAISON ARC', 169000, 5, ['beige'], ['leather'], ['spring', 'summer', 'autumn'], ['minimal', 'casual']],
  // heels
  ['h1', 'heels', '포인티드 펌프스 (베이지)', 'Pointed Pumps (Beige)', 'ATELIER 9', 189000, 4, ['beige'], ['leather'], ALL, ['formal', 'minimal']],
  ['h2', 'heels', '슬링백 힐 (블랙)', 'Slingback Heels (Black)', 'NOIR LAB', 179000, 4, ['black'], ['leather'], ['spring', 'summer', 'autumn'], ['formal', 'classic']],
  ['h3', 'heels', '슬링백 힐 (아이보리)', 'Slingback Heels (Ivory)', 'MAISON ARC', 179000, 3, ['white'], ['leather'], ['spring', 'summer'], ['formal', 'minimal']],
  // knits
  ['k1', 'knit', '캐시미어 터틀넥 니트', 'Cashmere Turtleneck Knit', 'ATELIER 9', 168000, 5, ['beige'], ['cashmere'], AW, ['minimal', 'classic', 'warm']],
  ['k2', 'knit', '울 블렌드 니트 (블랙)', 'Wool-Blend Knit (Black)', 'OAKWARD', 118000, 8, ['black'], ['wool-blend'], AW, ['casual', 'classic', 'warm']],
  ['k3', 'knit', '코튼 케이블 니트 (화이트)', 'Cotton Cable Knit (White)', 'MAISON ARC', 89000, 9, ['white'], ['cotton'], A, ['casual', 'classic']],
  ['k4', 'knit', '블랙 울 터틀넥', 'Black Wool Turtleneck', 'NOIR LAB', 129000, 6, ['black'], ['wool'], ['winter'], ['minimal', 'warm']],
  ['k5', 'knit', '그레이 울 터틀넥', 'Gray Wool Turtleneck', 'NOIR LAB', 139000, 6, ['gray'], ['wool'], AW, ['minimal', 'warm']],
  ['k6', 'knit', '라이트 블루 울 가디건', 'Light Blue Wool Cardigan', 'MAISON ARC', 149000, 5, ['blue'], ['wool-blend'], A, ['classic', 'casual']],
  ['k7', 'knit', '울 케이블 크루넥 (아이보리)', 'Wool Cable Crewneck (Ivory)', 'OAKWARD', 128000, 6, ['white'], ['wool'], AW, ['classic', 'warm']],
  ['k8', 'knit', '핑크 울 가디건', 'Pink Wool Cardigan', 'MAISON ARC', 149000, 4, ['pink'], ['wool-blend'], A, ['casual', 'classic']],
  ['k9', 'knit', '세이지 그린 가디건', 'Sage Green Cardigan', 'OAKWARD', 149000, 4, ['khaki'], ['wool-blend'], A, ['casual', 'classic']],
  // sweats
  ['w1', 'sweat', '오트밀 맨투맨', 'Oatmeal Sweatshirt', 'STRIDE', 59000, 12, ['beige'], ['cotton'], A, ['casual', 'minimal']],
  ['w2', 'sweat', '크림 후드', 'Cream Hoodie', 'TRAIL & CO', 69000, 10, ['white'], ['cotton'], A, ['casual', 'street']],
  ['w3', 'sweat', '그레이 맨투맨', 'Gray Sweatshirt', 'OAKWARD', 55000, 14, ['gray'], ['cotton'], AW, ['casual', 'warm']],
  ['w4', 'sweat', '그레이 후드', 'Gray Hoodie', 'STRIDE', 69000, 12, ['gray'], ['cotton'], AW, ['casual', 'street', 'warm']],
  ['w5', 'sweat', '네이비 후드', 'Navy Hoodie', 'TRAIL & CO', 72000, 9, ['navy'], ['cotton'], AW, ['casual', 'street', 'warm']],
  // tees
  ['t1', 'tee', '베이직 화이트 티셔츠', 'Basic White Tee', 'STRIDE', 29000, 20, ['white'], ['cotton'], ['spring', 'summer', 'autumn'], ['minimal', 'casual', 'light']],
  ['t2', 'tee', '블랙 크루넥 티셔츠', 'Black Crewneck Tee', 'NOIR LAB', 35000, 16, ['black'], ['cotton'], ['spring', 'summer', 'autumn'], ['minimal', 'street']],
  ['t3', 'tee', '그레이 크루넥 티셔츠', 'Gray Crewneck Tee', 'TRAIL & CO', 39000, 12, ['gray'], ['cotton'], ['spring', 'summer'], ['street', 'casual', 'light']],
  ['t4', 'tee', '스트라이프 롱슬리브', 'Striped Long Sleeve', 'MAISON ARC', 45000, 10, ['white', 'black'], ['cotton'], ['spring', 'autumn'], ['classic', 'casual']],
  ['t5', 'tee', '네이비 크루넥 티셔츠', 'Navy Crewneck Tee', 'OAKWARD', 33000, 14, ['navy'], ['cotton'], ['spring', 'summer', 'autumn'], ['casual', 'classic', 'light']],
  // shirts
  ['sh1', 'shirt', '화이트 옥스포드 셔츠', 'White Oxford Shirt', 'MAISON ARC', 69000, 15, ['white'], ['cotton'], ALL, ['formal', 'classic']],
  ['sh2', 'shirt', '블루 스트라이프 셔츠', 'Blue Stripe Shirt', 'MAISON ARC', 74000, 10, ['blue'], ['cotton'], ['spring', 'summer', 'autumn'], ['casual', 'classic']],
  ['sh3', 'shirt', '라이트 블루 옥스포드 셔츠', 'Light Blue Oxford Shirt', 'TRAIL & CO', 79000, 7, ['blue'], ['cotton'], ['summer'], ['casual', 'minimal', 'light']],
  ['sh4', 'shirt', '핑크 옥스포드 셔츠', 'Pink Oxford Shirt', 'NOIR LAB', 85000, 8, ['pink'], ['cotton'], ALL, ['formal', 'classic']],
  // pants
  ['pt1', 'pants', '블랙 울 슬랙스', 'Black Wool Slacks', 'MAISON ARC', 118000, 8, ['black'], ['wool-blend'], AW, ['formal', 'minimal']],
  ['pt2', 'pants', '연청 와이드 데님', 'Light Wash Wide Denim', 'NOIR LAB', 89000, 11, ['blue'], ['denim'], ALL, ['street', 'casual']],
  ['pt3', 'pants', '베이지 치노 팬츠', 'Beige Chino Pants', 'OAKWARD', 79000, 9, ['beige'], ['cotton'], A, ['casual', 'minimal']],
  ['pt4', 'pants', '그레이 조거 팬츠', 'Gray Jogger Pants', 'TRAIL & CO', 98000, 6, ['gray'], ['cotton'], A, ['street', 'casual']],
  ['pt5', 'pants', '미디엄 워시 스트레이트 진', 'Medium Wash Straight Jeans', 'OAKWARD', 95000, 9, ['blue'], ['denim'], ALL, ['casual', 'classic']],
  ['pt6', 'pants', '화이트 와이드 팬츠', 'White Wide Pants', 'MAISON ARC', 99000, 6, ['white'], ['cotton'], ['spring', 'summer'], ['minimal', 'light']],
  ['pt7', 'pants', '블랙 와이드 슬랙스', 'Black Wide Slacks', 'NOIR LAB', 128000, 7, ['black'], ['wool-blend'], AW, ['formal', 'street']],
  // skirts
  ['sk1', 'skirt', '블랙 플리츠 미니스커트', 'Black Pleated Mini Skirt', 'MAISON ARC', 79000, 6, ['black'], ['polyester'], A, ['formal', 'minimal']],
  ['sk2', 'skirt', '베이지 플리츠 스커트', 'Beige Pleated Skirt', 'NOIR LAB', 69000, 7, ['beige'], ['polyester'], ['spring', 'summer', 'autumn'], ['classic', 'minimal']],
  ['sk3', 'skirt', '연청 데님 미니스커트', 'Light Denim Mini Skirt', 'STRIDE', 59000, 8, ['blue'], ['denim'], ['spring', 'summer'], ['casual', 'street']],
  // bags
  ['b1', 'bag', '블랙 레더 토트', 'Black Leather Tote', 'ATELIER 9', 248000, 3, ['black'], ['leather'], ALL, ['formal', 'minimal']],
  ['b5', 'bag', '블랙 미니 크로스백', 'Black Mini Crossbody', 'ATELIER 9', 129000, 5, ['black'], ['leather'], ALL, ['minimal', 'street']],
  // accessories
  ['a1', 'acc', '라운드 선글라스 (블랙)', 'Round Sunglasses (Black)', 'NOIR LAB', 129000, 8, ['black'], ['polyester'], ALL, ['minimal', 'street']],
  ['a2', 'acc', '메탈 선글라스 (골드)', 'Metal Sunglasses (Gold)', 'ATELIER 9', 189000, 5, ['gold'], ['metal'], ALL, ['classic', 'street']],
  ['a3', 'acc', '라운드 안경테', 'Round Eyeglass Frames', 'OAKWARD', 149000, 6, ['black'], ['metal'], ALL, ['minimal', 'classic']],
  ['a4', 'acc', '메탈 워치 (실버)', 'Metal Watch (Silver)', 'ATELIER 9', 298000, 3, ['silver'], ['metal'], ALL, ['classic', 'formal']],
  ['a5', 'acc', '메탈 워치 (골드)', 'Metal Watch (Gold)', 'ATELIER 9', 328000, 3, ['gold'], ['metal'], ALL, ['classic', 'formal']],
  ['a6', 'acc', '펜던트 목걸이 (골드)', 'Pendant Necklace (Gold)', 'MAISON ARC', 89000, 8, ['gold'], ['metal'], ALL, ['minimal', 'classic']],
  ['a7', 'acc', '진주 목걸이', 'Pearl Necklace', 'MAISON ARC', 119000, 6, ['white'], ['metal'], ALL, ['classic', 'formal']],
  ['a8', 'acc', '후프 귀걸이 (골드)', 'Hoop Earrings (Gold)', 'NOIR LAB', 69000, 10, ['gold'], ['metal'], ALL, ['minimal', 'street']],
  ['a9', 'acc', '밴드 링 (골드)', 'Band Ring (Gold)', 'NOIR LAB', 59000, 10, ['gold'], ['metal'], ALL, ['minimal']],
  ['a10', 'acc', '레더 벨트 (블랙)', 'Leather Belt (Black)', 'OAKWARD', 69000, 12, ['black'], ['leather'], ALL, ['classic', 'formal']],
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

/**
 * 큰 사이즈(XL·XXL, 34·36, 285·290)가 어느 국내 판매처에도 없으면 사람이 고를 수가 없다.
 * 종 모양 배분에서 비어 버린 사이즈는 가장 많이 쌓인 사이즈에서 하나 옮겨 온다. 옮길 데가 없으면 공식몰에 하나 더한다.
 * 판매처마다 있고 없음은 그대로 갈린다(상품 전체로 한 곳 이상만 보장).
 */
function fillSizes(mine: Offer[], set: string[]) {
  if (!mine.length || set.length < 2) return;
  for (const z of set) {
    if (mine.some((o) => (o.sizes[z] ?? 0) > 0)) continue;
    let from: { o: Offer; k: string } | null = null;
    for (const o of mine) for (const [k, n] of Object.entries(o.sizes)) if (n >= 2 && (!from || n > from.o.sizes[from.k])) from = { o, k };
    if (from) {
      from.o.sizes[from.k]--;
      from.o.sizes[z] = 1;
    } else {
      mine[0].sizes[z] = 1;
      mine[0].stock++;
    }
  }
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
    if (listed > 1) fillSizes(offers.filter((o) => o.productId === id && o.sellerId !== 'abroad'), SIZE_SETS[sizeKindOf(category)]);
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
