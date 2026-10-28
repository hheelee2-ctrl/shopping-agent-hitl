import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { MAX_REQUEST, SCHEMA, SYSTEM, sanitize } from '../src/agent/llmParse.js';
import { checkQuota, limitsFrom, supabaseHit, type Hit } from '../src/agent/quota.js';

/**
 * POST /api/parse { request } → { by: 'llm', parsed }
 * 쇼핑 요청을 Claude로 해석해 규칙 파서와 같은 구조로 돌려준다.
 * 키가 없거나 실패하면 503/502를, 호출 한도를 넘으면 429를 돌려주고, 클라이언트는 규칙 파서로 해석한다.
 */
const env = process.env;
const client = env.ANTHROPIC_API_KEY ? new Anthropic({ timeout: 15_000, maxRetries: 1 }) : null;
// 횟수를 셀 곳이 없으면 Claude를 부르지 않는다. 로컬에서만 LLM_UNLIMITED=1로 끈다.
const hit: Hit | null = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? supabaseHit(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : env.LLM_UNLIMITED === '1' ? async () => true : null;
const limits = limitsFrom(env);

/** IP는 저장하지 않고 해시 앞부분만 센다 */
const clientOf = (req: Request) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(`${env.QUOTA_SALT ?? ''}:${ip}`).digest('hex').slice(0, 16);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(req: Request): Promise<Response> {
  if (!client) return json({ error: 'no-key' }, 503);
  if (!hit) return json({ error: 'no-quota' }, 503);

  let request = '';
  try {
    const body = (await req.json()) as { request?: unknown };
    request = typeof body.request === 'string' ? body.request.trim() : '';
  } catch {
    return json({ error: 'bad-json' }, 400);
  }
  if (!request || request.length > MAX_REQUEST) return json({ error: 'bad-request' }, 400);

  const quota = await checkQuota(hit, clientOf(req), limits);
  if (quota === 'limited') return json({ error: 'rate-limited' }, 429);
  if (quota === 'unavailable') return json({ error: 'no-quota' }, 503);

  try {
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: request }],
    });
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return json({ error: res.stop_reason }, 502);
    const text = res.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'no-text' }, 502);
    const parsed = sanitize(JSON.parse(text.text));
    if (!parsed) return json({ error: 'unusable' }, 502);
    return json({ by: 'llm', model: res.model, parsed });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate-limited' }, 503);
    if (e instanceof Anthropic.APIError) return json({ error: `api-${e.status ?? 'error'}` }, 502);
    if (e instanceof SyntaxError) return json({ error: 'bad-output' }, 502);
    return json({ error: 'failed' }, 502);
  }
}
