# Nod — 에이전트에게 결제까지 맡길 때, 사람이 개입할 자리를 설계하다

에이전트가 계획·담기·결제를 할 수 있을 때 **사람은 어디서, 무엇을 근거로 개입해야 하는가**를 승인 설계 원칙 10가지(R1–R10)로 정하고, 그 원칙을 시험하는 프로토타입.
목데이터 쇼핑몰(상품 89개, 15개 종류) 위에서 사람과 에이전트가 같은 장바구니·재고 state를 조작한다. 쇼핑몰은 결과물이 아니라 원칙을 시험하는 무대다.
실제 결제는 없다. 요청 해석은 API 키가 있으면 Claude가, 없으면 규칙 파서가 한다.

Designing where a person steps in when an agent can plan, add and pay: ten approval rules (R1–R10) and a prototype that tests them.
A mock shop (89 products in 15 categories) whose cart and stock are operated by both the person and the agent; the shop is the test bed, not the product.
No real payment. Request interpretation uses Claude when an API key is set, rule-based otherwise.

**Live:** https://shopping-agent-hitl.vercel.app (`main`에 푸시하면 Vercel이 자동 배포)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # rule gate + typecheck + token gate + tests + build
```

## 무엇이 실제로 동작하나

- **가격 대기**: 상품 시트의 '가격이 내려오면 사기'. 사이즈·배송비 포함 총액·국내 판매처 여부·기한을 정하고, 원하면 "조건이 모두 맞으면 내 승인 없이 결제"를 사전 승인한다. 시연용 시계로 하루씩 가격이 움직이고, 가격이 내려와도 사이즈 품절·배송비 초과·해외직구면 사지 않고 이유를 남긴다. 사전 승인이 없으면 조건이 맞아도 묻고, 묻는 사이 조건이 바뀌면 사지 않는다. 사전 승인은 한 번 사면 끝난다(`src/agent/watch.ts`).
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

## 승인 설계 원칙 (R1–R10)

사람이 어디서 개입하는지는 `src/rules.ts`의 규칙 10개로 정한다. 테스트 이름에 `[R4]`처럼 규칙을 붙이고, `scripts/rules.mjs`가 규칙마다 테스트 수를 센다. 테스트가 없는 규칙이 생기면 `npm run check`가 실패한다.

| | 규칙 | 테스트 |
|---|---|---|
| R1 | 결제는 사람이 승인한다 (예외는 R10의 사전 승인뿐) | 6 |
| R2 | 승인 강도는 되돌릴 수 있느냐로 정한다 (자율도 3단계) | 3 |
| R3 | 한도는 자율도와 따로 움직인다 | 6 |
| R4 | 낡은 승인은 쓰지 않는다 (담기 직전·결제 직전 재확인) | 11 |
| R5 | 모호하면 멈추고 묻는다 (계산된 조건에서만) | 19 |
| R6 | 무엇을 할지, 얼마나 확신하는지 보여준다 | 5 |
| R7 | 한 일은 남기고 되돌릴 수 있다 | 12 |
| R8 | 판매처를 고른 이유를 남긴다 | 10 |
| R9 | 요청이 취향보다 먼저다 | 10 |
| R10 | 자리에 없을 때는 미리 정한 조건 안에서만 (가격 대기) | 10 |

숫자는 `src/rules.counts.json`에서 온다(한 테스트가 여러 규칙에 걸릴 수 있다).

- **설계 보기**: 에이전트 패널의 '설계 보기' 스위치를 켜거나 `#/app?review=1`로 열면, 각 카드 위에 그 자리가 지키는 규칙과 테스트 수가 붙는다(`src/ui/Review.tsx`).
- **플레이북**: 랜딩 04 섹션(`#/playbook`)이 같은 목록을 보여준다.

## 사용성 테스트 모드

`#/app?study=P01`로 열면 과제 3개를 자율도를 바꿔 가며 수행하고, 네 번째로 가격 대기를 맡긴다. 과제마다 설문을 받는다. 가격 대기 과제는 참가자마다 같은 가격 흐름(사지 않는 날 → 조건이 맞는 날)을 본다. 자율도 순서는 참가자 번호로 돌린다(라틴 방격). 결제 승인 카드가 뜨면 담긴 상품 하나의 가격을 10% 올려 결제 직전 재확인(R4)에 대한 반응을 본다. 개입·거절·되돌리기·재확인 반응은 감사 타임라인에서 계산하고(`src/study/study.ts`), 끝나면 JSON·CSV로 내려받는다. 진행 방법은 [docs/usability-test.md](docs/usability-test.md).

## 구조

