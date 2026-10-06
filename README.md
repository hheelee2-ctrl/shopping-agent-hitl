# Nod — Shopping Agent HITL Console

에이전트가 쇼핑을 대행할 때 **사람은 어디서 개입해야 하는가**를 다루는 프로토타입.
목데이터 쇼핑몰(상품 34개) 위에서 사람과 에이전트가 같은 장바구니·재고 state를 조작한다.
실제 결제와 LLM 호출은 없다.

Prototype exploring where a human should step in when an agent shops on their behalf.
A mock shop (34 products) whose cart and stock are operated by both the person and the agent.
No real payment, no LLM calls.

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
src/ui/       랜딩, 쇼핑몰 화면, 에이전트 패널, 하단 승인 바, 모션 엔진(motion.ts)
```

## 에이전트 교체 지점

UI는 `AgentEvent`(`understood`, `plan`, `tool_call`, `confidence`, `needs_input`, `payment_gate`, `result`, `undo`)만 본다.
`RuleAgent`는 `AgentAdapter`의 구현체이며, 같은 인터페이스를 구현하는 LLM 에이전트로 바꿔도 UI는 수정하지 않는다.
LLM 에이전트는 store의 검색·담기 기능을 tool로 노출하고, 결과를 위 이벤트로 변환하는 어댑터만 만들면 된다.

## 한계

- 요청 해석은 규칙 기반이라 카테고리·색상·소재·계절·스타일·가격만 인식한다. 그 밖의 표현은 해석하지 못했다고 알리고 묻는다.
- 상품 상세 페이지는 없다. 이미지는 분위기용 사진이며 상품과 실제 관계가 없어, 카드에 상품 정보를 텍스트로 함께 보여준다.
- 모든 상품·브랜드·가격은 가상이다.

## 검사 게이트

`npm run check`가 통과해야 머지한다.
`check:tokens`는 `src/styles/tokens.css` 밖에서 색상 리터럴을 쓰면 실패한다 (AI가 만든 UI 코드의 토큰 이탈 방지).

## Credits

All products, brands and prices are fictional mock data. Photography is from [Unsplash](https://unsplash.com) (free license), used as mood imagery only — it does not depict the fictional products.

Photographers: ola szkolda, Taras Chernus, Mohammad Hossein Mirzagol, Margo Evardson, Seyi Ariyo, Petr Urbanek, Mohamad Khosravi, Toa Heftiba, Isaac Ramirez, Ndagire, Dane Moukao, Mukesh Naik, The DK Photography, Jeff Tumale, Brian Hall, Grailify, McFollis, Nelibar Shoes, taha siddiqui, Nice M Nshuti, Ruta Gudeliene, Caio Coelho, Nimble Made, Md Salman, farhad chaudhary, Bien'arts, Hamed darzi, engin akyurt, sattar kazemi, Mobina Ghazazani, Álvaro Serrano, Yucel M.

Design tokens follow the Nike DESIGN.md analysis from [getdesign.md](https://getdesign.md) (independent analysis, not affiliated with Nike).
