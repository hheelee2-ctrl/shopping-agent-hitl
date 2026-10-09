import type { Dial, L } from '../engine/types';

export const LAND = {
  nav: [
    { id: 'why', l: { ko: '왜 Nod', en: 'Why Nod' } },
    { id: 'how', l: { ko: '작동 방식', en: 'How it works' } },
    { id: 'approval', l: { ko: '승인 구조', en: 'Approval' } },
    { id: 'trust', l: { ko: '한도와 기록', en: 'Limits & log' } },
  ] satisfies { id: string; l: L }[],
  heroA: { ko: '말하면 찾고,', en: 'Say it.' },
  heroB: { ko: '승인하면 담아요', en: 'Approve, then it’s in.' },
  heroSub: {
    ko: '여러 판매처를 배송비까지 합쳐 비교하고, 담기 전에 묻습니다. 결제는 언제나 직접 합니다.',
    en: 'It compares sellers including shipping, and asks before it adds. You always pay yourself.',
  },
  start: { ko: '쇼핑 에이전트 시작하기', en: 'Start the shopping agent' },
  startShort: { ko: '시작하기', en: 'Start' },
  how: { ko: '작동 방식', en: 'How it works' },
  eyebrow: { ko: 'AI 쇼핑 에이전트 · 사람이 승인하는 구조', en: 'AI shopping agent · human-approved' },
  pickTag: { ko: '판매처 3곳 비교 끝', en: 'Compared 3 sellers' },
  pickAsk: { ko: '이대로 담을까요?', en: 'Add this?' },
  agentLabel: { ko: '에이전트가 일하는 방식', en: 'How the agent works' },
  agentTitle: { ko: '요청 하나로 진열대를 훑고, 담기 전에 묻습니다', en: 'One request scans the shelf. It asks before it adds' },
  agentSub: {
    ko: '조건에 안 맞는 상품은 흐려지고, 예산을 넘는 후보는 빠집니다. 고른 상품도 승인하기 전에는 담지 않습니다.',
    en: 'What does not match fades. What goes over budget drops out. Even the pick waits for your approval.',
  },
  statement: {
    ko: 'Nod는 요청을 읽고 판매처를 배송비까지 합쳐 비교합니다. 재고와 가격은 담는 순간 다시 확인하고, 담기 전에는 묻습니다. 결제는 언제나 당신이 합니다.',
    en: 'Nod reads the request and compares sellers with shipping included. Stock and price are checked again at the moment of adding, and it asks first. Payment is always yours.',
  },

  whyTitle: { ko: '비교는 맡기고, 결정은 직접', en: 'Hand off the comparing. Keep the deciding' },
  scenes: [
    { t: { ko: '쌓이는 탭', en: 'Tabs piling up' }, d: { ko: '같은 코트를 판매처마다 열어 비교합니다. 에이전트가 배송비와 도착일까지 합쳐 고르고, 애매하면 나란히 보여줍니다.', en: 'The same coat, open in every shop. The agent compares totals with shipping and arrival dates, and lays them side by side when it is unsure.' } },
    { t: { ko: '담는 순간의 재고', en: 'Stock at the moment of adding' }, d: { ko: '담기 직전에 재고를 다시 확인합니다. 없으면 담지 않고 대안을 묻습니다.', en: 'Stock is checked again right before adding. If it is gone, nothing is added and it asks about an alternative.' } },
    { t: { ko: '승인한 가격', en: 'The price you approved' }, d: { ko: '승인한 뒤 가격이 바뀌면 담지 않고 다시 묻습니다. 승인한 가격만 담깁니다.', en: 'If the price changes after you approve, it does not add. It asks again. Only the approved price goes in.' } },
  ] satisfies { t: L; d: L }[],
  vis: {
    stock1: { ko: '재고 1', en: 'Stock 1' },
    stock0: { ko: '재고 0', en: 'Stock 0' },
    alt: { ko: '대안 제안', en: 'Alternative' },
    priceA: { ko: '178,000원', en: 'KRW 178,000' },
    priceB: { ko: '199,000원', en: 'KRW 199,000' },
    ask: { ko: '다시 확인', en: 'Ask again' },
  },

  howTitle: { ko: '직접 한 번 따라가 보세요', en: 'Walk through it once' },
  steps: [
    { t: { ko: '요청', en: 'Ask' }, d: { ko: '찾을 것을 말합니다', en: 'Say what you want' } },
    { t: { ko: '미리보기', en: 'Preview' }, d: { ko: '담기 전에 계획부터 보여줍니다', en: 'The plan comes before the action' } },
    { t: { ko: '승인', en: 'Approve' }, d: { ko: '승인하면 담고, 아니면 멈춥니다', en: 'Approve and it adds. Otherwise it stops' } },
    { t: { ko: '결제 직전', en: 'Before payment' }, d: { ko: '결제는 직접 합니다', en: 'You pay yourself' } },
  ] satisfies { t: L; d: L }[],

  approvalTitle: { ko: '전부 맡기는 대신, 단계마다 정합니다', en: 'Not all at once. Step by step' },
  approvalSub: { ko: '자율도를 바꿔보세요. 승인이 필요한 단계가 달라집니다.', en: 'Change the autonomy level. The steps that need you change with it.' },
  rows: [
    { ko: '계획 시작', en: 'Start the plan' },
    { ko: '장바구니 담기', en: 'Add to cart' },
    { ko: '결제', en: 'Payment' },
  ] satisfies L[],
  you: { ko: '내 승인', en: 'You approve' },
  auto: { ko: '자동', en: 'Auto' },
  pay: { ko: '직접 결제', en: 'You pay' },
  payNote: { ko: '결제는 어느 단계에서도 직접 합니다.', en: 'Payment is yours at every level.' },

  trustTitle: { ko: '한도와 기록', en: 'Limits and log' },
  trust: [
    { t: { ko: '한도를 넘으면 직접 확인합니다', en: 'Over the limit, you review it' }, d: { ko: '자율도와 상관없이, 결제 직전 합계가 한도를 넘으면 경고를 띄웁니다.', en: 'At any autonomy level, a total above your limit raises a warning before payment.' } },
    { t: { ko: '확신이 낮으면 묻습니다', en: 'Low confidence, it asks' }, d: { ko: '후보가 비슷하거나 조건이 모호하면 직접 고르게 합니다.', en: 'When candidates tie or the request is vague, you choose.' } },
    { t: { ko: '한 일은 전부 기록됩니다', en: 'Every action is logged' }, d: { ko: '결제 전 행동은 되돌릴 수 있고, 타임라인으로 그 시점을 다시 볼 수 있습니다.', en: 'Actions before payment can be undone, and the timeline replays any moment.' } },
  ] satisfies { t: L; d: L }[],

  endTitle: { ko: '한 번 맡겨보세요', en: 'Hand one off' },
  foot: {
    ko: 'Nod는 판매자가 아닙니다. 주문, 배송, 반품은 각 판매처가 처리합니다.',
    en: 'Nod is not the seller. Each seller handles its own orders, shipping and returns.',
  },
} as const;

