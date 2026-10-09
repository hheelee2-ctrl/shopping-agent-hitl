import { afterEach, describe, expect, it, vi } from 'vitest';
import { llmInterpreter } from './interpret';
import { sanitize } from './llmParse';

const item = (o: Record<string, unknown> = {}) => ({
  category: null, categories: [], colors: [], materials: [], seasons: [], styles: [],
  maxPrice: null, minPrice: null, size: null, deliverBy: null, unknown: [], ...o,
});

describe('sanitize: LLM 출력은 어휘 안의 값만 남긴다', () => {
  it('정상 출력은 규칙 파서와 같은 구조가 된다', () => {
    const p = sanitize({ items: [item({ category: 'coat', colors: ['black'], materials: ['wool'], maxPrice: 200000 })], budget: null });
    expect(p).toEqual({ items: [expect.objectContaining({ category: 'coat', colors: ['black'], materials: ['wool'], maxPrice: 200000, unknown: [] })], budget: undefined });
  });
  it('어휘 밖의 값, 음수 가격, 없는 사이즈는 버린다', () => {
    const p = sanitize({ items: [item({ category: 'hat', colors: ['black', 'pink'], maxPrice: -5, size: '999' })], budget: null })!;
    expect(p.items[0]).toMatchObject({ category: undefined, colors: ['black'], maxPrice: undefined, size: undefined });
  });
  it('묶음 종류는 categories와 표시 이름으로, 하나뿐이면 category로', () => {
    expect(sanitize({ items: [item({ categories: ['coat', 'jacket'] })], budget: null })!.items[0]).toMatchObject({ categories: ['coat', 'jacket'], group: { ko: '코트·자켓' } });
    expect(sanitize({ items: [item({ categories: ['bag'] })], budget: null })!.items[0]).toMatchObject({ category: 'bag' });
  });
  it('합계 예산은 항목이 여럿일 때만 남고, 항목은 3개까지', () => {
    const many = sanitize({ items: [item({ category: 'coat' }), item({ category: 'loafers' }), item({ category: 'bag' }), item({ category: 'shirt' })], budget: 350000 })!;
    expect(many.items).toHaveLength(3);
    expect(many.budget).toBe(350000);
    expect(sanitize({ items: [item({ category: 'coat' })], budget: 350000 })!.budget).toBeUndefined();
  });
  it('쓸 수 없는 출력은 null', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize({ items: [] })).toBeNull();
    expect(sanitize('coat')).toBeNull();
  });
});

describe('llmInterpreter: 서버가 안 되면 규칙 파서로', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('서버가 해석하면 그 결과를 쓰고 by=llm', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ parsed: { items: [item({ category: 'loafers', colors: ['brown'] })], budget: null } }), { status: 200 })));
    const r = await llmInterpreter()('갈색 구두');
    expect(r.by).toBe('llm');
    expect(r.parsed.items[0]).toMatchObject({ category: 'loafers', colors: ['brown'] });
  });
  it('키가 없으면(503) 규칙 파서로 해석하고, 그 뒤로는 서버에 묻지 않는다', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 503 }));
    vi.stubGlobal('fetch', f);
    const interp = llmInterpreter();
    const a = await interp('검정 울 코트 20만원 이하');
    expect(a.by).toBe('rule');
    expect(a.parsed.items[0]).toMatchObject({ category: 'coat', maxPrice: 200000 });
    await interp('가방');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('네트워크 오류나 이상한 응답도 규칙 파서로', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect((await llmInterpreter()('가방')).by).toBe('rule');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ parsed: { nope: 1 } }), { status: 200 })));
    expect((await llmInterpreter()('가방')).by).toBe('rule');
  });
});
