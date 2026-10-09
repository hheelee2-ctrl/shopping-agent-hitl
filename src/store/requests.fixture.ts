import type { Category, Color, Material, Season, Style } from './types';

/**
 * 해석 평가 세트. 사람들이 쇼핑 에이전트에 실제로 칠 법한 문장과, 그 문장에서 뽑혀야 하는 조건.
 * 적은 항목만 비교한다(나머지는 비어 있어야 하는 건 unknown만 본다). 어휘를 늘리거나 규칙을 바꾸면 이 세트로 해석률을 잰다.
 */
export interface Expect {
  category?: Category;
  categories?: Category[];
  colors?: Color[];
  materials?: Material[];
  seasons?: Season[];
  styles?: Style[];
  maxPrice?: number;
  minPrice?: number;
  size?: string;
  weekday?: number;
  days?: number;
  /** 해석하지 못하고 남아야 하는 표현. 생략하면 비어 있어야 한다. */
  unknown?: string[];
  /** 여러 상품 요청이면 항목 수와 합계 예산 */
  items?: number;
  budget?: number;
}

export const REQUESTS: [string, Expect][] = [
  // 기본
  ['검정 울 코트, 20만원 이하', { category: 'coat', colors: ['black'], materials: ['wool'], maxPrice: 200000 }],
  ['코트 추천해줘', { category: 'coat' }],
  ['흰색 셔츠', { category: 'shirt', colors: ['white'] }],
  ['회색 슬랙스', { category: 'pants', colors: ['gray'] }],
  ['남색 가디건', { category: 'knit', colors: ['navy'] }],
  ['검은 구두', { category: 'loafers', colors: ['black'] }],
  ['베이지색 트렌치', { category: 'coat', colors: ['beige'] }],
  ['블랙 롱코트', { category: 'coat', colors: ['black'] }],
  // 색 이름의 변형
  ['깜장 코트', { category: 'coat', colors: ['black'] }],
  ['아이보리 니트', { category: 'knit', colors: ['white'] }],
  ['크림색 셔츠', { category: 'shirt', colors: ['white'] }],
  ['하늘색 셔츠', { category: 'shirt', colors: ['blue'] }],
  ['카키색 카고바지', { category: 'pants', colors: ['khaki'] }],
  ['차콜 슬랙스', { category: 'pants', colors: ['gray'] }],
  ['진청 청바지', { category: 'pants', colors: ['navy'], materials: ['denim'] }],
  // 소재
  ['갈색 스웨이드 로퍼', { category: 'loafers', colors: ['brown'], materials: ['leather'] }],
  ['면 소재 셔츠', { category: 'shirt', materials: ['cotton'] }],
  ['가죽 토트백 블랙', { category: 'bag', colors: ['black'], materials: ['leather'] }],
  ['와이드 데님 팬츠', { category: 'pants', materials: ['denim'] }],
  // 가격을 말하는 여러 방식
  ['15만 정도 로퍼', { category: 'loafers', maxPrice: 150000 }],
  ['20만원 안으로 코트', { category: 'coat', maxPrice: 200000 }],
  ['10만원대 가방', { category: 'bag', minPrice: 100000, maxPrice: 200000 }],
  ['10만원~20만원 사이 니트', { category: 'knit', minPrice: 100000, maxPrice: 200000 }],
  ['3만원 이하 셔츠', { category: 'shirt', maxPrice: 30000 }],
  ['5만원 넘는 가방', { category: 'bag', minPrice: 50000 }],
  // 상황·스타일 표현
  ['출근용 블레이저', { category: 'jacket', styles: ['formal'] }],
  ['하객룩 셔츠', { category: 'shirt', styles: ['formal'] }],
  ['데일리로 신을 흰 운동화', { category: 'sneakers', colors: ['white'], styles: ['casual'] }],
  ['미니멀한 블랙 셔츠', { category: 'shirt', colors: ['black'], styles: ['minimal'] }],
  ['오버핏 코트', { category: 'coat', styles: ['casual'] }],
  ['여름에 시원한 셔츠', { category: 'shirt', seasons: ['summer'], styles: ['light'] }],
  ['따숩은 니트', { category: 'knit', styles: ['warm'] }],
  ['가볍게 입을 봄 자켓', { category: 'jacket', seasons: ['spring'], styles: ['light'] }],
  ['겨울에 입을 따뜻한 아우터', { categories: ['coat', 'jacket'], seasons: ['winter'], styles: ['warm'] }],
  // 사이즈
  ['캐시미어 니트 네이비 L', { category: 'knit', colors: ['navy'], materials: ['cashmere'], size: 'L' }],
  ['270 화이트 스니커즈', { category: 'sneakers', colors: ['white'], size: '270' }],
  ['청바지 32', { category: 'pants', materials: ['denim'], size: '32' }],
  ['라지 사이즈 셔츠', { category: 'shirt', size: 'L' }],
  // 도착 마감
  ['금요일까지 받을 수 있는 셔츠', { category: 'shirt', weekday: 5 }],
  ['내일까지 오는 가방', { category: 'bag', days: 1 }],
  // 여러 상품
  ['블랙 코트랑 갈색 로퍼, 합쳐서 40만원', { items: 2, budget: 400000 }],
  ['니트하고 슬랙스', { items: 2 }],
  // 영어
  ['white leather sneakers under 150000', { category: 'sneakers', colors: ['white'], materials: ['leather'], maxPrice: 150000 }],
  ['black wool coat size M', { category: 'coat', colors: ['black'], materials: ['wool'], size: 'M' }],
  // 알 수 없는 표현은 남아서 질문이 되어야 한다
  ['힙한 코트', { category: 'coat', unknown: ['힙한'] }],
  ['나이키 운동화', { category: 'sneakers', unknown: ['나이키'] }],
];

