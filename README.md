# Nod — Shopping Agent HITL Console

에이전트가 쇼핑을 대행할 때 **사람은 어디서 개입해야 하는가**를 다루는 프로토타입.
목데이터 쇼핑몰(상품 62개, 13개 종류) 위에서 사람과 에이전트가 같은 장바구니·재고 state를 조작한다.
실제 결제는 없다. 요청 해석은 API 키가 있으면 Claude가, 없으면 규칙 파서가 한다.

Prototype exploring where a human should step in when an agent shops on their behalf.
A mock shop (62 products in 13 categories) whose cart and stock are operated by both the person and the agent.
No real payment. Request interpretation uses Claude when an API key is set, rule-based otherwise.

**Live:** https://shopping-agent-hitl.vercel.app (`main`에 푸시하면 Vercel이 자동 배포)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # rule gate + typecheck + token gate + tests + build
```

## 무엇이 실제로 동작하나

- **쇼핑몰**: 검색(자연어 해석 + 점수화), 카테고리, 장바구니, 재고 차감, 주문. 사람이 직접 쇼핑할 수 있다.
- **에이전트**: 같은 store를 읽고 바꾼다. 요청을 규칙 기반으로 해석하고(`src/store/parser.ts`), 같은 점수화로 후보를 고르고, 장바구니에 담는다.
- **확신도와 Escalation은 계산 결과다**: 조건 일치 점수, 상위 후보 간 점수 차이, 담는 시점의 실제 재고, 결제 한도에서 나온다. 미리 쓴 대본이 아니다.
- **살아 있는 쇼핑몰**: 시드 고정 난수로 다른 구매자의 구매·재입고·가격 변경이 계속 일어난다(`src/store/market.ts`). 에이전트는 이를 모르고 담는 순간 store를 다시 읽으므로, 품절·가격 변동 질문은 실제 변화에서 나온다.
- **사이즈**: 상품별 사이즈 재고, 내 사이즈 프로필. 요청에 사이즈가 없고 프로필도 비어 있거나 품절이면 담기 전에 묻는다. 이미 담은 상품은 중복 담기를 묻는다.
- **판매처·배송**: 한 상품을 여러 가상 판매처(브랜드 공식몰, 셀렉트숍, 종합몰, 해외직구)가 각자 가격·재고·배송비·도착일·반품 조건으로 판다(`src/store/sellers.ts`). 에이전트는 표시가가 아니라 배송비 포함 총액으로 판매처를 고르고 이유를 남긴다. "금요일까지" 같은 도착 마감을 지키고, 해외직구만 남거나 판매처가 3곳 이상으로 갈리면 묻는다.
- **주문·배송 조회**: 결제를 승인하면 판매처마다 주문이 생긴다. 결제는 승인 요청 → 판매처별 주문 접수(주문번호) → 주문 확인 순서로 진행 상태를 보여준다. 주문 상세에서 배송사·운송장 번호·배송 이력(주문 접수 → 상품 준비 → 집화 → 간선 이동 → 배송 출발 → 배송 완료)을 본다. 이력은 판매처의 출고 마감·배송일로 계산하고, 화면에서는 한 단계당 30초로 압축해 흐른다(`src/store/tracking.ts`의 `TRACK_SPAN`). Nod는 판매자가 아니며 결제 자체는 구현하지 않았다.
- **사이즈별 재고**: 판매처마다 전 사이즈에 종 모양으로 재고를 나눠 담고, 일부 사이즈는 비워 둔다(`allocate`). 같은 사이즈라도 판매처에 따라 있고 없음이 갈린다.
- **내 사이즈 저장**: 설정한 사이즈는 브라우저에 저장되어 다음 방문에도 쓴다. 자율도와 결제 한도는 매번 새로 고른다.
- **처리 시간 표현**: 담기, 주문 확인 전 재고·가격 재확인, 결제, 에이전트의 각 단계에 짧은 진행 상태를 둔다. 즉시 끝나는 동작이 오히려 신뢰를 떨어뜨린다는 판단에서다.
- **상품 카드**: 국내 쇼핑몰처럼 제품컷(옷걸이·플랫레이·누끼·디테일) 위주 사진, 할인율, 별점·리뷰 수·좋아요, BEST 배지를 보여준다.

## 승인 설계 원칙 (R1–R9)

사람이 어디서 개입하는지는 `src/rules.ts`의 규칙 9개로 정한다. 테스트 이름에 `[R4]`처럼 규칙을 붙이고, `scripts/rules.mjs`가 규칙마다 테스트 수를 센다. 테스트가 없는 규칙이 생기면 `npm run check`가 실패한다.

| | 규칙 | 테스트 |
|---|---|---|
| R1 | 결제는 사람만 한다 | 4 |
| R2 | 승인 강도는 되돌릴 수 있느냐로 정한다 (자율도 3단계) | 3 |
| R3 | 한도는 자율도와 따로 움직인다 | 6 |
| R4 | 낡은 승인은 쓰지 않는다 (담기 직전·결제 직전 재확인) | 11 |
| R5 | 모호하면 멈추고 묻는다 (계산된 조건에서만) | 19 |
| R6 | 무엇을 할지, 얼마나 확신하는지 보여준다 | 5 |
| R7 | 한 일은 남기고 되돌릴 수 있다 | 12 |
| R8 | 판매처를 고른 이유를 남긴다 | 10 |
| R9 | 요청이 취향보다 먼저다 | 10 |

숫자는 `src/rules.counts.json`에서 온다(한 테스트가 여러 규칙에 걸릴 수 있다).

- **설계 보기**: 앱 상단 '설계 보기'를 켜거나 `#/app?review=1`로 열면, 각 카드 위에 그 자리가 지키는 규칙과 테스트 수가 붙는다(`src/ui/Review.tsx`).
- **플레이북**: 랜딩 04 섹션(`#/playbook`)이 같은 목록을 보여준다.

