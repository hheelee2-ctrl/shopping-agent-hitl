import type { Dial, L } from '../engine/types';

/**
 * 랜딩 문구. 토스처럼 말한다: 제목은 사용자가 얻는 것(덜어지는 수고), 작동 방식은 그 아래 작게.
 * 말투는 "~요"로 맞춘다. 사실(가격, 단계별 승인, 원칙 묶음)은 코드와 같아야 한다.
 */
export const LAND = {
  /** 섹션 제목 위의 작은 이름 */
  label: {
    scenes: { ko: '물어보는 순간', en: 'When it asks' },
    dial: { ko: '맡기는 정도', en: 'How much to hand off' },
    rules: { ko: '약속', en: 'Promises' },
    try: { ko: '직접 해 보기', en: 'Try it' },
    story: { ko: '만든 이야기', en: 'Behind it' },
  },
  heroName: { ko: 'Nod', en: 'Nod' },
  heroTitle: { ko: '말만 하면,\n찾아서 담아 줘요.', en: 'Say it. It finds it and adds it.' },
  heroBar: { ko: '결제는 언제나 내가 승인해요.', en: 'Every payment waits for your OK.' },
  start: { ko: '직접 맡겨 보기', en: 'Hand one off' },
  startShort: { ko: '써 보기', en: 'Try it' },

  /** 이런 게 편해져요: 큰 카드 다섯 장. 제목은 편해지는 것, 아래 한 줄은 어떻게 하는지 */
  hl: {
    title: { ko: '이런 게 편해져요.', en: 'What gets easier.' },
    play: { ko: '자동 넘김 시작', en: 'Play' },
    pause: { ko: '자동 넘김 멈추기', en: 'Pause' },
    go: { ko: (n: number) => `${n}번째 카드 보기`, en: (n: number) => `Show card ${n}` },
    cards: [
      {
        t: { ko: '"카멜·베이지 코트, 25만원\u00a0이하"\n이렇게만 말하면 돼요.', en: '"Camel or beige coat under 250k."\nThat is all you say.' },
        d: { ko: '색상·종류·예산으로 알아들은 걸 먼저 보여줘요.', en: 'It shows what it understood first: color, type, budget.' },
      },
      {
        t: { ko: '사이트를 오가며\n비교하지 않아도 돼요.', en: 'No more hopping\nbetween sites to compare.' },
        d: { ko: '조건에 안 맞거나 예산을 넘는 상품은 알아서 빼요.', en: 'What does not match, or goes over budget, drops out.' },
      },
      {
        t: { ko: '원하는 상품만\n장바구니에 담겨요.', en: 'Only what you want\nlands in your cart.' },
        d: { ko: '담기 전에 물어보게 정해 둘 수 있어요.', en: 'You can set it to ask before every add.' },
      },
      {
        t: { ko: '생각보다 비싸게\n결제될 일 없어요.', en: 'No paying more\nthan you meant to.' },
        d: { ko: '정해 둔 한도를 넘으면 결제 전에 알려줘요. 결제는 언제나 내가 승인해요.', en: 'Over your limit, it tells you before paying. Every payment waits for your OK.' },
      },
      {
        t: { ko: '뭘 했는지 다 보이고,\n되돌릴 수도 있어요.', en: 'You see everything it did,\nand can undo it.' },
        d: { ko: '찾고, 빼고, 묻고, 담은 기록이 모두 남아요.', en: 'Every find, drop, question and add is logged.' },
      },
    ] satisfies { t: L; d: L }[],
    /** 카드 다섯 장은 히어로와 같은 요청 하나를 따라간다 */
    request: { ko: '카멜·베이지 코트, 25만원 이하', en: 'Camel or beige coat under 250,000' },
    chips: [
      { l: { ko: '색상', en: 'Color' }, v: { ko: '카멜·베이지', en: 'camel, beige' } },
      { l: { ko: '종류', en: 'Type' }, v: { ko: '코트', en: 'coat' } },
      { l: { ko: '예산', en: 'Budget' }, v: { ko: '25만원 이하', en: 'under 250,000' } },
    ] satisfies { l: L; v: L }[],
    limit: 200000,
    match: { ko: '요청에 맞음', en: 'Match' },
    over: { ko: '예산 초과', en: 'Over budget' },
    budget: { ko: '예산 25만원', en: 'Budget KRW 250,000' },
    ask: { ko: '이 상품을 담을까요?', en: 'Add this item?' },
    add: { ko: '담기', en: 'Add' },
    skip: { ko: '다음에', en: 'Not now' },
    log: { ko: '지금까지 한 일', en: 'What it did' },
    undo: { ko: '되돌리기', en: 'Undo' },
    logs: [
      { ko: '요청을 알아들었어요', en: 'Understood the request' },
      { ko: '맞는 코트 3개를 찾았어요', en: 'Found 3 matching coats' },
      { ko: '예산을 넘는 1개를 뺐어요', en: 'Dropped 1 over budget' },
      { ko: '담기 전에 물어봤어요', en: 'Asked before adding' },
      { ko: '장바구니에 담았어요', en: 'Added to cart' },
    ] satisfies L[],
  },

  map: {
    label: { ko: '누가 정하나요', en: 'Who decides' },
    dial: { ko: '맡기는 정도', en: 'How much to hand off' },
    you: { ko: '내가 정함', en: 'You decide' },
    agent: { ko: '알아서 진행', en: 'Goes ahead' },
    touches: { ko: (n: number) => `내가 확인하는 순간 ${n}번`, en: (n: number) => `${n} moment${n > 1 ? 's' : ''} you check` },
    steps: [
      { t: { ko: '요청', en: 'Ask' }, d: { ko: '무엇을, 얼마까지', en: 'What, and how much' } },
      { t: { ko: '계획', en: 'Plan' }, d: { ko: '할 일을 먼저 보여줘요', en: 'Shows the plan first' } },
      { t: { ko: '담기', en: 'Add' }, d: { ko: '어디서, 왜 골랐는지까지', en: 'Where from, and why' } },
      { t: { ko: '결제', en: 'Pay' }, d: { ko: '한도를 넘으면 멈춰요', en: 'Stops over the limit' } },
    ] satisfies { t: L; d: L }[],
  },

  sceneTitle: { ko: '알아서 하다가도,\n이럴 땐 꼭 물어봐요.', en: 'It goes on its own,\nbut asks you here.' },
  sceneSub: { ko: '정해진 순서대로 묻지 않아요. 실제 가격·재고·후보를 보고 내가 정해야 할 때만 멈춰요.', en: 'Not on a script. It stops only when real price, stock or options make it your call.' },
  scenes: [
    { r: 'R4', t: { ko: '가격이 바뀌었을 때', en: 'When the price changes' }, d: { ko: '담기로 한 뒤 가격이 바뀌면, 담지도 결제하지도 않고 바뀐 가격으로 다시 물어봐요.', en: 'If the price moves after you said yes, it neither adds nor pays. It asks again at the new price.' } },
    { r: 'R5', t: { ko: '뭐가 나을지 애매할 때', en: 'When it is a close call' }, d: { ko: '두 상품이 비슷하게 맞으면 혼자 고르지 않고 나란히 보여줘요. "알아서"로 맡겨도 이건 물어봐요.', en: 'When two items fit about the same, it lays them side by side. Even on "Auto", it asks.' } },
    { r: 'R10', t: { ko: '자리 비운 사이 가격이 내려왔을 때', en: 'When the price drops while you are away' }, d: { ko: '미리 정하고 승인해 둔 사이즈·총액·판매처·기한이 모두 맞을 때만 사요. 하나라도 어긋나면 사지 않고 이유를 남겨요.', en: 'It buys only if the size, total, seller and deadline you set and approved ahead all fit. If one is off, it does not buy and notes why.' } },
  ] satisfies { r: string; t: L; d: L }[],
  vis: {
    priceA: { ko: '178,000원', en: 'KRW 178,000' },
    priceB: { ko: '196,000원', en: 'KRW 196,000' },
    ask: { ko: '새 가격으로 다시 확인', en: 'Ask again at the new price' },
    candA: { ko: '후보 A 82점', en: 'Option A 82' },
    candB: { ko: '후보 B 80점', en: 'Option B 80' },
    pick: { ko: '직접 골라 주세요', en: 'You choose' },
    target: { ko: '목표 150,000원', en: 'Target KRW 150,000' },
    dropped: { ko: '149,000원, M 품절', en: 'KRW 149,000 · M sold out' },
    held: { ko: '사이즈가 없어 사지 않음', en: 'Size gone, not bought' },
  },
  steps: [
    { t: { ko: '요청', en: 'Ask' }, d: { ko: '찾을 걸 말해요', en: 'Say what you want' } },
    { t: { ko: '미리보기', en: 'Preview' }, d: { ko: '담기 전에 계획부터 보여줘요', en: 'The plan comes before the action' } },
    { t: { ko: '승인', en: 'Approve' }, d: { ko: '좋다고 하면 담고, 아니면 멈춰요', en: 'Approve and it adds. Otherwise it stops' } },
    { t: { ko: '결제 전', en: 'Before payment' }, d: { ko: '결제는 내가 해요', en: 'You pay yourself' } },
  ] satisfies { t: L; d: L }[],

  dialTitle: { ko: '얼마나 맡길지는\n내가 정해요.', en: 'You decide\nhow much to hand off.' },
  dialSub: { ko: '세 단계 중에 고르면 돼요. 나중에 언제든 바꿀 수 있어요.', en: 'Pick one of three. You can change it any time.' },

  cmpTitle: { ko: '나에게 맞는 단계는?', en: 'Which level fits you?' },
  cmp: [
    { k: 'plan', t: { ko: '할 일을 먼저 확인', en: 'Check the plan first' } },
    { k: 'add', t: { ko: '담기 전에 확인', en: 'Check before adding' } },
    { k: 'tie', t: { ko: '애매하면 물어봄', en: 'Asks on a close call' } },
    { k: 'limit', t: { ko: '한도를 넘으면 미리 알림', en: 'Warns over your limit' } },
    { k: 'pay', t: { ko: '결제는 내가', en: 'You pay yourself' } },
  ] satisfies { k: 'plan' | 'add' | 'tie' | 'limit' | 'pay'; t: L }[],
  cmpYes: { ko: '해당', en: 'Yes' },
  cmpNo: { ko: '해당 없음', en: 'No' },

  tryTitle: { ko: '코트 하나,\n직접 따라가 보세요.', en: 'One coat,\nfollow it through.' },
  trySub: { ko: '요청부터 결제 전까지, 어떻게 움직이는지 하나씩 볼 수 있어요.', en: 'See each step, from request to payment.' },
  agentSub: {
    ko: '조건에 안 맞는 상품은 흐려지고, 예산을 넘는 후보는 빠져요. "담기만 확인"으로 두면 담기 전에 물어봐요.',
    en: 'What does not match fades. What goes over budget drops out. On "Cart only", it asks before adding.',
  },

  /** 약속: 앞에는 쉬운 말 네 개, 누르면 그 약속을 지키는 원칙(R)과 테스트 수가 작게 펼쳐진다 */
  playTitle: { ko: '얼마나 맡기든,\n이 네 가지는 꼭 지켜요.', en: 'However much you hand off,\nthese four always hold.' },
  playSub: {
    ko: '약속마다 그 약속을 지키는 원칙과 테스트가 따로 있어요.',
    en: 'Each promise has its own rules and tests behind it.',
  },
  stages: [
    { k: 'pay', t: { ko: '결제는 꼭 내가 승인해요', en: 'You approve every payment' }, d: { ko: '얼마나 맡겨도 결제는 사람이 승인해요. 한도를 넘으면 먼저 알려줘요.', en: 'However much you hand off, a person approves payment. Over the limit, you hear first.' }, ids: ['R1', 'R3', 'R2'] },
    { k: 'ask', t: { ko: '애매하면 먼저 물어봐요', en: 'Unsure? It asks first' }, d: { ko: '무엇을 알아들었고 왜 골랐는지 보여주고, 비슷한 후보는 혼자 고르지 않아요.', en: 'It shows what it understood and why it chose, and never breaks a close tie alone.' }, ids: ['R6', 'R8', 'R9', 'R5'] },
    { k: 'change', t: { ko: '조건이 바뀌면 다시 물어봐요', en: 'Terms change? It asks again' }, d: { ko: '가격이나 재고가 바뀌면 예전 승인을 쓰지 않아요. 자리 비운 사이엔 정한 조건 안에서만 움직여요.', en: 'A changed price or stock voids the old OK. While you are away, it stays inside your terms.' }, ids: ['R4', 'R10'] },
    { k: 'after', t: { ko: '한 일은 다 남겨요', en: 'Everything is on record' }, d: { ko: '찾고 담은 기록이 모두 남고, 언제든 되돌릴 수 있어요.', en: 'Every step is logged, and you can undo it any time.' }, ids: ['R7'] },
  ] satisfies { k: string; t: L; d: L; ids: string[] }[],
  playHow: { ko: '어떻게 지키나요', en: 'How it is kept' },
  playTests: { ko: (n: number) => `테스트 ${n}개`, en: (n: number) => `${n} tests` },
  playTotal: { ko: (r: number, n: number) => `원칙 ${r}개와 테스트 ${n}개로 지켜요`, en: (r: number, n: number) => `Kept by ${r} rules and ${n} tests` },
  playOpen: { ko: '앱 화면에서 원칙 찾아보기', en: 'Find the rules in the app' },
  playNote: { ko: '앱에서 "설계 보기"를 켜면 카드마다 해당 원칙이 표시돼요.', en: 'Switch on "Design notes" in the app to tag each card with its rule.' },

  /** 만든 이야기: 포트폴리오를 보는 사람을 위한 배경. 아래쪽에 작게 */
  storyTitle: { ko: '할 수 있는 AI를,\n맡겨도 되는 AI로.', en: 'From an AI that can,\nto an AI you can trust.' },
  storySub: {
    ko: '가격 알림과 최저가 비교가 핵심인 쇼핑 서비스에서 일하며 본 장면에서 시작했어요. AI가 대신 결제하는 표준(ACP, AP2)은 나왔지만, 고를 수 있는 건 "매번 확인"과 "다 알아서" 둘뿐이었어요. 그래서 "언제 멈추고 물을까"부터 정하고, 직접 만든 쇼핑몰에서 시험했어요.',
    en: 'It started at a shopping service built on price alerts and lowest-price tracking. Standards for agent payments (ACP, AP2) exist, yet people get two options: "always ask" or "do it all". So I decided first when it should stop and ask, then tested it in a shop I built.',
  },

  endTitle: { ko: '쇼핑 하나,\n맡겨 보세요.', en: 'Hand off\none shopping trip.' },
  endSub: { ko: '결제 직전에만 로그인해요. 테스트 결제라 실제 돈은 나가지 않아요.', en: 'You sign in only right before paying. It is a test payment; no real money moves.' },

  foot: {
    ko: 'Nod는 판매자가 아니에요. 주문, 배송, 반품은 각 판매처가 처리해요.',
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
    { ko: '조건에 맞는 상품 찾기', en: 'Search products that match' },
    { ko: '재고와 가격 확인', en: 'Check stock and price' },
    { ko: '가장 잘 맞는 한 개를 장바구니에 담기', en: 'Add the best match to the cart' },
  ] satisfies L[],
  planNote: { ko: '아직 아무것도 담지 않았어요. 계획만 보여드려요.', en: 'Nothing is added yet. This is only the plan.' },
  addLabel: { ko: '담기 승인', en: 'Approve add to cart' },
  product: { ko: '미드나잇 울 싱글 코트', en: 'Midnight Wool Single Coat' },
  brand: { ko: 'NOIR LAB', en: 'NOIR LAB' },
  conf: { ko: '잘 맞아요', en: 'Strong match' },
  approve: { ko: '담기', en: 'Approve' },
  skip: { ko: '담지 않기', en: "Don't add" },
  added: { ko: '담았어요', en: 'Added' },
  toPay: { ko: '결제 단계로', en: 'To payment' },
  payLabel: { ko: '결제 전 확인', en: 'Pre-payment approval' },
  limitShort: { ko: '한도', en: 'Limit' },
  limitLabel: { ko: '결제 한도', en: 'Payment limit' },
  over: { ko: '결제 한도를 넘었어요. 얼마나 맡겼든 직접 확인해야 해요.', en: 'Over your payment limit. However much you handed off, you check this one.' },
  payNote: { ko: '한도를 바꿔 보세요. 결제는 언제나 내가 승인해요.', en: 'Change the limit. Every payment waits for your OK.' },
} as const;

