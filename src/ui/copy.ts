import type { Dial, L, Lang, Level } from '../engine/types';
import type { Phase } from '../state/console';

export const t = (l: L, lang: Lang) => l[lang];

export const C = {
  brand: { ko: 'Nod', en: 'Nod' },
  searchPh: { ko: '검색 (예: 검정 울 코트 20만원 이하)', en: 'Search (e.g. black wool coat under 200000)' },
  cart: { ko: '장바구니', en: 'Cart' },
  all: { ko: '전체', en: 'All' },
  scrubTitle: { ko: '행동 타임라인', en: 'Action timeline' },
  replay: { ko: '되감기 중', en: 'Replay' },
  live: { ko: '실시간', en: 'Live' },
  play: { ko: '▶ 처음부터 재생', en: '▶ Replay from start' },
  pause: { ko: '❚❚ 멈춤', en: '❚❚ Pause' },
  backToLive: { ko: '실시간으로', en: 'Back to live' },
  replayNote: { ko: '읽기 전용이에요. 지금 화면은 그 시점의 장바구니·재고·에이전트 상태예요.', en: 'Read-only. The screen shows cart, stock and agent state at that moment.' },
  heroKicker: { ko: 'Nod · 승인하는 쇼핑', en: 'Nod · shopping you approve' },
  heroTitle: { ko: '맡기되,\n승인은 당신이', en: 'Delegate.\nYou approve.' },
  heroSub: { ko: '에이전트는 같은 카트와 재고 위에서 일합니다. 사람은 승인만 합니다. 결제는 하지 않습니다.', en: 'The agent works on the same cart and stock you do. You only approve. It never pays.' },
  heroCta: { ko: '에이전트에게 맡기기', en: 'Ask the agent' },
  statItems: { ko: '상품', en: 'items' },
  statCart: { ko: '장바구니', en: 'in cart' },
  statAgent: { ko: '에이전트', en: 'agent' },
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
  checkout: { ko: '결제 (시뮬레이션)', en: 'Checkout (simulated)' },
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
  priceChange: { ko: '담기 승인 직후 판매처가 가격을 올림 (시연 · 승인 단계가 있을 때)', en: 'Seller raises the price right after you approve (demo — needs an approval step)' },
  stockout: { ko: '담기 직전 다른 구매자가 마지막 재고를 구매 (시연)', en: 'Another buyer takes the last unit just before adding (demo)' },
  run: { ko: '맡기기', en: 'Hand off' },
  rerun: { ko: '다시 맡기기', en: 'Run again' },
  reset: { ko: '초기화', en: 'Reset' },
  resetNote: { ko: '쇼핑몰(재고·장바구니)도 처음 상태로 돌아가요.', en: 'Also restores the shop (stock and cart).' },

  planTitle: { ko: '에이전트의 계획', en: "Agent's plan" },
  approveStart: { ko: '승인하고 시작', en: 'Approve & start' },
  cancel: { ko: '취소', en: 'Cancel' },
  approveCart: { ko: '담기 승인', en: 'Approve add to cart' },
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
  approvePay: { ko: '승인 (시뮬레이션)', en: 'Approve (simulated)' },
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

export const PRESETS: { text: L; label?: L; stockout?: boolean; priceChange?: boolean }[] = [
  { text: { ko: '검정 울 코트, 20만원 이하', en: 'black wool coat under 200000' } },
  { text: { ko: '가을에 입기 좋은 자켓', en: 'jacket for autumn' } },
  { text: { ko: '화이트 스니커즈 한 켤레', en: 'white sneakers' }, stockout: true },
  { text: { ko: '검정 가죽 로퍼 20만원 이하', en: 'black leather loafers under 200000' } },
  { text: { ko: '코트 힙한 느낌', en: 'coat hype vibe' } },
  { text: { ko: '검정 울 코트 20만원 이하랑 검정 가죽 로퍼, 합쳐서 35만원', en: 'black wool coat under 200000 and black leather loafers, total 350000' }, label: { ko: '코트 + 로퍼, 합쳐서 35만원', en: 'coat + loafers, 350000 total' } },
  { text: { ko: '검정 울 코트, 20만원 이하', en: 'black wool coat under 200000' }, label: { ko: '검정 울 코트 · 승인 뒤 가격 인상', en: 'black wool coat · price rises after approval' }, priceChange: true },
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
  idle: { ko: '대기', en: 'Idle' },
  planning: { ko: '계획 중', en: 'Planning' },
  'awaiting-approval': { ko: '승인 대기', en: 'Awaiting approval' },
  executing: { ko: '실행 중', en: 'Executing' },
  'needs-input': { ko: '입력 필요', en: 'Needs input' },
  'payment-gate': { ko: '결제 직전', en: 'Payment gate' },
  done: { ko: '완료', en: 'Done' },
  failed: { ko: '실패', en: 'Failed' },
  cancelled: { ko: '중단됨', en: 'Stopped' },
  undone: { ko: '되돌림', en: 'Undone' },
};

export const money = (n: number, lang: Lang) =>
  lang === 'ko' ? `${n.toLocaleString('ko-KR')}원` : `KRW ${n.toLocaleString('en-US')}`;