## 사용성 테스트 모드

`#/app?study=P01`로 열면 과제 3개를 자율도를 바꿔 가며 수행하고, 과제마다 설문을 받는다. 자율도 순서는 참가자 번호로 돌린다(라틴 방격). 결제 승인 카드가 뜨면 담긴 상품 하나의 가격을 10% 올려 결제 직전 재확인(R4)에 대한 반응을 본다. 개입·거절·되돌리기·재확인 반응은 감사 타임라인에서 계산하고(`src/study/study.ts`), 끝나면 JSON·CSV로 내려받는다. 진행 방법은 [docs/usability-test.md](docs/usability-test.md).

## 구조

```
src/store/    쇼핑몰 도메인: 카탈로그, state(store), 요청 파서, 점수화 검색
src/agent/    RuleAgent: store 위에서 일하는 에이전트. 요청 해석기(interpret.ts)는 주입한다
api/          Vercel Function: Claude 요청 해석 (/api/parse)
src/engine/   에이전트 ↔ UI 경계 (AgentEvent, AgentAdapter)
src/state/    이벤트 → 화면 State 머신 (순수 reducer)
src/study/    사용성 테스트 모드: 과제, 자율도 순서, 타임라인 → 지표, CSV
src/rules.ts  승인 설계 규칙 R1–R9 (리뷰 모드·플레이북이 읽는다)
src/ui/       랜딩(히어로 진열대 HeroPicks), 쇼핑몰 화면, 에이전트 패널, 장바구니·주문 상세, 모션 엔진(motion.ts)
```

## 요청 해석: Claude ↔ 규칙 파서

요청 해석만 LLM으로 바꿨다. 검색·비교·담기·결제 승인 흐름은 그대로라, 해석이 틀려도 사람은 담기·결제 전에 본다.

- `api/parse.ts` (Vercel Function): 요청을 Claude(`claude-opus-5-5`, effort `low`)에 보내고, 구조화 출력(JSON Schema)으로 규칙 파서와 같은 `Parsed` 구조를 받는다. 거절 시 서버 측 폴백(`fallbacks: "default"`)을 쓴다.
- `src/agent/llmParse.ts`: 시스템 프롬프트, 스키마, `sanitize`. 서버와 클라이언트가 같이 쓰고, 클라이언트는 받은 값을 다시 어휘 안으로 거른다.
- `src/agent/interpret.ts`: `/api/parse`를 먼저 부르고, 키 없음(503)·실패·9초 초과면 규칙 파서(`parseMulti`)로 해석한다. 에이전트 패널의 해석 칩 끝에 `Claude가 해석` / `규칙으로 해석`이 붙는다.

