import type { L } from '../engine/types';
import type { CartLine, Product } from '../store/types';
import { initialState, reduce } from './console';
import type { Action, ConsoleState } from './console';

/**
 * 감사 타임라인. 에이전트 이벤트와 사람의 조작을 프레임으로 쌓고,
 * 임의 시점의 화면 상태를 "이벤트 로그를 reducer로 접어서" 복원한다 (순서 무관, 결정적).
 * 되감기는 읽기 전용 — 실제 store는 건드리지 않는다.
 */
export interface Frame {
  /** performance.now() 기준 절대 시각(ms) */
  at: number;
  label: L;
  actor: 'agent' | 'user' | 'system';
  /** 이 프레임에서 console reducer에 적용된 액션들 (confidence 등은 직전 프레임에 합쳐진다) */
  actions: Action[];
  cart: CartLine[];
  products: Record<string, Product>;
  orders: number;
}

export interface View {
  console: ConsoleState;
  cart: CartLine[];
  products: Record<string, Product>;
  orders: number;
}

export interface Snapshot {
  cart: CartLine[];
  products: Record<string, Product>;
  orders: number;
}

export const baseline = (at: number, snap: Snapshot): Frame => ({
  at, label: { ko: '초기 상태', en: 'Initial state' }, actor: 'system', actions: [], ...snap,
});

export function viewAt(frames: Frame[], index: number): View {
  const i = Math.min(Math.max(index, 0), frames.length - 1);
  let c = initialState;
  for (let k = 0; k <= i; k++) for (const a of frames[k].actions) c = reduce(c, a);
  const f = frames[i];
  return { console: c, cart: f.cart, products: f.products, orders: f.orders };
}

/** 같은 시점에 여러 개씩 오는 보조 이벤트는 새 프레임을 만들지 않고 직전 프레임에 합친다. */
const isAux = (a: Action | null) => a?.type === 'event' && a.event.type === 'confidence';

export function describe(a: Action): L {
  switch (a.type) {
    case 'start': return { ko: '요청 시작', en: 'Request started' };
    case 'reset': return { ko: '초기화', en: 'Reset' };
    case 'user_ack': return { ko: '사람이 응답', en: 'Human responded' };
    case 'event': {
      const e = a.event;
      switch (e.type) {
        case 'understood': return { ko: '요청 해석', en: 'Request understood' };
        case 'plan': return { ko: '계획 수립', en: 'Plan drafted' };
        case 'tool_call': return e.label;
        case 'confidence': return { ko: '확신도 계산', en: 'Confidence scored' };
        case 'needs_input': return { ko: '사람에게 질문', en: 'Asked the human' };
        case 'payment_gate': return { ko: '결제 직전 승인 요청', en: 'Payment approval requested' };
        case 'result': return e.summary;
        case 'undo': return e.status === 'done' ? { ko: '되돌리기', en: 'Undone' } : { ko: '되돌리기 차단', en: 'Undo blocked' };
      }
    }
  }
}

export function appendFrame(
  frames: Frame[],
  input: { at: number; action: Action | null; label?: L; actor: Frame['actor'] } & Snapshot,
): Frame[] {
  const { at, action, actor, label, ...snap } = input;
  if (action?.type === 'reset') return [baseline(at, snap)];
  const last = frames[frames.length - 1];
  if (action && isAux(action) && last) {
    return [...frames.slice(0, -1), { ...last, actions: [...last.actions, action], ...snap }];
  }
  const l = label ?? (action ? describe(action) : { ko: '변경', en: 'Change' });
  return [...frames, { at, label: l, actor, actions: action ? [action] : [], ...snap }];
}
