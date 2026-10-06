import type { AgentEvent, L, Level, PlanStep, Tool, ToolStatus } from '../engine/types';

export type Phase =
  | 'idle'
  | 'planning'
  | 'awaiting-approval'
  | 'executing'
  | 'needs-input'
  | 'payment-gate'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'undone';

export interface LogEntry {
  id: string;
  tool: Tool;
  label: L;
  status: ToolStatus;
  note?: L;
  itemIds?: string[];
  undoable?: boolean;
  offer?: { sellerId: string; size: string; price: number; shipping: number; arriveAt: number };
  undone?: boolean;
  undoBlocked?: L;
}

/** 패널에 남는 대화 기록. 결정 카드가 사라져도 무엇을 묻고 어떻게 답했는지 남긴다. */
export type FeedItem =
  | { k: 'found'; id: string; ids: string[] }
  | { k: 'added'; id: string; pid: string; offer?: LogEntry['offer'] }
  | { k: 'decided'; id: string; kind: 'plan' | 'cart' | 'question' | 'pay'; ok: boolean; q?: L; a?: L; pid?: string; total?: number };

export type Choice = 'approve' | 'reject' | { option: string };

export interface ConsoleState {
  phase: Phase;
  understood: Extract<AgentEvent, { type: 'understood' }> | null;
  plan: { steps: PlanStep[]; requiresApproval: boolean } | null;
  log: LogEntry[];
  candidates: string[];
  confidence: Record<string, { level: Level; reason?: L }>;
  question: Extract<AgentEvent, { type: 'needs_input' }> | null;
  payment: Extract<AgentEvent, { type: 'payment_gate' }> | null;
  result: Extract<AgentEvent, { type: 'result' }> | null;
  feed: FeedItem[];
}

export const initialState: ConsoleState = {
  phase: 'idle',
  understood: null,
  plan: null,
  log: [],
  candidates: [],
  confidence: {},
  question: null,
  payment: null,
  result: null,
  feed: [],
};

export type Action =
  | { type: 'start' }
  | { type: 'reset' }
  | { type: 'user_ack'; choice?: Choice } // 승인·답변 직후, 엔진 응답 전
  | { type: 'event'; event: AgentEvent };

export function reduce(state: ConsoleState, action: Action): ConsoleState {
  switch (action.type) {
    case 'reset':
      return initialState;
    case 'start':
      return { ...initialState, phase: 'planning' };
    case 'user_ack': {
      const d = decided(state, action.choice);
      return { ...state, phase: 'executing', question: null, feed: d ? [...state.feed, d] : state.feed };
    }
    case 'event':
      return applyEvent(state, action.event);
  }
}

function decided(s: ConsoleState, c: Choice | undefined): FeedItem | null {
  if (!c) return null;
  const id = `d-${s.feed.length}`;
  if (s.phase === 'needs-input' && s.question && typeof c === 'object') {
    const o = s.question.options.find((x) => x.id === c.option);
    return { k: 'decided', id, kind: 'question', ok: true, q: s.question.question, a: o?.label };
  }
  if (typeof c === 'object') return null;
  const ok = c === 'approve';
  if (s.phase === 'payment-gate') return { k: 'decided', id, kind: 'pay', ok, total: s.payment?.total };
  const cart = s.log.find((l) => l.tool === 'cart_add' && l.status === 'awaiting-approval');
  if (cart) return { k: 'decided', id, kind: 'cart', ok, pid: cart.itemIds?.[0] };
  if (s.phase === 'awaiting-approval') return { k: 'decided', id, kind: 'plan', ok };
  return null;
}

function applyEvent(s: ConsoleState, e: AgentEvent): ConsoleState {
  switch (e.type) {
    case 'understood':
      return { ...s, understood: e };
    case 'plan':
      return { ...s, plan: { steps: e.steps, requiresApproval: e.requiresApproval }, phase: e.requiresApproval ? 'awaiting-approval' : 'executing' };
    case 'tool_call': {
      const entry: LogEntry = {
        id: e.id, tool: e.tool, label: e.label, status: e.status, note: e.note,
        itemIds: e.itemIds, undoable: e.undoable, offer: e.offer,
      };
      const i = s.log.findIndex((l) => l.id === e.id);
      const log = i === -1 ? [...s.log, entry] : s.log.map((l, j) => (j === i ? { ...l, ...entry } : l));
      const candidates = e.tool === 'search' && e.status === 'done' && e.itemIds ? e.itemIds : s.candidates;
      const phase: Phase = e.status === 'awaiting-approval' ? 'awaiting-approval' : s.phase === 'planning' || s.phase === 'awaiting-approval' ? 'executing' : s.phase;
      let feed = s.feed;
      if (e.tool === 'search' && e.status === 'done' && e.itemIds?.length && !feed.some((f) => f.id === e.id)) feed = [...feed, { k: 'found', id: e.id, ids: e.itemIds }];
      if (e.tool === 'cart_add' && e.status === 'done' && e.undoable && e.itemIds?.[0] && !feed.some((f) => f.id === e.id)) {
        const prev = s.log.find((l) => l.id === e.id);
        feed = [...feed, { k: 'added', id: e.id, pid: e.itemIds[0], offer: e.offer ?? prev?.offer }];
      }
      return { ...s, log, candidates, phase, feed };
    }
    case 'confidence':
      return { ...s, confidence: { ...s.confidence, [e.itemId]: { level: e.level, reason: e.reason } } };
    case 'needs_input':
      return { ...s, question: e, phase: 'needs-input' };
    case 'payment_gate':
      return { ...s, payment: e, phase: 'payment-gate' };
    case 'result':
      return { ...s, result: e, question: null, payment: null, phase: e.status === 'done' ? 'done' : e.status === 'failed' ? 'failed' : 'cancelled' };
    case 'undo': {
      const log = s.log.map((l) =>
        l.id === e.targetId ? (e.status === 'done' ? { ...l, undone: true } : { ...l, undoBlocked: e.reason }) : l,
      );
      const undoable = log.filter((l) => l.undoable);
      const allUndone = undoable.length > 0 && undoable.every((l) => l.undone);
      const ended = s.phase === 'done' || s.phase === 'cancelled';
      return { ...s, log, phase: ended && allUndone ? 'undone' : s.phase };
    }
  }
}