공개 데모(https://shopping-agent-hitl.vercel.app)는 키 없이 규칙 파서로 동작한다. 해석하는 동안 "요청을 읽는 중 → 조건을 정리하는 중 → 쇼핑몰 조건으로 바꾸는 중"을 보여주고, 해석 결과를 한 문장으로 되말한 뒤(`restate`) 조건 칩을 보여준다. `Claude가 해석` 표시는 실제로 Claude가 해석했을 때만 붙는다.

### 해석률 (규칙 파서)

`src/store/requests.fixture.ts`에 실제로 칠 법한 요청과 기대 조건을 두고 `npm test`로 잰다. 색 이름 변형(깜장·아이보리·차콜), 구어체 가격(15만 정도·10만원대·10~20만원), 상황 표현(출근용·오버핏·시원한), 바지 허리 사이즈, 모르는 표현(브랜드·'힙한')이 남는지까지 본다.

| 세트 | 개선 전 | 개선 후 |
|---|---|---|
| 규칙을 고칠 때 쓴 세트 (46문장) | 25/46 (54%) | 46/46 |
| 따로 떼어 둔 확인용 세트 (20문장) | 13/20 (65%) | 20/20 |

두 세트 모두 직접 쓴 문장이라, 실사용자 문장에 대한 해석률은 이보다 낮을 수 있다.

설정: Vercel 프로젝트 환경변수에 `ANTHROPIC_API_KEY`를 넣고 다시 배포한다. 공개 URL이라 누구나 호출할 수 있으므로 Anthropic 콘솔에서 월 사용 한도를 걸어 두는 것을 권장한다. 요청은 200자까지만 받는다.
로컬 `npm run dev`(Vite)에는 `/api`가 없어 규칙 파서로 동작한다. 로컬에서 Claude 해석까지 보려면 `vercel dev`를 쓴다.

## 에이전트 교체 지점

UI는 `AgentEvent`(`understood`, `plan`, `tool_call`, `confidence`, `needs_input`, `payment_gate`, `result`, `undo`)만 본다.
`RuleAgent`는 `AgentAdapter`의 구현체이며, 같은 인터페이스를 구현하는 LLM 에이전트로 바꿔도 UI는 수정하지 않는다.
LLM 에이전트는 store의 검색·담기 기능을 tool로 노출하고, 결과를 위 이벤트로 변환하는 어댑터만 만들면 된다.

## 한계

- 키가 없을 때의 요청 해석은 규칙 기반이라 카테고리·색상·소재·계절·스타일·가격만 인식한다. 그 밖의 표현은 해석하지 못했다고 알리고 묻는다. Claude 해석도 같은 어휘 안으로만 바꾼다(쇼핑몰에 없는 조건은 `unknown`으로 남아 질문이 된다).
- 상품 상세 페이지는 없다. 사진은 Unsplash 제품컷이며 가상 상품과 실제 관계가 없어, 색·디테일이 상품명과 다를 수 있다. 카드에 상품 정보를 텍스트로 함께 보여준다.
- 모든 상품·브랜드·판매처·가격·재고·별점·리뷰 수는 가상이다. 별점·리뷰 수는 상품 id에서 고정 난수로 만든 값이다.
- 배송 이력은 실제 배송사 연동이 아니라 출고·도착 예정 시각으로 계산한 값이고, 화면 속도는 압축되어 있다.

## 검사 게이트

`npm run check`가 통과해야 머지한다.
`check:rules`는 승인 설계 규칙 중 테스트가 하나도 없는 규칙이 있으면 실패한다.
`check:tokens`는 `src/styles/tokens.css` 밖에서 색상 리터럴을 쓰면 실패한다 (AI가 만든 UI 코드의 토큰 이탈 방지).

## Credits

All products, brands and prices are fictional mock data. Photography is from [Unsplash](https://unsplash.com) (free license), product-style shots chosen without visible real-brand logos; they do not depict the fictional products.

Photographers: steph washi, Lisa Anna, Emre ÇOBAN, Valentina Schick, nkosie MAPHUMULO, Bulbul Ahmed, Alexander Mass, Tobias Tullius, Caio Coelho, philippe wehrli, Robert Richman, Yucel M, The DK Photography, Nikolai Chernichenko, Ervan M Wirawan, Davide Zacchello, Nelibar Shoes, Amirreza Tavassoli, Kateryna Hliznitsova, Sama Hosseini, Shelter, Vooglam Eyewear, Angelina Litvin, tian dayong, farhad chaudhary, TuanAnh Blue, saeed karimi, engin akyurt, Laura Chouette, Brando Makes Branding, Luis Quintero, Filipp Romanovski, Lea Øchel, SJ, Jia Ye, Husien Bisky, Noah Smith, Adrian Maximiliano Arellano, Zac Wolff, Debby Hudson, lilartsy, Mediamodifier, Federico Faccipieri, mockupbee, Md Salman, Or Hakim, Sincerely Media, Fauzan Fathullah, Maryam Nemati, K8, personalgraphic.com, Yang Deng, Benjamin R., Liam Davids.

Color palette: "BEND FORCE" (Warm Paper `#F0E8D8`, Vermilion `#EF5B36`, Deep Indigo `#212A5E`) from [포스터에 바로 적용하는 3색 조합 15가지](https://subsequent-paw-3ac.notion.site/3-15-3edced0d5b028000844ee29895ea0f34), adjusted for contrast.
