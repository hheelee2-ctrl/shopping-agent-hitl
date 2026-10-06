export type Lang = 'ko' | 'en';
export type L = Record<Lang, string>;

export type Tool = 'search' | 'compare' | 'cart_add' | 'pay';
export type Level = 'high' | 'medium' | 'low';
export type Dial = 'always' | 'cart-only' | 'auto';

export interface PlanStep {
  id: string;
  tool: Tool;
  label: L;
}

export type ToolStatus = 'running' | 'awaiting-approval' | 'done' | 'failed';

/** 에이전트 ↔ UI 경계. UI는 이 이벤트만 구독한다. */
export type AgentEvent =
  | { type: 'understood'; chips: { label: L; value: L }[]; unknown: string[] }
  | { type: 'plan'; steps: PlanStep[]; requiresApproval: boolean }
  | {
      type: 'tool_call';
      id: string;
      tool: Tool;
      label: L;
      status: ToolStatus;
      note?: L;
      itemIds?: string[];
      undoable?: boolean;
      /** 담기 단계에서 고른 판매처 조건 */
      offer?: { sellerId: string; size: string; price: number; shipping: number; arriveAt: number };
    }
  | { type: 'confidence'; itemId: string; level: Level; reason?: L }
  | {
      type: 'needs_input';
      id: string;
      question: L;
      options: { id: string; label: L }[];
    }
  | {
      type: 'payment_gate';
      itemIds: string[];
      total: number;
      limit: number;
      exceeded: boolean;
    }
  | { type: 'result'; status: 'done' | 'failed' | 'cancelled'; summary: L }
  | { type: 'undo'; targetId: string; status: 'done' | 'blocked'; reason?: L };

export type SizeProfile = Partial<Record<'top' | 'shoe' | 'bottom', string>>;

export interface RunOptions {
  /** 사용자가 입력한 자연어 요청 */
  request: string;
  dial: Dial;
  /** 결제 금액 한도(원). Dial과 무관하게 초과 시 Escalation. */
  limit: number;
  /** 내 사이즈. 없는 체계는 담기 전에 묻는다. */
  sizes?: SizeProfile;
}

/** 규칙 기반 에이전트와 (향후) LLM 에이전트가 같은 인터페이스를 구현한다. */
export interface AgentAdapter {
  start(opts: RunOptions, onEvent: (e: AgentEvent) => void): void;
  approve(): void;
  reject(): void;
  answer(optionId: string): void;
  undo(targetId: string): void;
  stop(): void;
}
