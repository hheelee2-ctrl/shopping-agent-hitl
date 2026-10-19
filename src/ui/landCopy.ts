import type { Dial, L } from '../engine/types';

export const LAND = {
  nav: [
    { id: 'problem', l: { ko: '문제', en: 'Problem' } },
    { id: 'scenes', l: { ko: '장면', en: 'Scenes' } },
    { id: 'playbook', l: { ko: '설계 원칙', en: 'Playbook' } },
    { id: 'proof', l: { ko: '검증', en: 'Proof' } },
    { id: 'try', l: { ko: '써 보기', en: 'Try it' } },
  ] satisfies { id: string; l: L }[],
  eyebrow: { ko: 'AI 에이전트 · 사람의 개입 설계', en: 'AI agents · Human-in-the-loop design' },
  heroA: { ko: '할 수 있는 에이전트를,', en: 'From an agent that can,' },
  heroB: { ko: '맡겨도 되는 에이전트로', en: 'to an agent you can trust' },
  heroSub: {
    ko: '계획, 담기, 결제. 에이전트가 하는 일마다 사람이 개입할 자리를 10가지 원칙으로 정하고, 직접 만든 쇼핑몰에서 그 원칙이 버티는지 시험했습니다.',
    en: 'Plan, add, pay. I set where a person steps in at each step with ten rules, and tested them in a shop I built.',
  },
  ctaRules: { ko: '설계 원칙 보기', en: 'See the rules' },
  start: { ko: '직접 맡겨 보기', en: 'Hand one off' },
  startShort: { ko: '써 보기', en: 'Try it' },

  map: {
    label: { ko: '개입 지도', en: 'Intervention map' },
    dial: { ko: '자율도', en: 'Autonomy' },
    you: { ko: '사람이 정함', en: 'You decide' },
    agent: { ko: '에이전트가 진행', en: 'Agent proceeds' },
    always: { ko: '항상 사람', en: 'Always you' },
    touches: { ko: (n: number) => `사람이 정하는 순간 ${n}번`, en: (n: number) => `${n} moment${n > 1 ? 's' : ''} you decide` },
    touchNote: { ko: '자율도를 올려도 결제는 사람에게 남습니다.', en: 'Raise autonomy and payment still stays with you.' },
    guard: { ko: '가격·재고가 바뀌면 멈추고 다시 묻기', en: 'Price or stock changed? Stop and ask again' },
    steps: [
      { t: { ko: '요청', en: 'Ask' }, d: { ko: '무엇을, 얼마까지', en: 'What, and how much' }, rules: ['R6'] },
      { t: { ko: '계획', en: 'Plan' }, d: { ko: '할 일을 먼저 보여줌', en: 'Shows the plan first' }, rules: ['R2'] },
      { t: { ko: '담기', en: 'Add' }, d: { ko: '판매처와 이유까지', en: 'Seller and why' }, rules: ['R2', 'R8'] },
      { t: { ko: '결제', en: 'Pay' }, d: { ko: '한도를 넘으면 멈춤', en: 'Stops over the limit' }, rules: ['R1', 'R3'] },
    ] satisfies { t: L; d: L; rules: string[] }[],
  },

  probTitle: { ko: '할 수 있다고, 맡겨도 되는 건 아닙니다', en: 'Able to is not safe to' },
  probSub: {
    ko: '가격 알림과 최저가 추적이 기본인 커머스 어그리게이터에서 일하며 본 장면에서 시작했습니다. 에이전트가 사람 대신 결제하는 방식은 이미 표준이 되고 있지만(ACP, AP2), 사람에게 주어진 선택지는 "매번 확인"과 "알아서" 둘뿐입니다.',
    en: 'It starts from what I saw working on a commerce aggregator built on price alerts and lowest-price tracking. Agent payments are standardizing (ACP, AP2), yet people get two options: "always ask" or "do it all".',
  },
  facts: [
    { k: { ko: '기다리는 일', en: 'The waiting' }, t: { ko: '가격이 내려오길 기다리다 놓친다', en: 'Waiting for a price drop, then missing it' }, d: { ko: '가격 알림을 걸어 두고 생각날 때마다 들어가 보다가, 놓쳐서 비싸게 사거나 지쳐서 그냥 삽니다. 에이전트에게 가장 먼저 맡기고 싶은 일입니다.', en: 'You set an alert, check back now and then, and end up paying more or giving in. It is the first thing you would hand to an agent.' } },
    { k: { ko: '움직이는 조건', en: 'Moving terms' }, t: { ko: '가격이 내려온 순간, 다른 조건도 바뀐다', en: 'When the price drops, other terms move too' }, d: { ko: '그 순간 내 사이즈가 품절일 수 있고, 배송비를 더하면 목표를 넘을 수 있고, 남은 곳이 해외직구뿐일 수 있습니다.', en: 'Your size may be gone, shipping may push it over, the only seller left may be overseas.' } },
    { k: { ko: '남은 질문', en: 'The open question' }, t: { ko: '사람이 없을 때, 승인은 어디까지 유효한가', en: 'When you are away, how far does an approval reach?' }, d: { ko: '"얼마나 자동화할까"가 아니라 "어느 자리에서, 무엇을 근거로 개입할까"로 질문을 바꿨습니다.', en: 'Not "how much to automate" but "where, and on what grounds, to step in."' } },
  ] satisfies { k: L; t: L; d: L }[],

  sceneTitle: { ko: '에이전트가 멈추는 세 장면', en: 'Three moments the agent stops' },
  sceneSub: { ko: '멈추는 자리는 대본이 아니라 계산으로 정해집니다. 실제 재고·가격·점수가 조건을 넘을 때만 멈춥니다.', en: 'Stops are computed, not scripted. The agent stops only when real stock, price or scores cross a line.' },
  scenes: [
    { r: 'R4', t: { ko: '승인한 뒤 가격이 바뀌면', en: 'When the price moves after you approve' }, d: { ko: '담지도, 결제하지도 않습니다. 바뀐 금액으로 다시 묻습니다. 승인은 행동이 아니라 그 순간의 조건에 대한 동의이기 때문입니다.', en: 'It neither adds nor pays. It asks again at the new price. An approval agrees to terms, not to an action.' } },
    { r: 'R5', t: { ko: '후보가 비슷하게 맞으면', en: 'When candidates tie' }, d: { ko: '점수 차이가 작으면 고르지 않고 나란히 보여줍니다. 자율도를 "알아서"로 올려도 이 질문은 사라지지 않습니다.', en: 'When scores are close, it lays them side by side instead of picking. Even at "do it all", this question stays.' } },
    { r: 'R10', t: { ko: '자리에 없을 때 가격이 내려오면', en: 'When the price drops while you are away' }, d: { ko: '미리 정한 사이즈·총액·판매처·기한이 모두 맞을 때만 삽니다. 가격만 내려오고 사이즈가 품절이면 사지 않고 이유를 남깁니다.', en: 'It buys only if the preset size, total, seller and deadline all fit. Price alone dropping with your size sold out means no purchase, and a logged reason.' } },
  ] satisfies { r: string; t: L; d: L }[],
  vis: {
    priceA: { ko: '178,000원', en: 'KRW 178,000' },
    priceB: { ko: '196,000원', en: 'KRW 196,000' },
    ask: { ko: '새 가격으로 다시 확인', en: 'Ask again at the new price' },
    candA: { ko: '후보 A · 82점', en: 'Option A · 82' },
    candB: { ko: '후보 B · 80점', en: 'Option B · 80' },
    pick: { ko: '직접 골라 주세요', en: 'You choose' },
    target: { ko: '목표 150,000원', en: 'Target KRW 150,000' },
    dropped: { ko: '149,000원 · M 품절', en: 'KRW 149,000 · M sold out' },
    held: { ko: '조건 밖 · 사지 않음', en: 'Out of terms · not bought' },
  },
  steps: [
    { t: { ko: '요청', en: 'Ask' }, d: { ko: '찾을 것을 말합니다', en: 'Say what you want' } },
    { t: { ko: '미리보기', en: 'Preview' }, d: { ko: '담기 전에 계획부터 보여줍니다', en: 'The plan comes before the action' } },
    { t: { ko: '승인', en: 'Approve' }, d: { ko: '승인하면 담고, 아니면 멈춥니다', en: 'Approve and it adds. Otherwise it stops' } },
    { t: { ko: '결제 직전', en: 'Before payment' }, d: { ko: '결제는 직접 합니다', en: 'You pay yourself' } },
  ] satisfies { t: L; d: L }[],

  proofTitle: { ko: '어떻게 확인했나', en: 'How it was checked' },
  proofSub: { ko: '원칙이 코드 변경을 견디는지는 자동 테스트로, 사람이 이해하는지는 사용성 테스트로 봅니다.', en: 'Automated tests check the rules survive code changes. A usability test checks people understand them.' },
  proof: [
    { n: { ko: '10 / 10', en: '10 / 10' }, t: { ko: '원칙마다 테스트가 묶여 있다', en: 'Every rule has tests' }, d: { ko: '테스트가 없는 원칙이 생기면 빌드가 실패합니다. 원칙별로 3개에서 19개까지 묶여 있습니다.', en: 'A rule without tests fails the build. Each rule has 3 to 19 tests.' } },
    { n: { ko: '3 → 2 → 1', en: '3 → 2 → 1' }, t: { ko: '자율도를 올리면 개입이 줄어든다', en: 'Higher autonomy, fewer interruptions' }, d: { ko: '같은 요청에서 사람이 정하는 횟수가 매번 확인 3번, 담기만 확인 2번, 알아서 1번. 결제 승인은 늘 남습니다.', en: 'Same request: 3 decisions at "always ask", 2 at "adds only", 1 at "do it all". Payment approval always stays.' } },
    { n: { ko: '5명', en: '5 people' }, t: { ko: '사람이 이해하는지 시험한다', en: 'Testing whether people understand' }, d: { ko: '자율도를 바꿔 가며 같은 과제를 맡기고, 결제 직전에 가격을 바꿔 알아채는지 봅니다. 마지막 과제는 가격 대기를 맡겨 사전 승인을 켜는지, 사지 않은 이유를 이해하는지 봅니다. 결과는 진행 후 공개합니다.', en: 'Same tasks at different autonomy, with a price change just before payment. The last task hands off a price watch: do people pre-approve, and do they get why it did not buy? Results follow.' } },
  ] satisfies { n: L; t: L; d: L }[],

  tryTitle: { ko: '직접 맡겨 보세요', en: 'Hand one off yourself' },
  trySub: { ko: '원칙이 실제 화면에서 어떻게 움직이는지 한 번 따라가 보세요.', en: 'Walk through how the rules play out on screen.' },
  agentTitle: { ko: '요청 하나로 진열대를 훑고, 담기 전에 묻습니다', en: 'One request scans the shelf. It asks before it adds' },
  agentSub: {
    ko: '조건에 안 맞는 상품은 흐려지고, 예산을 넘는 후보는 빠집니다. 고른 상품도 승인하기 전에는 담지 않습니다.',
    en: 'What does not match fades. What goes over budget drops out. Even the pick waits for your approval.',
  },

  playTitle: { ko: '승인 설계 원칙 10가지', en: 'Ten rules for approval design' },
  playSub: {
    ko: '사람이 어디서 개입하는지를 화면 감각이 아니라 규칙으로 정했습니다. 규칙마다 그 규칙을 지키는 테스트가 묶여 있고, 테스트가 없는 규칙이 생기면 빌드가 실패합니다.',
    en: 'Where a person steps in is set by rules, not by feel. Each rule is bound to the tests that guard it, and a rule without tests fails the build.',
  },
  playWithout: { ko: '없으면', en: 'Without it' },
  playWhere: { ko: '화면', en: 'Where' },
  playTests: { ko: (n: number) => `테스트 ${n}개`, en: (n: number) => `${n} tests` },
  playLink: { ko: '설계 원칙 10가지', en: 'The ten rules' },
  playOpen: { ko: '앱에서 규칙 위치 보기', en: 'See the rules in the app' },
  playNote: { ko: '앱 상단의 "설계 보기"를 켜면 각 카드 위에 그 자리가 지키는 규칙이 붙습니다.', en: 'Turn on "Design notes" in the app header to see which rule each card follows.' },

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
  dialStudy: { ko: '자율도는 과제마다 바뀌어요. 화면 위쪽 띠에 이번 과제의 자율도가 나와요.', en: 'Autonomy changes with each task. The bar at the top shows this task’s level.' },
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