/** 자율도별로 사람이 승인하는 단계. agent.ts의 실제 동작과 같다: always→계획+담기, cart-only→담기, auto→없음. 결제는 항상 사람. */
export const APPROVES: Record<Dial, [boolean, boolean]> = {
  always: [true, true],
  'cart-only': [false, true],
  auto: [false, false],
};

/** 가이드 투어 — 실제 앱의 상품·가격(미드나잇 울 싱글 코트 178,000원)과 같은 값을 쓴다 */
export const TOUR = {
  price: 178000,
  stageTitle: { ko: '쇼핑 에이전트', en: 'Shopping agent' },
  cart: { ko: '장바구니', en: 'Cart' },
  reqLabel: { ko: '요청', en: 'Request' },
  request: { ko: '검정 울 코트, 20만원 이하', en: 'black wool coat under 200000' },
  chips: [
    { l: { ko: '색상', en: 'Color' }, v: { ko: '검정', en: 'black' } },
    { l: { ko: '소재', en: 'Material' }, v: { ko: '울', en: 'wool' } },
    { l: { ko: '종류', en: 'Type' }, v: { ko: '코트', en: 'coat' } },
    { l: { ko: '예산', en: 'Budget' }, v: { ko: '20만원 이하', en: 'under 200,000' } },
  ] satisfies { l: L; v: L }[],
  planLabel: { ko: '에이전트의 계획', en: "Agent's plan" },
  plan: [
    { ko: '조건에 맞는 상품 검색', en: 'Search products that match' },
    { ko: '재고와 가격 확인', en: 'Check stock and price' },
    { ko: '가장 맞는 한 개를 장바구니에 담기', en: 'Add the best match to the cart' },
  ] satisfies L[],
  planNote: { ko: '아직 아무것도 담지 않았습니다. 계획만 보여드립니다.', en: 'Nothing is added yet. This is only the plan.' },
  addLabel: { ko: '담기 승인', en: 'Approve add to cart' },
  product: { ko: '미드나잇 울 싱글 코트', en: 'Midnight Wool Single Coat' },
  brand: { ko: 'NOIR LAB', en: 'NOIR LAB' },
  conf: { ko: '확신 높음', en: 'High confidence' },
  approve: { ko: '담기 승인', en: 'Approve' },
  skip: { ko: '담지 않기', en: "Don't add" },
  added: { ko: '담았습니다', en: 'Added' },
  toPay: { ko: '결제 직전으로', en: 'To payment' },
  payLabel: { ko: '결제 직전 승인', en: 'Pre-payment approval' },
  limitShort: { ko: '한도', en: 'Limit' },
  limitLabel: { ko: '결제 한도', en: 'Payment limit' },
  over: { ko: '한도를 넘었습니다. 자율도와 관계없이 직접 확인이 필요합니다.', en: 'Over your limit. Needs your review regardless of autonomy level.' },
  payNote: { ko: '한도를 바꿔보세요. Nod는 결제를 대신하지 않습니다.', en: 'Change the limit. Nod never pays for you.' },
} as const;

export const SETUP = {
  title: { ko: '맡길 범위부터 정합니다', en: 'Set how much you hand off' },
  sub: { ko: '나중에 에이전트 패널에서 바꿀 수 있습니다.', en: 'You can change this later in the agent panel.' },
  dial: { ko: '자율도', en: 'Autonomy' },
  dialDesc: {
    always: { ko: '계획 시작과 담기를 모두 내가 승인합니다', en: 'You approve the plan and every add' },
    'cart-only': { ko: '계획은 바로 실행하고, 담기 전에 묻습니다', en: 'Runs the plan, asks before adding' },
    auto: { ko: '담기까지 알아서 합니다. 결제는 직접 합니다', en: 'Adds on its own. You still pay' },
  } satisfies Record<Dial, L>,
  limit: { ko: '결제 한도', en: 'Payment limit' },
  limitNote: { ko: '결제 직전 합계가 한도를 넘으면 경고합니다.', en: 'A total above this raises a warning before payment.' },
  go: { ko: '이 설정으로 시작', en: 'Start with these' },
  preparing: { ko: '준비하는 중', en: 'Getting ready' },
  ready: { ko: '준비됐습니다', en: 'Ready' },
  back: { ko: '처음으로', en: 'Back' },
} as const;
