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
  undone?: boolean;
  undoBlocked?: L;
}

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
};

export type Action =
  | { type: 'start' }
  | { type: 'reset' }
  | { type: 'user_ack' } // 승인·답변 직후, 엔진 응답 전
  | { type: 'event'; event: AgentEvent };

export function reduce(state: ConsoleState, action: Action): ConsoleState {
  switch (action.type) {
    case 'reset':
      return initialState;
    case 'start':
      return { ...initialState, phase: 'planning' };
    case 'user_ack':
      return { ...state, phase: 'executing', question: null };
    case 'event':
      return applyEvent(state, action.event);
  }
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
        itemIds: e.itemIds, undoable: e.undoable,
      };
      const i = s.log.findIndex((l) => l.id === e.id);
      const log = i === -1 ? [...s.log, entry] : s.log.map((l, j) => (j === i ? { ...l, ...entry } : l));
      const candidates = e.tool === 'search' && e.status === 'done' && e.itemIds ? e.itemIds : s.candidates;
      const phase: Phase = e.status === 'awaiting-approval' ? 'awaiting-approval' : s.phase === 'planning' || s.phase === 'awaiting-approval' ? 'executing' : s.phase;
      return { ...s, log, candidates, phase };
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
