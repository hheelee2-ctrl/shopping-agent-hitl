import type { Dial } from '../engine/types';
import { LIMIT_INPUT_MAX, LIMIT_INPUT_MIN } from './LimitSlider';

/** 저장한 자율도·결제 한도. 설정 화면은 이 값에서 시작하고, 매번 바꿀 수 있다. */
export interface Prefs { dial: Dial; limit: number }

const KEY = 'nod.prefs';
const DIALS: Dial[] = ['always', 'cart-only', 'auto'];

export function loadPrefs(): Partial<Prefs> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Prefs> | null;
    if (!raw || typeof raw !== 'object') return {};
    const out: Partial<Prefs> = {};
    if (DIALS.includes(raw.dial as Dial)) out.dial = raw.dial;
    if (typeof raw.limit === 'number' && raw.limit >= LIMIT_INPUT_MIN && raw.limit <= LIMIT_INPUT_MAX) out.limit = raw.limit;
    return out;
  } catch { return {}; }
}
export function savePrefs(p: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 저장 불가 환경은 무시 */ }
}
