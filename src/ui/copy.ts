import type { Dial, L, Lang, Level } from '../engine/types';
import type { Phase } from '../state/console';

export const t = (l: L, lang: Lang) => l[lang];

/** 판매처·배송·주문 화면 문구 */
export const SV = {
  sellers: { ko: '판매처', en: 'Sellers' },
  compareSellers: { ko: (n: number) => `판매처 ${n}곳 비교`, en: (n: number) => `Compare ${n} sellers` },
  freeShip: { ko: '무료배송', en: 'Free shipping' },
  shipFee: { ko: (s: string) => `배송비 ${s}`, en: (s: string) => `${s} shipping` },
  kind: {
    official: { ko: '브랜드 공식몰', en: 'Brand store' },
    select: { ko: '셀렉트숍', en: 'Select shop' },
    mall: { ko: '종합몰', en: 'Marketplace' },
    overseas: { ko: '해외직구', en: 'Overseas' },
  },
  price: { ko: '판매가', en: 'Price' },
  shipping: { ko: '배송비', en: 'Shipping' },
  landed: { ko: '배송비 포함', en: 'With shipping' },
  arrive: { ko: '도착', en: 'Arrival' },
  returns: { ko: '반품', en: 'Returns' },
  best: { ko: '총액 최저', en: 'Lowest total' },
  lowestTag: { ko: '표시가 최저', en: 'Lowest price' },
  noStock: { ko: '이 사이즈 없음', en: 'Not in this size' },
  addHere: { ko: '여기서 담기', en: 'Add from here' },
  pickSizeFirst: { ko: '사이즈를 먼저 고르세요', en: 'Pick a size first' },
  sheetNote: {
    ko: 'Nod는 판매자가 아니에요. 주문·배송·반품은 각 판매처가 처리해요.',
    en: 'Nod is not the seller. Each seller handles its own orders, shipping and returns.',
  },
  inCartAt: { ko: (s: string) => `${s}에 담김`, en: (s: string) => `In cart from ${s}` },
  // 장바구니·주문
  cartTab: { ko: '장바구니', en: 'Cart' },
  ordersTab: { ko: '주문 내역', en: 'Orders' },
  subtotal: { ko: '상품', en: 'Items' },
  shipTotal: { ko: '배송비', en: 'Shipping' },
  freeLeft: { ko: (s: string) => `${s} 더 담으면 이 판매처 무료배송`, en: (s: string) => `${s} more for free shipping here` },
  splitNote: { ko: (n: number) => `판매처 ${n}곳이라 주문도 ${n}건으로 나뉘어요.`, en: (n: number) => `${n} sellers, so this becomes ${n} orders.` },
  address: { ko: '배송지', en: 'Ship to' },
  addressV: { ko: '집 · 서울 성동구 연무장길 12, 302호', en: 'Home, 12 Yeonmujang-gil 302, Seongdong-gu, Seoul' },
  noOrders: { ko: '아직 주문이 없어요. 결제를 승인하면 판매처별 주문이 여기에 생겨요.', en: 'No orders yet. Approved payments show up here, one order per seller.' },
  orderNo: { ko: '주문번호', en: 'Order' },
  placedBy: { ko: { agent: '에이전트가 담고 내가 결제', user: '직접 결제' }, en: { agent: 'Added by the agent, paid by you', user: 'Paid by you' } },
  st: {
    paid: { ko: '결제 완료', en: 'Paid' },
    ready: { ko: '상품 준비 중', en: 'Preparing' },
    shipped: { ko: '출고', en: 'Shipped' },
    transit: { ko: '배송 중', en: 'In transit' },
    arrived: { ko: '도착', en: 'Delivered' },
  },
  expected: { ko: '예정', en: 'expected' },
  contact: { ko: (s: string) => `배송·반품 문의는 ${s}에 해요.`, en: (s: string) => `Ask ${s} about delivery and returns.` },
  orderCount: { ko: (n: number) => `주문 ${n}건`, en: (n: number) => `${n} order${n > 1 ? 's' : ''}` },
  payBreak: { ko: '판매처별 주문', en: 'Orders by seller' },
  duty: { ko: '관부가세가 따로 붙을 수 있어요', en: 'Import duties may apply' },
} as const;