```
src/store/    쇼핑몰 도메인: 카탈로그, state(store), 요청 파서, 점수화 검색
src/agent/    RuleAgent: store 위에서 일하는 에이전트. 요청 해석기(interpret.ts)는 주입한다
api/          Vercel Function: Claude 요청 해석 (/api/parse), 테스트 결제 준비·승인 (/api/pay/prepare, /api/pay/confirm)
src/engine/   에이전트 ↔ UI 경계 (AgentEvent, AgentAdapter)
src/state/    이벤트 → 화면 State 머신 (순수 reducer)
src/auth/     로그인(카카오·구글, Supabase)과 사전 승인 기록
src/pay/      토스 테스트 결제: 서명·대조(contract), 결제 창구(gateway), 팝업 결제 창(window, pay.html)
src/study/    사용성 테스트 모드: 과제, 자율도 순서, 타임라인 → 지표, CSV
src/rules.ts  승인 설계 규칙 R1–R10 (리뷰 모드·플레이북이 읽는다)
src/ui/       랜딩(히어로 진열대 HeroPicks), 쇼핑몰 화면, 에이전트 패널, 장바구니·주문 상세, 모션 엔진(motion.ts)
```

## 요청 해석: Claude ↔ 규칙 파서

요청 해석만 LLM으로 바꿨다. 검색·비교·담기·결제 승인 흐름은 그대로라, 해석이 틀려도 사람은 담기·결제 전에 본다.

- `api/parse.ts` (Vercel Function): 요청을 Claude(`claude-opus-5-5`, effort `low`)에 보내고, 구조화 출력(JSON Schema)으로 규칙 파서와 같은 `Parsed` 구조를 받는다. 거절 시 서버 측 폴백(`fallbacks: "default"`)을 쓴다.
- `src/agent/llmParse.ts`: 시스템 프롬프트, 스키마, `sanitize`. 서버와 클라이언트가 같이 쓰고, 클라이언트는 받은 값을 다시 어휘 안으로 거른다.
- `src/agent/interpret.ts`: `/api/parse`를 먼저 부르고, 키 없음(503)·실패·9초 초과면 규칙 파서(`parseMulti`)로 해석한다. 에이전트 패널의 해석 칩 끝에 `Claude가 해석` / `규칙으로 해석`이 붙는다.

