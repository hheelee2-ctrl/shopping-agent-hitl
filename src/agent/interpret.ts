import { parseMulti, type Parsed } from '../store/parser';
import { MAX_REQUEST, sanitize } from './llmParse';

/** 요청을 누가 해석했는지. 화면에 그대로 보여준다. */
export type InterpretedBy = 'llm' | 'rule';
export interface Interpreted { parsed: Parsed; by: InterpretedBy }
export type Interpreter = (request: string) => Promise<Interpreted>;

/** 규칙 파서만 쓴다. 테스트와 키가 없는 환경의 기본값. */
export const ruleInterpreter: Interpreter = async (request) => ({ parsed: parseMulti(request), by: 'rule' });

/**
 * 서버(/api/parse)의 Claude 해석을 먼저 시도한다. 키가 없거나(503), 실패하거나, 시간이 지나면 규칙 파서로 해석한다.
 * 서버가 보낸 값도 sanitize로 다시 거른다.
 */
export function llmInterpreter(timeoutMs = 9000): Interpreter {
  let off = false; // 키가 없다고 한 번 들으면 이 세션에서는 더 묻지 않는다
  return async (request) => {
    if (off || request.length > MAX_REQUEST) return ruleInterpreter(request);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request }),
        signal: ac.signal,
      });
      if (res.status === 503 || res.status === 404) off = true;
      if (!res.ok) return ruleInterpreter(request);
      const body = (await res.json()) as { parsed?: unknown };
      const parsed = sanitize(body.parsed);
      return parsed ? { parsed, by: 'llm' } : ruleInterpreter(request);
    } catch {
      return ruleInterpreter(request);
    } finally {
      clearTimeout(timer);
    }
  };
}