/** 에이전트 스레드 문구 */
export const TH = {
  title: { ko: '에이전트', en: 'Agent' },
  settings: { ko: '맡기는 방식', en: 'How I work' },
  done: { ko: '접기', en: 'Done' },
  suggest: { ko: '이렇게 맡겨보세요', en: 'Try asking' },
  you: { ko: '나', en: 'You' },
  sellerWhy: { ko: '판매처를 고른 이유', en: 'Why this seller' },
  cartAsk: { ko: '이대로 담을까요?', en: 'Add this?' },
  limitOf: { ko: (s: string) => `한도 ${s}`, en: (s: string) => `Limit ${s}` },
  seeOrders: { ko: '주문 내역 보기', en: 'View orders' },
  log: { ko: '한 일', en: 'What I did' },
  sizeSum: { ko: '내 사이즈', en: 'My sizes' },
  payAsk: { ko: '결제를 승인할까요?', en: 'Approve payment?' },
  payNote: { ko: '승인하면 판매처마다 주문이 접수돼요. Nod는 판매자가 아니에요.', en: 'Approving places one order per seller. Nod is not the seller.' },
} as const;

export const SZ = {
  title: { ko: '내 사이즈', en: 'My sizes' },
  note: { ko: '에이전트가 담을 때 기본으로 씁니다. 미설정이면 담기 전에 물어봅니다.', en: 'Used by the agent when adding. If unset, it asks first.' },
  none: { ko: '미설정', en: 'Unset' },
  kind: { top: { ko: '상의·아우터', en: 'Tops' }, shoe: { ko: '신발', en: 'Shoes' }, bottom: { ko: '하의', en: 'Bottoms' } },
  pick: { ko: '사이즈', en: 'Size' },
  choose: { ko: '사이즈 선택', en: 'Select size' },
} as const;

export const C = {
  brand: { ko: 'Nod', en: 'Nod' },
  searchPh: { ko: '검색 (예: 검정 울 코트 20만원 이하)', en: 'Search (e.g. black wool coat under 200000)' },
  cart: { ko: '장바구니', en: 'Cart' },
  all: { ko: '전체', en: 'All' },
  scrubTitle: { ko: '행동 타임라인', en: 'Action timeline' },
  replay: { ko: '되감기 중', en: 'Replay' },
  live: { ko: '실시간', en: 'Live' },
  market: { ko: '지금 판매처에서', en: 'Live at sellers' },
  play: { ko: '▶ 처음부터 재생', en: '▶ Replay from start' },
  pause: { ko: '❚❚ 멈춤', en: '❚❚ Pause' },
  backToLive: { ko: '실시간으로', en: 'Back to live' },
  replayNote: { ko: '읽기 전용이에요. 지금 화면은 그 시점의 장바구니·재고·에이전트 상태예요.', en: 'Read-only. The screen shows cart, stock and agent state at that moment.' },
  themeToggle: { ko: '테마 전환', en: 'Toggle theme' },
  add: { ko: '담기', en: 'Add' },
  soldOut: { ko: '품절', en: 'Sold out' },
  left: { ko: '재고', en: 'Stock' },
  noResult: { ko: '조건에 맞는 상품이 없어요.', en: 'No products match.' },
  understoodAs: { ko: '이렇게 해석했어요', en: 'Interpreted as' },
  byAgent: { ko: '에이전트', en: 'Agent' },
  empty: { ko: '장바구니가 비었어요.', en: 'Your cart is empty.' },
  total: { ko: '합계', en: 'Total' },
  remove: { ko: '빼기', en: 'Remove' },
  checkout: { ko: '결제하기', en: 'Checkout' },
  orders: { ko: '주문 완료', en: 'Orders' },
  close: { ko: '닫기', en: 'Close' },

  agent: { ko: '쇼핑 에이전트', en: 'Shopping agent' },
  agentSub: { ko: '결제 직전까지 대신합니다', en: 'Everything up to checkout' },
  request: { ko: '요청', en: 'Request' },
  requestPh: { ko: '무엇을 찾아서 담아드릴까요?', en: 'What should I find and add?' },
  presets: { ko: '예시', en: 'Examples' },
  dial: { ko: '자율도', en: 'Autonomy' },
  dialNote: { ko: '어떤 단계에서도 결제는 직접 승인해요.', en: 'You approve payment at every level.' },
  limit: { ko: '결제 한도', en: 'Payment limit' },
  run: { ko: '맡기기', en: 'Hand off' },
  rerun: { ko: '다시 맡기기', en: 'Run again' },
  reset: { ko: '초기화', en: 'Reset' },
  resetNote: { ko: '쇼핑몰(재고·장바구니)도 처음 상태로 돌아가요.', en: 'Also restores the shop (stock and cart).' },

  planTitle: { ko: '에이전트의 계획', en: "Agent's plan" },
  approveStart: { ko: '끄덕, 시작', en: 'Nod, start' },
  cancel: { ko: '취소', en: 'Cancel' },
  approveCart: { ko: '끄덕, 담기', en: 'Nod, add it' },
  skipCart: { ko: '담지 않기', en: "Don't add" },
  compare: { ko: '나란히 비교', en: 'Compare' },
  candidates: { ko: '후보', en: 'Candidates' },
  askTitle: { ko: '에이전트가 묻고 있어요', en: 'The agent needs your input' },
  payTitle: { ko: '결제 직전 승인', en: 'Pre-payment approval' },
  limitShort: { ko: '한도', en: 'Limit' },
  exceeded: {
    ko: '한도를 넘었어요. 자율도와 관계없이 직접 확인이 필요해요.',
    en: 'Over your limit. Needs your review regardless of autonomy level.',
  },
  approvePay: { ko: '끄덕, 결제', en: 'Nod, pay' },
  declinePay: { ko: '결제 안 함', en: "Don't pay" },
  audit: { ko: '행동 기록', en: 'Action audit' },
  auditEmpty: { ko: '아직 행동이 없어요.', en: 'No actions yet.' },
  undo: { ko: '되돌리기', en: 'Undo' },
  undone: { ko: '되돌림', en: 'Undone' },
  removedByYou: { ko: '장바구니에서 직접 뺌', en: 'Removed from cart by you' },
  ordered: { ko: '주문됨', en: 'Ordered' },
  idle: { ko: '요청을 입력하거나 예시를 골라 맡겨보세요.', en: 'Type a request or pick an example.' },
  statusRunning: { ko: '진행 중', en: 'In progress' },
  statusWaiting: { ko: '승인 대기', en: 'Awaiting approval' },
  statusDone: { ko: '완료', en: 'Done' },
  statusFailed: { ko: '실패', en: 'Failed' },
} satisfies Record<string, L>;

