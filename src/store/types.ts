import type { L } from '../engine/types';

export type Category = 'coat' | 'jacket' | 'sneakers' | 'loafers' | 'knit' | 'shirt' | 'pants' | 'bag';
export type Color = 'black' | 'white' | 'navy' | 'beige' | 'gray' | 'brown' | 'khaki' | 'blue';
export type Material = 'wool' | 'wool-blend' | 'cotton' | 'leather' | 'denim' | 'cashmere' | 'nylon' | 'canvas' | 'polyester';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Style = 'formal' | 'casual' | 'light' | 'warm' | 'minimal';

/** 사이즈 체계. 같은 체계의 사이즈는 한 번 알려주면 다른 상품에도 쓴다. */
export type SizeKind = 'top' | 'shoe' | 'bottom' | 'free';
export const SIZE_SETS: Record<SizeKind, string[]> = {
  top: ['S', 'M', 'L', 'XL'],
  shoe: ['250', '260', '270', '280'],
  bottom: ['28', '30', '32', '34'],
  free: ['FREE'],
};
export const sizeKindOf = (c: Category): SizeKind =>
  c === 'sneakers' || c === 'loafers' ? 'shoe' : c === 'pants' ? 'bottom' : c === 'bag' ? 'free' : 'top';

export interface Product {
  id: string;
  name: L;
  brand: string;
  price: number;
  /** 사이즈별 재고. stock은 이 값의 합이다. */
  sizes: Record<string, number>;
  stock: number;
  category: Category;
  colors: Color[];
  materials: Material[];
  seasons: Season[];
  styles: Style[];
}

export interface CartLine {
  productId: string;
  qty: number;
  addedBy: 'user' | 'agent';
  size: string;
  priceAtAdd: number;
}

export interface Order {
  id: string;
  lines: CartLine[];
  total: number;
}

export interface StoreState {
  products: Record<string, Product>;
  cart: CartLine[];
  orders: Order[];
}

/** 요청에서 해석한 조건. 사람의 검색창과 에이전트가 같은 구조를 쓴다. */
export interface Criteria {
  category?: Category;
  colors: Color[];
  materials: Material[];
  seasons: Season[];
  styles: Style[];
  maxPrice?: number;
  minPrice?: number;
  /** 요청에서 말한 사이즈. 없으면 내 사이즈(프로필)를 쓰거나 묻는다. */
  size?: string;
  unknown: string[];
}
