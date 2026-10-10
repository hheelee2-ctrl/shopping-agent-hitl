import type { L } from './engine/types';
import counts from './rules.counts.json';

/**
 * 승인 설계 규칙. Nod가 '사람이 어디서 개입하는가'에 대해 지키는 약속이다.
 * 각 규칙은 테스트 이름의 [R1] 같은 태그로 테스트와 묶이고, scripts/rules.mjs가 규칙마다 테스트 수를 센다.
 * 테스트가 하나도 없는 규칙이 있으면 검사(npm run check)가 실패한다.
 * 화면에서는 리뷰 모드(설계 보기)와 랜딩 플레이북이 이 목록을 그대로 보여준다.
 */
export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9';

export interface Rule {
  id: RuleId;
  name: L;
  /** 이 규칙이 없으면 생기는 일 */
  problem: L;
  /** 지키는 방법 */
  rule: L;
  /** 화면 어디에 있나 */
  where: L;
}

export const RULES: Rule[] = [
  {
    id: 'R1',
    name: { ko: '결제는 사람만 한다', en: 'Only a person pays' },
    problem: { ko: '자율도를 올리면 결제까지 넘어가 되돌릴 수 없는 일이 생긴다.', en: 'Raise autonomy and payment goes too, and that cannot be undone.' },
    rule: { ko: '어느 자율도에서도 결제 직전에는 멈추고, 사람이 승인해야 주문이 생긴다.', en: 'At every autonomy level the agent stops before payment; orders exist only after a person approves.' },
    where: { ko: '결제 승인 카드', en: 'Payment approval card' },
  },
  {
    id: 'R2',
    name: { ko: '승인 강도는 되돌릴 수 있느냐로 정한다', en: 'Approval weight follows reversibility' },
    problem: { ko: '"매번 확인"은 피곤하고 "알아서"는 위험하다.', en: '"Always ask" is tiring and "do it all" is risky.' },
    rule: { ko: '자율도 3단계(매번 확인 · 담기만 확인 · 알아서)는 계획과 담기의 승인만 바꾼다. 담기는 되돌릴 수 있어 맡길 수 있다.', en: 'The three levels only change plan and add approvals. Adding is reversible, so it can be delegated.' },
    where: { ko: '자율도 설정, 계획 카드, 담기 카드', en: 'Autonomy setting, plan card, add card' },
  },
  {
    id: 'R3',
    name: { ko: '한도는 자율도와 따로 움직인다', en: 'The limit works apart from autonomy' },
    problem: { ko: '"알아서"로 맡기면 큰 금액도 그대로 진행된다.', en: 'With "do it all", large totals slip through.' },
    rule: { ko: '합계가 한도를 넘으면 자율도와 상관없이 멈추고, 넘겨서 진행할지 사람이 정한다.', en: 'Over the limit, the agent stops at any level and the person decides whether to go over.' },
    where: { ko: '결제 카드의 한도 막대, 예산 초과 질문', en: 'Limit bar on the payment card, over-budget question' },
  },
  {
    id: 'R4',
    name: { ko: '낡은 승인은 쓰지 않는다', en: 'No stale approvals' },
    problem: { ko: '승인한 뒤 가격이나 재고가 바뀌면 그 승인은 다른 조건에 대한 동의가 된다.', en: 'If price or stock changes after approval, the approval covers terms the person never saw.' },
    rule: { ko: '담기 직전과 결제 직전에 다시 확인하고, 바뀌었으면 실행하지 않고 바뀐 조건으로 다시 묻는다.', en: 'Check again right before adding and paying; if anything changed, do nothing and ask with the new terms.' },
    where: { ko: '담기 카드의 가격 경고, 결제 직전 재확인', en: 'Price warning on the add card, re-check before payment' },
  },
  {
    id: 'R5',
    name: { ko: '모호하면 멈추고 묻는다', en: 'When unsure, stop and ask' },
    problem: { ko: '대본으로 정한 질문은 실제 상황이 바뀌어도 그대로다.', en: 'Scripted questions ignore what actually changed.' },
    rule: { ko: '해석 못 한 표현, 종류 불명, 후보 점수 근접, 결과 없음, 사이즈 불명·품절, 중복 담기에서만 계산으로 멈추고 선택지를 준다.', en: 'Stop with options only on computed triggers: unknown words, unclear type, close scores, no result, size, duplicates.' },
    where: { ko: '질문 카드', en: 'Question cards' },
  },
  {
    id: 'R6',
    name: { ko: '무엇을 할지, 얼마나 확신하는지 보여준다', en: 'Show intent and confidence' },
    problem: { ko: '결과만 보면 에이전트가 무엇을 알아들었는지, 왜 골랐는지 알 수 없다.', en: 'Results alone hide what the agent understood and why it chose.' },
    rule: { ko: '해석을 한 문장으로 되말하고, 후보마다 확신도와 근거 한 줄을 붙인다. 확신도는 요청 일치도로만 정한다.', en: 'Restate the request in a sentence; give every candidate a confidence level and a one-line reason, based on the request alone.' },
    where: { ko: '되말하기, 해석 칩, 후보 확신도', en: 'Restatement, chips, candidate confidence' },
  },
  {
    id: 'R7',
    name: { ko: '한 일은 남기고 되돌릴 수 있다', en: 'Every action is logged and undoable' },
    problem: { ko: '에이전트가 무엇을 했는지 모르면 맡길 수 없다.', en: 'You cannot delegate what you cannot see afterwards.' },
    rule: { ko: '모든 행동을 기록하고, 결제 전 행동은 되돌릴 수 있다. 타임라인으로 그 시점을 다시 본다. 결제 후 되돌리기는 막는다.', en: 'Log every action; undo anything before payment; replay any moment. Undo after payment is blocked.' },
    where: { ko: '한 일, 타임라인, 되돌리기', en: 'Activity, timeline, undo' },
  },
  {
    id: 'R8',
    name: { ko: '판매처를 고른 이유를 남긴다', en: 'Explain the seller choice' },
    problem: { ko: '표시가 최저가 배송비까지 합치면 최저가 아닐 수 있다.', en: 'The lowest listed price is not always the lowest total.' },
    rule: { ko: '배송비 포함 총액과 도착 마감으로 고르고 이유를 남긴다. 해외직구만 남거나 판매처가 3곳 넘게 갈리면 묻는다.', en: 'Choose by total with shipping and deadline, and say why. Ask when only overseas is left or orders split across 3+ sellers.' },
    where: { ko: '판매처 비교 막대, "왜 여기서?"', en: 'Seller bars, "Why here?"' },
  },
  {
    id: 'R9',
    name: { ko: '요청이 취향보다 먼저다', en: 'The request beats the profile' },
    problem: { ko: '저장한 취향이 이번 요청을 덮으면 말한 것과 다른 걸 고른다.', en: 'A saved profile that overrides the request picks what you did not ask for.' },
    rule: { ko: '내 스타일은 순위에만 조금 더한다. 요청에 스타일·색·소재가 있으면 그 부분은 끄고, 피하는 소재를 뺐다면 기록한다.', en: 'My style only nudges ranking. Request styles, colors and materials switch it off; excluded materials are logged.' },
    where: { ko: '"내 스타일" 칩, 후보 근거', en: '"My style" chip, candidate reasons' },
  },
];

/** 규칙마다 묶인 테스트 수 (scripts/rules.mjs가 만든다) */
export const RULE_TESTS = counts as Record<RuleId, number>;
export const ruleOf = (id: RuleId) => RULES.find((r) => r.id === id)!;
