import { describe, expect, it, vi } from 'vitest';
import { checkQuota, DEFAULT_LIMITS, limitsFrom, supabaseHit, type Hit } from './quota';

/** 메모리에서 구간 없이 세는 가짜 hit */
const memory = () => {
  const n = new Map<string, number>();
  const hit: Hit = async (key, limit) => {
    n.set(key, (n.get(key) ?? 0) + 1);
    return n.get(key)! <= limit;
  };
  return { hit, n };
};

describe('호출 제한: Claude를 부르기 전에 횟수부터 센다', () => {
  it('한 사람의 시간당 한도를 넘으면 막는다', async () => {
    const { hit } = memory();
    const limits = { perClientHour: 2, perDay: 100 };
    expect(await checkQuota(hit, 'a', limits)).toBe('ok');
    expect(await checkQuota(hit, 'a', limits)).toBe('ok');
    expect(await checkQuota(hit, 'a', limits)).toBe('limited');
    expect(await checkQuota(hit, 'b', limits)).toBe('ok');
  });
  it('전체 하루 한도를 넘으면 누구든 막는다', async () => {
    const { hit } = memory();
    const limits = { perClientHour: 10, perDay: 2 };
    await checkQuota(hit, 'a', limits);
    await checkQuota(hit, 'b', limits);
    expect(await checkQuota(hit, 'c', limits)).toBe('limited');
  });
  it('개인 한도에 걸린 요청은 전체 횟수를 쓰지 않는다', async () => {
    const { hit, n } = memory();
    const limits = { perClientHour: 1, perDay: 100 };
    await checkQuota(hit, 'a', limits);
    await checkQuota(hit, 'a', limits);
    expect(n.get('all')).toBe(1);
  });
  it('셀 수 없으면(DB 오류) 부르지 않는다', async () => {
    const broken: Hit = async () => { throw new Error('down'); };
    expect(await checkQuota(broken, 'a', DEFAULT_LIMITS)).toBe('unavailable');
  });
  it('환경 변수로 한도를 바꾸고, 이상한 값은 기본값으로', () => {
    expect(limitsFrom({ LLM_LIMIT_PER_HOUR: '5', LLM_LIMIT_PER_DAY: '50' })).toEqual({ perClientHour: 5, perDay: 50 });
    expect(limitsFrom({ LLM_LIMIT_PER_HOUR: '-1', LLM_LIMIT_PER_DAY: 'x' })).toEqual(DEFAULT_LIMITS);
  });
  it('Supabase 함수를 서버 키로 부르고, 실패 응답은 오류로 본다', async () => {
    const f = vi.fn(async () => new Response('true', { status: 200 }));
    const hit = supabaseHit('https://x.supabase.co/', 'service', f as unknown as typeof fetch);
    expect(await hit('all', 200, 86400)).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/hit_quota');
    expect(JSON.parse(init.body as string)).toEqual({ p_key: 'all', p_limit: 200, p_window_seconds: 86400 });
    const bad = supabaseHit('https://x.supabase.co', 'k', (async () => new Response('', { status: 401 })) as unknown as typeof fetch);
    await expect(bad('all', 1, 1)).rejects.toThrow();
  });
});
