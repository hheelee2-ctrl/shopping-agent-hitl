import type { Dial, L } from '../engine/types';
import type { Frame } from '../state/timeline';

/**
 * 사용성 테스트 모드 (#/app?study=P01).
 * 참가자 한 명이 과제 3개를 자율도를 바꿔 가며 수행한다. 자율도 순서는 참가자 번호로 돌려(라틴 방격) 순서 효과를 나눈다.
 * 결제 승인 카드가 뜨면 담긴 상품 하나의 가격을 10% 올려, 결제 직전 재확인(R4)에 사람이 어떻게 반응하는지 본다.
 * 지표는 감사 타임라인(frames)에서 계산하므로 화면 코드와 따로 움직이지 않는다.
 */
export interface Task {
  id: string;
  brief: L;
}

export const TASKS: Task[] = [
  { id: 'T1', brief: { ko: '출근할 때 입을 검정 울 코트를 20만원 이하로 사 보세요.', en: 'Buy a black wool coat for work, under ₩200,000.' } },
  { id: 'T2', brief: { ko: '주말에 신을 화이트 스니커즈를 15만원 이하로 사 보세요.', en: 'Buy white sneakers for weekends, under ₩150,000.' } },
  { id: 'T3', brief: { ko: '매일 들고 다닐 가방을 10만원 이하로 사 보세요.', en: 'Buy an everyday bag, under ₩100,000.' } },
];

const SQUARE: Dial[][] = [
  ['always', 'cart-only', 'auto'],
  ['cart-only', 'auto', 'always'],
  ['auto', 'always', 'cart-only'],
];

/** 참가자 번호(P01 → 1)로 자율도 순서를 고른다. 번호가 없으면 첫 줄. */
export function dialOrder(pid: string): Dial[] {
  const n = Number(pid.replace(/\D/g, '')) || 1;
  return SQUARE[(n - 1) % SQUARE.length];
}

/** 가격을 올리는 비율. 천 원 단위로 반올림한다. */
export const BUMP = 0.1;
export const bumped = (price: number) => Math.round((price * (1 + BUMP)) / 1000) * 1000;

export interface Survey {
  /** 1–7: 에이전트가 다음에 무엇을 할지 예상할 수 있었다 */
  predictable: number;
  /** 1–7: 내가 통제하고 있다고 느꼈다 */
  control: number;
  /** 1–7: 다음에도 이 방식으로 맡기겠다 */
  again: number;
  /** 가격이 바뀐 걸 알아챘나 */
  noticed: 'yes' | 'no' | 'unsure';
  memo: string;
}

export interface TaskMetrics {
  durationMs: number;
  /** 사람이 승인·거절·답변한 횟수 */
  interventions: number;
  rejects: number;
  undos: number;
  /** 에이전트가 멈추고 물은 횟수 */
  questions: number;
  /** 가격 변경 뒤 결제 직전 재확인에서 고른 것 */
  priceResponse: 'refresh' | 'stop' | 'none';
  outcome: 'done' | 'cancelled' | 'failed' | 'none';
  orders: number;
}

export interface TaskRecord extends TaskMetrics {
  task: string;
  dial: Dial;
  injected: boolean;
  survey: Survey | null;
}

export interface Session {
  pid: string;
  startedAt: string;
  records: TaskRecord[];
}

/** 과제 하나 동안 쌓인 프레임으로 지표를 계산한다 */
export function measure(frames: Frame[], ordersBefore: number): TaskMetrics {
  let interventions = 0, rejects = 0, undos = 0, questions = 0;
  let priceResponse: TaskMetrics['priceResponse'] = 'none';
  let outcome: TaskMetrics['outcome'] = 'none';
  let lastQ = '';
  for (const f of frames) {
    for (const a of f.actions) {
      if (a.type === 'user_ack') {
        interventions++;
        if (a.choice === 'reject') rejects++;
        if (typeof a.choice === 'object' && lastQ.startsWith('q-payfix')) priceResponse = a.choice.option === 'refresh' ? 'refresh' : 'stop';
      }
      if (a.type !== 'event') continue;
      const e = a.event;
      if (e.type === 'needs_input') { questions++; lastQ = e.id; }
      if (e.type === 'undo' && e.status === 'done') undos++;
      if (e.type === 'result') outcome = e.status;
    }
  }
  const first = frames[0]?.at ?? 0;
  const last = frames[frames.length - 1]?.at ?? first;
  return {
    durationMs: Math.round(last - first), interventions, rejects, undos, questions, priceResponse, outcome,
    orders: Math.max(0, (frames[frames.length - 1]?.orders ?? ordersBefore) - ordersBefore),
  };
}

const COLS: (keyof TaskRecord | 'pid' | keyof Survey)[] = [
  'pid', 'task', 'dial', 'durationMs', 'interventions', 'rejects', 'undos', 'questions', 'injected', 'priceResponse', 'outcome', 'orders',
  'predictable', 'control', 'again', 'noticed', 'memo',
];
const cell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(sessions: Session[]): string {
  const rows = sessions.flatMap((s) => s.records.map((r) => {
    const flat: Record<string, unknown> = { pid: s.pid, ...r, ...(r.survey ?? {}) };
    return COLS.map((c) => cell(flat[c])).join(',');
  }));
  return [COLS.join(','), ...rows].join('\n') + '\n';
}

const KEY = (pid: string) => `nod.study.${pid}`;
export function loadSession(pid: string): Session {
  try {
    const raw = localStorage.getItem(KEY(pid));
    if (raw) return JSON.parse(raw) as Session;
  } catch { /* 저장 불가 환경은 새로 시작 */ }
  return { pid, startedAt: new Date().toISOString(), records: [] };
}
export function saveSession(s: Session) {
  try { localStorage.setItem(KEY(s.pid), JSON.stringify(s)); } catch { /* 내보내기로 대신 남긴다 */ }
}

/** 해시에서 참가자 번호를 읽는다 (#/app?study=P01) */
export const studyId = (hash: string) => /[?&]study=([A-Za-z0-9_-]{1,12})/.exec(hash)?.[1] ?? null;
