import { describe, expect, it } from 'vitest';
import { parseMulti, restate } from './parser';
import { HELD_OUT, REQUESTS, type Expect } from './requests.fixture';

/** 요청 하나가 기대한 조건으로 해석됐는지. 틀린 항목 이름을 돌려준다. */
export function check(text: string, e: Expect): string[] {
  const p = parseMulti(text);
  const bad: string[] = [];
  if (e.items !== undefined) {
    if (p.items.length !== e.items) bad.push(`items ${p.items.length}`);
    if (e.budget !== undefined && p.budget !== e.budget) bad.push(`budget ${p.budget}`);
    return bad;
  }
  const c = p.items[0];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (p.items.length !== 1) bad.push(`items ${p.items.length}`);
  if (e.category !== undefined && c.category !== e.category) bad.push(`category ${c.category}`);
  if (e.categories !== undefined && !same(c.categories, e.categories)) bad.push(`categories ${c.categories}`);
  for (const k of ['colors', 'materials', 'seasons', 'styles'] as const) {
    if (!same([...c[k]].sort(), [...(e[k] ?? [])].sort())) bad.push(`${k} ${c[k]}`);
  }
  if (e.maxPrice !== c.maxPrice) bad.push(`maxPrice ${c.maxPrice}`);
  if (e.minPrice !== c.minPrice) bad.push(`minPrice ${c.minPrice}`);
  if (e.size !== c.size) bad.push(`size ${c.size}`);
  if (e.weekday !== c.deliverBy?.weekday) bad.push(`weekday ${c.deliverBy?.weekday}`);
  if (e.days !== c.deliverBy?.days) bad.push(`days ${c.deliverBy?.days}`);
  if (!same(c.unknown, e.unknown ?? [])) bad.push(`unknown ${c.unknown}`);
  return bad;
}

describe('요청 해석 평가 세트', () => {
  it.each(REQUESTS)('%s', (text, e) => {
    expect(check(text, e)).toEqual([]);
  });
});

describe('요청 해석 확인용 세트 (규칙을 맞추지 않은 문장)', () => {
  it.each(HELD_OUT)('%s', (text, e) => {
    expect(check(text, e)).toEqual([]);
  });
});

describe('restate: 해석을 한 문장으로 되말한다', () => {
  const mine = (size?: string) => () => ({ size, mine: true });
  const say = (text: string, sizeOf = mine()) => restate(parseMulti(text), sizeOf).ko;
  it('조건과 받침에 맞는 조사로 말한다', () => {
    expect(say('검정 울 코트, 20만원 이하')).toBe('블랙 울 코트를 20만원 이하로 찾아볼게요.');
    expect(say('가을 아우터 30만원 이하')).toBe('가을용 아우터를 30만원 이하로 찾아볼게요.');
    expect(say('흰색 셔츠', () => ({ size: 'M', mine: true }))).toBe('화이트 셔츠를 내 사이즈(M)로 찾아볼게요.');
    expect(say('10만원대 가방')).toBe('가방을 10만원~20만원 사이로 찾아볼게요.');
  });
  it('모르는 표현은 확인하겠다고 덧붙인다', () => {
    expect(say('키치한 코트')).toBe("코트를 찾아볼게요. '키치한'은 아직 모르는 표현이라 확인할게요.");
  });
  it('여러 상품과 합계 예산', () => {
    expect(say('블랙 코트랑 갈색 로퍼, 합쳐서 40만원')).toBe('블랙 코트, 브라운 로퍼, 2가지를 합계 40만원 이하로 찾아볼게요.');
  });
});
