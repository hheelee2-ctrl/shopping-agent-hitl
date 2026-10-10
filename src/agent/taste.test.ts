import { describe, expect, it } from 'vitest';
import type { AgentEvent, StyleProfile } from '../engine/types';
import { DEFAULT_PROFILE } from '../store/catalog';
import { createStore } from '../store/store';
import { cleanProfile } from '../store/taste';
import { RuleAgent } from './agent';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const profile = (p: Partial<StyleProfile>): StyleProfile => ({ moods: [], likeColors: [], avoidColors: [], avoidMaterials: [], ...p });

function run(request: string, style?: StyleProfile) {
  const store = createStore();
  const events: AgentEvent[] = [];
  const agent = new RuleAgent(store, () => Promise.resolve());
  agent.start({ request, dial: 'auto', limit: 1000000, sizes: DEFAULT_PROFILE, style }, (e) => events.push(e));
  const until = async (pred: (e: AgentEvent) => boolean) => {
    for (let i = 0; i < 300; i++) { if (events.some(pred)) return; await tick(); }
    throw new Error('timeout: ' + JSON.stringify(events.map((e) => e.type)));
  };
  const search = () => events.find((e): e is Extract<AgentEvent, { type: 'tool_call' }> => e.type === 'tool_call' && e.tool === 'search' && e.status === 'done');
  const chips = () => events.find((e): e is Extract<AgentEvent, { type: 'understood' }> => e.type === 'understood')?.chips ?? [];
  const reason = (id: string) => events.find((e): e is Extract<AgentEvent, { type: 'confidence' }> => e.type === 'confidence' && e.itemId === id)?.reason?.ko ?? '';
  return { agent, events, until, search, chips, reason };
}
const searched = (e: AgentEvent) => e.type === 'tool_call' && e.tool === 'search' && e.status === 'done';

describe('내 스타일: 필터가 아니라 가산점', () => {
  it('같은 요청이라도 무드가 맞는 상품이 앞으로 온다', async () => {
    const plain = run('셔츠');
    await plain.until(searched);
    expect(plain.search()!.itemIds![0]).toBe('sh1'); // 취향이 없으면 같은 점수 중 가장 싼 상품

    const mine = run('셔츠', profile({ moods: ['minimal'] }));
    await mine.until(searched);
    expect(mine.search()!.itemIds![0]).toBe('sh3'); // 미니멀 셔츠 중 가장 싼 상품
    expect(mine.reason('sh3')).toContain('내 스타일(미니멀) 일치');
    expect(mine.chips()).toContainEqual({ label: { ko: '내 스타일', en: 'My style' }, value: { ko: '미니멀', en: 'Minimal' } });
  });

  it('피하는 색은 감점되고, 근거에 남는다', async () => {
    const h = run('셔츠', profile({ avoidColors: ['white'] }));
    await h.until(searched);
    expect(h.search()!.itemIds![0]).not.toBe('sh1');
    expect(h.reason('sh1')).toContain('피하는 색(화이트)');
  });

  it('취향은 확신도를 올리지 않는다 (확신도는 요청 일치도로만)', async () => {
    const a = run('블랙 셔츠');
    const b = run('블랙 셔츠', profile({ moods: ['formal'], likeColors: ['black'] }));
    await a.until(searched); await b.until(searched);
    const level = (h: ReturnType<typeof run>) => h.events.filter((e) => e.type === 'confidence').map((e) => (e as { level: string }).level);
    expect(level(b)).toEqual(level(a));
  });
});

describe('요청이 프로필보다 우선한다', () => {
  it('요청에 스타일이 있으면 무드 가산점을 끄고 칩에 "요청 우선"', async () => {
    const h = run('캐주얼 셔츠', profile({ moods: ['minimal'] }));
    await h.until(searched);
    expect(h.search()!.itemIds![0]).toBe('sh2'); // 미니멀이 아니라 요청한 캐주얼 중 가장 싼 상품
    expect(h.chips()).toContainEqual({ label: { ko: '내 스타일', en: 'My style' }, value: { ko: '요청 우선', en: 'Request first' } });
  });
  it('"화려한"은 스트릿으로 읽어 프로필 미니멀을 이긴다', async () => {
    const h = run('화려한 셔츠', profile({ moods: ['minimal'] }));
    await h.until(searched);
    expect(h.reason(h.search()!.itemIds![0])).not.toContain('내 스타일');
  });
  it('해석 못 한 꾸밈말도 스타일 요청으로 보고 무드를 끈다', async () => {
    const h = run('키치한 셔츠', profile({ moods: ['minimal'] }));
    await h.until((e) => e.type === 'understood');
    expect(h.chips()).toContainEqual({ label: { ko: '내 스타일', en: 'My style' }, value: { ko: '요청 우선', en: 'Request first' } });
  });
  it('요청에 색이 있으면 색 취향을 끈다', async () => {
    const h = run('화이트 셔츠', profile({ avoidColors: ['white'] }));
    await h.until(searched);
    expect(h.search()!.itemIds![0]).toBe('sh1');
    expect(h.reason('sh1')).not.toContain('피하는 색');
  });
  it('요청에 적은 소재는 피하는 소재여도 제외하지 않는다', async () => {
    const h = run('울 코트', profile({ avoidMaterials: ['wool'] }));
    await h.until(searched);
    expect(h.search()!.note!.ko).not.toContain('제외');
    expect(h.search()!.itemIds).toContain('c1');
  });
});

describe('피하는 소재는 후보에서 빼고 기록한다', () => {
  it('울을 피하면 울 혼방도 빼고, 몇 개 뺐는지 남긴다', async () => {
    const h = run('코트', profile({ avoidMaterials: ['wool'] }));
    await h.until(searched);
    const s = h.search()!;
    expect(s.itemIds).toEqual(['c4']); // 캐시미어만 남는다
    expect(s.note!.ko).toContain('피하는 소재(울·울 혼방) 4개 제외');
  });
  it('빼고 나니 남는 게 없으면 묻고, 포함하기로 하면 다시 찾는다', async () => {
    const h = run('로퍼', profile({ avoidMaterials: ['leather'] }));
    await h.until((e) => e.type === 'needs_input');
    const q = h.events.find((e): e is Extract<AgentEvent, { type: 'needs_input' }> => e.type === 'needs_input')!;
    expect(q.id.startsWith('q-avoid')).toBe(true);
    h.agent.answer('include');
    await h.until((e) => e.type === 'tool_call' && e.tool === 'search' && e.status === 'done' && (e.itemIds?.length ?? 0) > 0);
  });
});

describe('cleanProfile', () => {
  it('무드는 3개까지, 어휘 밖 값은 버리고, 자주 입는 색과 겹치는 피하는 색은 뺀다', () => {
    expect(cleanProfile({ moods: ['minimal', 'casual', 'formal', 'street', 'light'], likeColors: ['black', 'pink'], avoidColors: ['black', 'brown'], avoidMaterials: ['leather', 'silk'] }))
      .toEqual({ moods: ['minimal', 'casual', 'formal'], likeColors: ['black'], avoidColors: ['brown'], avoidMaterials: ['leather'] });
    expect(cleanProfile(null)).toEqual({ moods: [], likeColors: [], avoidColors: [], avoidMaterials: [] });
  });
});