/**
 * 따로 떼어 둔 확인용 세트. 위 세트로 규칙을 고친 뒤에 써서, 이 세트로는 규칙을 맞추지 않았다.
 * 이 세트의 해석률이 '처음 보는 문장'에 대한 실제 실력에 가깝다.
 */
export const HELD_OUT: [string, Expect][] = [
  ['까만색 가죽 가방', { category: 'bag', colors: ['black'], materials: ['leather'] }],
  ['아이보리 케이블 니트', { category: 'knit', colors: ['white'], unknown: ['케이블'] }],
  ['출근할 때 입을 네이비 블레이저', { category: 'jacket', colors: ['navy'], styles: ['formal'] }],
  ['30만원 안쪽 캐시미어 코트', { category: 'coat', materials: ['cashmere'], maxPrice: 300000 }],
  ['260 사이즈 로퍼', { category: 'loafers', size: '260' }],
  ['주말에 신을 캔버스 운동화', { category: 'sneakers', materials: ['canvas'], styles: ['casual'] }],
  ['20만원대 울 코트', { category: 'coat', materials: ['wool'], minPrice: 200000, maxPrice: 300000 }],
  ['토요일까지 받을 수 있는 니트', { category: 'knit', weekday: 6 }],
  ['그레이 맨투맨 M', { category: 'knit', colors: ['gray'], size: 'M' }],
  ['베이지 치노 30', { category: 'pants', colors: ['beige'], size: '30' }],
  ['따뜻한 겨울 패딩', { category: 'jacket', seasons: ['winter'], styles: ['warm'] }],
  ['심플한 흰 셔츠 10만원 이하', { category: 'shirt', colors: ['white'], styles: ['minimal'], maxPrice: 100000 }],
  ['갈색 스웨이드 자켓', { category: 'jacket', colors: ['brown'], materials: ['leather'] }],
  ['봄에 입기 좋은 가벼운 트렌치코트', { category: 'coat', seasons: ['spring'], styles: ['light'] }],
  ['검정 슬랙스랑 흰 셔츠', { items: 2 }],
  ['나일론 백팩 블랙', { category: 'bag', colors: ['black'], materials: ['nylon'] }],
  ['데일리 청바지 32인치', { category: 'pants', materials: ['denim'], styles: ['casual'], size: '32' }],
  ['하늘색 스트라이프 셔츠', { category: 'shirt', colors: ['blue'], unknown: ['스트라이프'] }],
  ['grey wool sweater', { category: 'knit', colors: ['gray'], materials: ['wool'] }],
  ['구찌 로퍼', { category: 'loafers', unknown: ['구찌'] }],
];