export const SETUP = {
  title: { ko: '맡길 범위부터 정해요', en: 'Set how much you hand off' },
  sub: { ko: '나중에 에이전트 패널에서 바꿀 수 있어요.', en: 'You can change this later in the agent panel.' },
  dial: { ko: '맡기는 정도', en: 'How much to hand off' },
  dialStudy: { ko: '맡기는 정도는 과제마다 바뀌어요. 화면 위쪽 띠에 이번 과제의 설정이 나와요.', en: 'This changes with each task. The bar at the top shows this task’s setting.' },
  dialDesc: {
    always: { ko: '할 일과 담기를 모두 내가 확인해요', en: 'You approve the plan and every add' },
    'cart-only': { ko: '할 일은 바로 진행하고, 담기 전에 물어봐요', en: 'Runs the plan, asks before adding' },
    auto: { ko: '담기까지 알아서 해요. 결제는 내가 해요', en: 'Adds on its own. You still pay' },
  } satisfies Record<Dial, L>,
  limit: { ko: '결제 한도', en: 'Payment limit' },
  limitNote: { ko: '결제 금액이 한도를 넘으면 결제 전에 알려 드려요.', en: 'If the total goes over this, you are told before paying.' },
  go: { ko: '이 설정으로 시작', en: 'Start with these' },
  preparing: { ko: '준비하고 있어요', en: 'Getting ready' },
  ready: { ko: '준비됐어요', en: 'Ready' },
  back: { ko: '처음으로', en: 'Back' },
} as const;
