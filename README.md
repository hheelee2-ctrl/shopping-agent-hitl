# Nod — Shopping Agent HITL Console

에이전트가 쇼핑을 대행할 때 **사람은 어디서 개입해야 하는가**를 다루는 프로토타입.
목데이터 쇼핑몰(상품 34개) 위에서 사람과 에이전트가 같은 장바구니·재고 state를 조작한다.
실제 결제와 LLM 호출은 없다.

Prototype exploring where a human should step in when an agent shops on their behalf.
A mock shop (34 products) whose cart and stock are operated by both the person and the agent.
No real payment, no LLM calls.

**Live:** https://shopping-agent-hitl.vercel.app (`main`에 푸시하면 Vercel이 자동 배포)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # typecheck + token gate + tests + build
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

## 설계 원칙 → 구현

| 원칙 | 구현 |
|---|---|
| Intent Preview | 요청 해석 칩 + 행동 전 계획 카드 (승인/취소) |
| Confidence Signal | 후보별 확신도 + 근거. 쇼핑몰 그리드 카드에도 표시 |
| Autonomy Dial | 매번 확인 / 담기만 확인 / 알아서 |
| Escalation Pathway | 해석 불가 표현, 종류 불명, 후보 점수 근접, 결과 없음, 사이즈 불명·품절, 중복 담기, 품절·가격 변동 시 멈추고 질문 |
| Action Audit | 행동 기록 + 되돌리기 (결제 승인 후에는 차단) |
| 결제 한도 | 한도 초과 시 Dial과 무관하게 직접 확인 |

결제는 어떤 자율도에서도 사람이 승인한다.

## 구조

```
src/store/    쇼핑몰 도메인: 카탈로그, state(store), 요청 파서, 점수화 검색
src/agent/    RuleAgent: store 위에서 일하는 에이전트
src/engine/   에이전트 ↔ UI 경계 (AgentEvent, AgentAdapter)
src/state/    이벤트 → 화면 State 머신 (순수 reducer)
src/ui/       랜딩(히어로 진열대 HeroPicks), 쇼핑몰 화면, 에이전트 패널, 장바구니·주문 상세, 모션 엔진(motion.ts)
```

## 에이전트 교체 지점

UI는 `AgentEvent`(`understood`, `plan`, `tool_call`, `confidence`, `needs_input`, `payment_gate`, `result`, `undo`)만 본다.
`RuleAgent`는 `AgentAdapter`의 구현체이며, 같은 인터페이스를 구현하는 LLM 에이전트로 바꿔도 UI는 수정하지 않는다.
LLM 에이전트는 store의 검색·담기 기능을 tool로 노출하고, 결과를 위 이벤트로 변환하는 어댑터만 만들면 된다.

## 한계

- 요청 해석은 규칙 기반이라 카테고리·색상·소재·계절·스타일·가격만 인식한다. 그 밖의 표현은 해석하지 못했다고 알리고 묻는다.
- 상품 상세 페이지는 없다. 사진은 Unsplash 제품컷이며 가상 상품과 실제 관계가 없어, 색·디테일이 상품명과 다를 수 있다. 카드에 상품 정보를 텍스트로 함께 보여준다.
- 모든 상품·브랜드·판매처·가격·재고·별점·리뷰 수는 가상이다. 별점·리뷰 수는 상품 id에서 고정 난수로 만든 값이다.
- 배송 이력은 실제 배송사 연동이 아니라 출고·도착 예정 시각으로 계산한 값이고, 화면 속도는 압축되어 있다.

## 검사 게이트

`npm run check`가 통과해야 머지한다.
`check:tokens`는 `src/styles/tokens.css` 밖에서 색상 리터럴을 쓰면 실패한다 (AI가 만든 UI 코드의 토큰 이탈 방지).

## Credits

All products, brands and prices are fictional mock data. Photography is from [Unsplash](https://unsplash.com) (free license), product-style shots chosen without visible real-brand logos; they do not depict the fictional products.

Photographers: steph washi, Lisa Anna, Emre ÇOBAN, nkosie MAPHUMULO, Bulbul Ahmed, Alexander Mass, Tobias Tullius, Caio Coelho, philippe wehrli, Robert Richman, Yucel M, The DK Photography, Nikolai Chernichenko, Ervan M Wirawan, Davide Zacchello, Nelibar Shoes, Amirreza Tavassoli, Kateryna Hliznitsova, Sama Hosseini, Shelter, Vooglam Eyewear, Angelina Litvin, tian dayong, farhad chaudhary, TuanAnh Blue, saeed karimi, engin akyurt, Laura Chouette, Brando Makes Branding, Luis Quintero.

Color palette: "BEND FORCE" (Warm Paper `#F0E8D8`, Vermilion `#EF5B36`, Deep Indigo `#212A5E`) from [포스터에 바로 적용하는 3색 조합 15가지](https://subsequent-paw-3ac.notion.site/3-15-3edced0d5b028000844ee29895ea0f34), adjusted for contrast.
