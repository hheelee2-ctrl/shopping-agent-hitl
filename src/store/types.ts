import type { L } from '../engine/types';

export type Category = 'coat' | 'jacket' | 'sneakers' | 'loafers' | 'knit' | 'shirt' | 'pants' | 'bag';
export type Color = 'black' | 'white' | 'navy' | 'beige' | 'gray' | 'brown' | 'khaki' | 'blue';
export type Material = 'wool' | 'wool-blend' | 'cotton' | 'leather' | 'denim' | 'cashmere' | 'nylon' | 'canvas' | 'polyester';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Style = 'formal' | 'casual' | 'light' | 'warm' | 'minimal';

export interface Product {
  id: string;
  name: L;
  brand: string;
  price: number;
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
  unknown: string[];
}
