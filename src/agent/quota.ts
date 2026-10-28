// 서버 함수(api/parse.ts)가 Node ESM으로 직접 불러오므로 의존성 없이 쓴다

/**
 * Claude 해석 호출 제한. 공개 URL이라 누구나 /api/parse를 부를 수 있어서, 비용이 나가기 전에 횟수부터 센다.
 * 서버리스 함수는 메모리가 이어지지 않으므로 횟수는 DB(Supabase)에 둔다.
 * 셀 수 없으면(DB 장애·설정 없음) 막는다. 막힌 요청은 클라이언트가 규칙 파서로 해석하므로 쇼핑은 멈추지 않는다.
 */

export interface QuotaLimits {
  /** 한 사람(IP 해시)이 한 시간에 부를 수 있는 횟수 */
  perClientHour: number;
  /** 모든 사람을 합쳐 하루에 부를 수 있는 횟수 */
  perDay: number;
}

export const DEFAULT_LIMITS: QuotaLimits = { perClientHour: 10, perDay: 200 };

export type QuotaResult = 'ok' | 'limited' | 'unavailable';

/** key의 이번 구간 횟수를 하나 올리고, 한도 안이면 true */
export type Hit = (key: string, limit: number, windowSeconds: number) => Promise<boolean>;

const positive = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : d;
};

export function limitsFrom(env: Record<string, string | undefined>): QuotaLimits {
  return {
    perClientHour: positive(env.LLM_LIMIT_PER_HOUR, DEFAULT_LIMITS.perClientHour),
    perDay: positive(env.LLM_LIMIT_PER_DAY, DEFAULT_LIMITS.perDay),
  };
}

/** 개인 한도를 먼저 보고, 넘었으면 전체 한도는 세지 않는다 */
export async function checkQuota(hit: Hit, client: string, limits: QuotaLimits): Promise<QuotaResult> {
  try {
    if (!(await hit(`client:${client}`, limits.perClientHour, 3600))) return 'limited';
    if (!(await hit('all', limits.perDay, 86400))) return 'limited';
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

/** Supabase의 hit_quota 함수(supabase/001_llm_quota.sql)를 서버 키로 부른다 */
export function supabaseHit(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch): Hit {
  return async (key, limit, windowSeconds) => {
    const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/rpc/hit_quota`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
    });
    if (!res.ok) throw new Error(`quota ${res.status}`);
    return (await res.json()) === true;
  };
}