공개 데모(https://shopping-agent-hitl.vercel.app)는 키와 호출 제한이 설정되기 전까지 규칙 파서로 동작한다. 해석하는 동안 "요청을 읽는 중 → 조건을 정리하는 중 → 쇼핑몰 조건으로 바꾸는 중"을 보여주고, 해석 결과를 한 문장으로 되말한 뒤(`restate`) 조건 칩을 보여준다. `Claude가 해석` 표시는 실제로 Claude가 해석했을 때만 붙는다.

### 해석률 (규칙 파서)

`src/store/requests.fixture.ts`에 실제로 칠 법한 요청과 기대 조건을 두고 `npm test`로 잰다. 색 이름 변형(깜장·아이보리·차콜), 구어체 가격(15만 정도·10만원대·10~20만원), 상황 표현(출근용·오버핏·시원한), 바지 허리 사이즈, 모르는 표현(브랜드·'힙한')이 남는지까지 본다.

| 세트 | 개선 전 | 개선 후 |
|---|---|---|
| 규칙을 고칠 때 쓴 세트 (46문장) | 25/46 (54%) | 46/46 |
| 따로 떼어 둔 확인용 세트 (20문장) | 13/20 (65%) | 20/20 |

두 세트 모두 직접 쓴 문장이라, 실사용자 문장에 대한 해석률은 이보다 낮을 수 있다.

### 호출 제한

공개 URL이라 누구나 `/api/parse`를 부를 수 있다. 그래서 Claude를 부르기 전에 횟수부터 센다(`src/agent/quota.ts`).

- 한 사람(IP 해시, 원래 IP는 저장하지 않음) 시간당 10회, 전체 하루 200회. 넘으면 429를 돌려주고 클라이언트는 그 세션 동안 규칙 파서로 해석한다.
- 서버리스 함수는 메모리가 이어지지 않아 횟수는 Supabase에 둔다(`supabase/001_llm_quota.sql`). 셀 곳이 없거나 DB가 응답하지 않으면 Claude를 부르지 않는다.
- 요청은 200자까지만 받는다. Anthropic 콘솔의 월 사용 한도는 이와 별도로 걸어 둔다.

### 설정 (Vercel 환경변수)

| 이름 | 값 | 공개 여부 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic 콘솔에서 발급 | 비밀 |
| `SUPABASE_URL` | Supabase 프로젝트 URL | 공개돼도 됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서버 키. 서버 함수에서만 쓴다 | 비밀 |
| `QUOTA_SALT` | 아무 긴 문자열. IP 해시에 섞는다 | 비밀 |
| `LLM_LIMIT_PER_HOUR`, `LLM_LIMIT_PER_DAY` | 선택. 기본 10, 200 | — |

| `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` | 토스페이먼츠 **테스트** 키(API 개별 연동 키, `test_ck_`·`test_sk_`). live 키는 받지 않는다 | 시크릿 키는 비밀 |

Supabase SQL Editor에서 `supabase/001_llm_quota.sql`을 한 번 실행한 뒤 다시 배포한다.
로컬 `npm run dev`도 `api/*.ts`를 그대로 부른다(`vite.config.ts`의 개발용 미들웨어). 키는 `.env.local`에 넣는다(저장소에 올라가지 않음). Supabase 없이 Claude 해석을 볼 때만 `LLM_UNLIMITED=1`을 넣는다.

## 결제: 토스페이먼츠 테스트 결제

사람이 결제 승인 카드에서 승인하면, 토스 테스트 결제창(샌드박스)에서 한 번 더 결제한다. 실제로 돈이 나가지 않는다.

```
승인 클릭 ─ /api/pay/prepare: 주문번호 + 승인한 금액에 서명
          ├ 데스크톱: Nod 화면 위에 토스 결제창(페이지 이동 없음, Promise로 결과 받음)
          └ 모바일:   팝업(pay.html) 안에서 토스 결제창 → 성공 주소 → BroadcastChannel로 결과
          → /api/pay/confirm: 토스가 돌려준 주문번호·금액 = 서명한 값일 때만 토스 승인 API 호출
          → 에이전트가 승인 순간의 견적 그대로 주문 확정
```

- **서버는 상품 가격을 모른다.** 가격은 브라우저 안의 시뮬레이션 쇼핑몰이 정한다. 그래서 서버는 가격을 다시 계산하지 않고, 사람이 Nod에서 승인한 금액에 서명해 두었다가 토스가 돌려준 금액과 1원이라도 다르면 승인하지 않는다(`src/pay/contract.ts`, [R4]). 승인하지 않은 결제는 토스에서 만료되어 돈이 나가지 않는다.
- **결제창은 Nod 화면을 떠나지 않는다.** Nod의 장바구니·에이전트 상태는 메모리에 있다. 데스크톱은 결제창을 화면 위에 띄우고, 모바일은 토스가 페이지 이동만 허용하므로 이동을 팝업 안에서만 일으킨다. 팝업이 막히면 에이전트가 "결제창 다시 열기"를 묻는다.
- **샌드박스도 끝까지 가려면 카드 앱 인증이 필요하다.** 인증할 수 없는 사람(포트폴리오 리뷰어 등)이 막히지 않게, 결제창을 닫으면 "인증 없이 테스트 결제로 계속 / 결제창 다시 열기 / 결제하지 않고 중단"을 묻는다. 이렇게 낸 주문은 결제 수단에 `테스트 결제 (카드 인증 생략)`으로 남는다. 금액 불일치처럼 결제가 실패한 경우에는 이 선택지를 주지 않는다.
- **승인 순간의 조건을 고정한다.** 결제창에 있는 동안 시세가 바뀌어도 결제 금액과 주문 묶음은 승인한 견적 그대로다. 결제창이 열려 있는 동안에는 담은 항목을 되돌리지 않는다.
- 결제하지 않고 중단하거나 결제가 실패하면 주문하지 않고 장바구니는 그대로 둔다.
- 테스트 키가 없으면(`GET /api/pay/prepare`가 503) 팝업을 열지 않고 지금까지처럼 시뮬레이션으로 결제한다. 사용성 테스트 모드도 시뮬레이션으로 결제한다.
- 아직 시뮬레이션인 곳: 장바구니에서 사람이 직접 결제하는 경로, 가격 대기(R10)의 미리 승인 결제. R10은 사람이 없을 때 결제하므로 토스 자동결제(빌링) 계약이 필요하다.

## 로그인: 결제할 때와 미리 승인할 때만

둘러보기와 에이전트에게 맡기기는 로그인 없이 된다. 구글 로그인은 두 곳에서만 묻는다.

- **결제할 때**(에이전트의 결제 승인, 장바구니에서 직접 결제): 로그인 창을 띄우고, 로그인하면 "결제 계속"을 한 번 더 누른다. 결제창은 사람의 클릭 안에서 열어야 브라우저가 막지 않아서다. 누가 결제를 승인했는지 남긴다(R1).
- **가격 대기를 미리 승인할 때:** 자리를 비운 동안 결제를 맡기려면 누가 맡겼는지 남아야 한다(R10).
- 상단 메뉴에도 로그인·로그아웃이 있다. 카카오는 비즈 앱 전환(이메일 권한)이 필요해 뺐다.

- Supabase Auth(PKCE). 로그인 창은 팝업(`auth.html`)에서 열어 Nod 화면의 장바구니·가격 대기 설정이 그대로 남는다.
- 사전 승인 조건은 `mandates` 테이블에 본인 계정으로 남는다(`supabase/002_mandates.sql`, RLS로 본인 행만). 사면 `used`와 주문번호, 기한이 끝나거나 그만두면 `ended`로 닫는다. 기록하지 못하면 대기를 시작하지 않는다.
- 사용성 테스트 모드와 Supabase 설정이 없는 환경에서는 로그인을 묻지 않는다.
- 프로젝트 주소와 anon 키는 브라우저 공개용이라 `src/auth/auth.ts`에 기본값으로 둔다(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 있으면 그것을 쓴다). service_role 키는 서버 환경변수에만 둔다. 공급자 설정은 Supabase → Authentication → Sign In / Providers, 돌아올 주소는 Authentication → URL Configuration에 `…/auth.html`을 넣는다.

## 에이전트 교체 지점

UI는 `AgentEvent`(`understood`, `plan`, `tool_call`, `confidence`, `needs_input`, `payment_gate`, `result`, `undo`)만 본다.
`RuleAgent`는 `AgentAdapter`의 구현체이며, 같은 인터페이스를 구현하는 LLM 에이전트로 바꿔도 UI는 수정하지 않는다.
LLM 에이전트는 store의 검색·담기 기능을 tool로 노출하고, 결과를 위 이벤트로 변환하는 어댑터만 만들면 된다.

## 한계

- 키가 없을 때의 요청 해석은 규칙 기반이라 카테고리·색상·소재·계절·스타일·가격만 인식한다. 그 밖의 표현은 해석하지 못했다고 알리고 묻는다. Claude 해석도 같은 어휘 안으로만 바꾼다(쇼핑몰에 없는 조건은 `unknown`으로 남아 질문이 된다).
- 상품 상세 페이지는 없다. 사진은 흰 배경 단독 제품컷(`public/products/`, 모델 없이 같은 조명·구도)이다. 원본 격자 이미지를 자른 파일이 칸이 어긋나 있어, 다시 이어 붙이고 찢긴 부분은 반대편을 좌우 반전해 메웠다. 그래서 일부 소매에 옅은 이음 자국이 남아 있다. 실존 브랜드 표시가 보이는 신발 3장은 쓰지 않았고, 가방 두 개(b1, b5)만 Unsplash 사진이다.
- 모든 상품·브랜드·판매처·가격·재고·별점·리뷰 수는 가상이다. 별점·리뷰 수는 상품 id에서 고정 난수로 만든 값이다.
- 배송 이력은 실제 배송사 연동이 아니라 출고·도착 예정 시각으로 계산한 값이고, 화면 속도는 압축되어 있다.

## 검사 게이트

`npm run check`가 통과해야 머지한다.
`check:rules`는 승인 설계 규칙 중 테스트가 하나도 없는 규칙이 있으면 실패한다.
`check:tokens`는 `src/styles/tokens.css` 밖에서 색상 리터럴을 쓰면 실패한다 (AI가 만든 UI 코드의 토큰 이탈 방지).

## Credits

All products, brands and prices are fictional mock data. Product photos are garment-only shots on a white background (`public/products/`); the two bags b1 and b5 use [Unsplash](https://unsplash.com) photos (free license). Photos showing real-brand marks were left out.

Photographers: steph washi, Lisa Anna, Emre ÇOBAN, Valentina Schick, nkosie MAPHUMULO, Bulbul Ahmed, Alexander Mass, Tobias Tullius, Caio Coelho, philippe wehrli, Robert Richman, Yucel M, The DK Photography, Nikolai Chernichenko, Ervan M Wirawan, Davide Zacchello, Nelibar Shoes, Amirreza Tavassoli, Kateryna Hliznitsova, Sama Hosseini, Shelter, Vooglam Eyewear, Angelina Litvin, tian dayong, farhad chaudhary, TuanAnh Blue, saeed karimi, engin akyurt, Laura Chouette, Brando Makes Branding, Luis Quintero, Filipp Romanovski, Lea Øchel, SJ, Jia Ye, Husien Bisky, Noah Smith, Adrian Maximiliano Arellano, Zac Wolff, Debby Hudson, lilartsy, Mediamodifier, Federico Faccipieri, mockupbee, Md Salman, Or Hakim, Sincerely Media, Fauzan Fathullah, Maryam Nemati, K8, personalgraphic.com, Yang Deng, Benjamin R., Liam Davids.

Visual direction: fashion editorial, black and white. Sans-serif only (Pretendard). Buttons and emphasis are ink (`#0A0A0A`, white on dark surfaces), corners are near-square, and the agent panel is a dark block. Lime `#C8F03C` is the single accent and has one meaning, "a person decides here": the logo dot, your-turn cards and the on state of the design-notes switch. Lime is never used as text on white.
