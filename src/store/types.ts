import type { L } from '../engine/types';

export type Category =
  | 'coat' | 'jacket' | 'knit' | 'sweat' | 'tee' | 'shirt' | 'pants' | 'skirt'
  | 'sneakers' | 'loafers' | 'boots' | 'bag' | 'cap';
export type Color = 'black' | 'white' | 'navy' | 'beige' | 'gray' | 'brown' | 'khaki' | 'blue';
export type Material = 'wool' | 'wool-blend' | 'cotton' | 'leather' | 'denim' | 'cashmere' | 'nylon' | 'canvas' | 'polyester';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
/** 무드(formal~outdoor)와 기능(light·warm). 무드만 '내 스타일' 선택지가 된다. */
export type Style = 'formal' | 'casual' | 'minimal' | 'street' | 'classic' | 'outdoor' | 'light' | 'warm';
export const MOODS = ['minimal', 'casual', 'formal', 'street', 'classic', 'outdoor'] as const satisfies readonly Style[];
export type Mood = (typeof MOODS)[number];

/** 사이즈 체계. 같은 체계의 사이즈는 한 번 알려주면 다른 상품에도 쓴다. */
export type SizeKind = 'top' | 'shoe' | 'bottom' | 'free';
export const SIZE_SETS: Record<SizeKind, string[]> = {
  top: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  shoe: ['230', '235', '240', '245', '250', '255', '260', '265', '270', '275', '280', '285', '290'],
  bottom: ['25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36'],
  free: ['FREE'],
};

/** 한 요청에서 나누는 상품 수 상한 (규칙 파서와 LLM 해석이 같이 쓴다) */
export const MAX_ITEMS = 3;

/** 많이 고르는 사이즈. 설정 화면에서 바로 누를 수 있게 앞에 둔다. 나머지는 드롭다운으로. */
export const SIZE_COMMON: Record<'top' | 'shoe' | 'bottom', string[]> = {
  top: ['S', 'M', 'L', 'XL'],
  shoe: ['240', '250', '260', '270', '280'],
  bottom: ['28', '30', '32', '34'],
};
export const sizeKindOf = (c: Category): SizeKind =>
  c === 'sneakers' || c === 'loafers' || c === 'boots' ? 'shoe' : c === 'pants' || c === 'skirt' ? 'bottom' : c === 'bag' || c === 'cap' ? 'free' : 'top';

/**
 * 상품. 실제 가격·재고는 판매처별 오퍼(Offer)에 있고,
 * price·sizes·stock은 오퍼에서 계산한 요약이다 (price = 국내 판매처 최저 판매가, 재고 = 전 판매처 합).
 */
export interface Product {
  id: string;
  name: L;
  brand: string;
  price: number;
  /** 사이즈별 재고(전 판매처 합). stock은 이 값의 합이다. */
  sizes: Record<string, number>;
  stock: number;
  category: Category;
  colors: Color[];
  materials: Material[];
  seasons: Season[];
  styles: Style[];
}

/** 한 판매처가 한 상품을 파는 조건. 같은 상품도 판매처마다 가격·재고가 다르다. */
export interface Offer {
  id: string;
  productId: string;
  sellerId: string;
  price: number;
  sizes: Record<string, number>;
  stock: number;
}

export interface CartLine {
  productId: string;
  sellerId: string;
  qty: number;
  addedBy: 'user' | 'agent';
  size: string;
  priceAtAdd: number;
}

/** 판매처 하나에 대한 주문. 결제 한 번에 판매처 수만큼 주문이 생긴다. */
export interface Order {
  id: string;
  sellerId: string;
  lines: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  placedAt: number;
  shipAt: number;
  arriveAt: number;
  by: 'user' | 'agent';
}

export interface StoreState {
  products: Record<string, Product>;
  offers: Record<string, Offer>;
  cart: CartLine[];
  orders: Order[];
}

/** 요청에서 해석한 조건. 사람의 검색창과 에이전트가 같은 구조를 쓴다. */
export interface Criteria {
  category?: Category;
  /** "아우터", "신발" 같은 묶음 표현. 여러 종류를 모두 후보로 본다. category가 있으면 쓰지 않는다. */
  categories?: Category[];
  /** 묶음 표현의 이름 (칩 표시용) */
  group?: L;
  colors: Color[];
  materials: Material[];
  seasons: Season[];
  styles: Style[];
  maxPrice?: number;
  minPrice?: number;
  /** 요청에서 말한 사이즈. 없으면 내 사이즈(프로필)를 쓰거나 묻는다. */
  size?: string;
  /** "금요일까지", "내일까지" 같은 도착 마감 */
  deliverBy?: { weekday?: number; days?: number };
  unknown: string[];
}