export const PRESETS: { text: L; label?: L }[] = [
  { text: { ko: '검정 울 코트, 20만원 이하', en: 'black wool coat under 200000' } },
  { text: { ko: '가을에 입기 좋은 자켓', en: 'jacket for autumn' } },
  { text: { ko: '화이트 스니커즈 한 켤레', en: 'white sneakers' } },
  { text: { ko: '검정 가죽 로퍼 20만원 이하', en: 'black leather loafers under 200000' } },
  { text: { ko: '검정 울 코트 XL', en: 'black wool coat, size XL' } },
  { text: { ko: '화이트 스니커즈 280', en: 'white sneakers, size 280' } },
  { text: { ko: '코트 힙한 느낌', en: 'coat hype vibe' } },
  { text: { ko: '검정 울 코트 20만원 이하랑 검정 가죽 로퍼, 합쳐서 35만원', en: 'black wool coat under 200000 and black leather loafers, total 350000' }, label: { ko: '코트 + 로퍼, 합쳐서 35만원', en: 'coat + loafers, 350000 total' } },
];

export const DIAL: Record<Dial, L> = {
  always: { ko: '매번 확인', en: 'Every step' },
  'cart-only': { ko: '담기만 확인', en: 'Cart only' },
  auto: { ko: '알아서', en: 'Auto' },
};

export const LEVEL: Record<Level, L> = {
  high: { ko: '확신 높음', en: 'High confidence' },
  medium: { ko: '확신 보통', en: 'Medium confidence' },
  low: { ko: '확신 낮음', en: 'Low confidence' },
};

export const PHASE: Record<Phase, L> = {
  idle: { ko: '맡길 일을 기다려요', en: 'Ready when you are' },
  planning: { ko: '요청을 읽는 중', en: 'Reading your request' },
  'awaiting-approval': { ko: '끄덕임을 기다려요', en: 'Waiting for your nod' },
  executing: { ko: '찾고 비교하는 중', en: 'Searching and comparing' },
  'needs-input': { ko: '답을 기다려요', en: 'Waiting for your answer' },
  'payment-gate': { ko: '결제 승인을 기다려요', en: 'Waiting for payment approval' },
  done: { ko: '완료', en: 'Done' },
  failed: { ko: '실패', en: 'Failed' },
  cancelled: { ko: '중단됨', en: 'Stopped' },
  undone: { ko: '되돌림', en: 'Undone' },
};

export const money = (n: number, lang: Lang) =>
  lang === 'ko' ? `${n.toLocaleString('ko-KR')}원` : `KRW ${n.toLocaleString('en-US')}`;
