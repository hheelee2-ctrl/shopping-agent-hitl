import { describe, expect, it } from 'vitest';
import type { Action } from '../state/console';
import type { Frame } from '../state/timeline';
import { TASKS, bumped, dialOrder, measure, studyId, toCsv } from './study';

const f = (at: number, actions: Action[], orders = 0): Frame => ({ at, label: { ko: '', en: '' }, actor: 'user', actions, cart: [], products: {}, orders });
const ev = (event: Extract<Action, { type: 'event' }>['event']): Action => ({ type: 'event', event });

describe('사용성 테스트 모드', () => {
  it('자율도 순서를 참가자마다 돌려, 세 명이면 과제마다 세 자율도가 한 번씩 나온다', () => {
    const rows = ['P01', 'P02', 'P03'].map(dialOrder);
    for (let i = 0; i < TASKS.length; i++) expect(new Set(rows.map((r) => r[i])).size).toBe(3);
    expect(dialOrder('P04')).toEqual(dialOrder('P01'));
  });

  it('가격은 10% 올리고 천 원 단위로 맞춘다', () => {
    expect(bumped(189000)).toBe(208000);
  });

  it('해시에서 참가자 번호를 읽는다', () => {
    expect(studyId('#/app?study=P03')).toBe('P03');
    expect(studyId('#/app?review=1&study=P12')).toBe('P12');
    expect(studyId('#/app')).toBeNull();
  });

  it('[R4] 타임라인에서 개입·거절·되돌리기·결제 직전 재확인 반응을 센다', () => {
    const frames = [
      f(1000, [{ type: 'start' }]),
      f(2000, [{ type: 'user_ack', choice: 'approve' }]),
      f(2500, [ev({ type: 'undo', targetId: 't1', status: 'done' })]),
      f(3000, [{ type: 'user_ack', choice: 'reject' }]),
      f(4000, [ev({ type: 'needs_input', id: 'q-payfix0', question: { ko: '', en: '' }, options: [] })]),
      f(5000, [{ type: 'user_ack', choice: { option: 'refresh' } }]),
      f(9000, [ev({ type: 'result', status: 'done', summary: { ko: '', en: '' } })], 2),
    ];
    expect(measure(frames, 1)).toEqual({
      durationMs: 8000, interventions: 3, rejects: 1, undos: 1, questions: 1, priceResponse: 'refresh', outcome: 'done', orders: 1,
    });
  });

  it('CSV는 설문까지 한 줄로 펼치고 쉼표·따옴표를 감싼다', () => {
    const csv = toCsv([{
      pid: 'P01', startedAt: '', records: [{
        task: 'T1', dial: 'auto', injected: true, durationMs: 1, interventions: 1, rejects: 0, undos: 0, questions: 0, priceResponse: 'stop', outcome: 'cancelled', orders: 0,
        survey: { predictable: 6, control: 5, again: 4, noticed: 'yes', memo: '가격이 "갑자기", 바뀜' },
      }],
    }]);
    const [head, row] = csv.trim().split('\n');
    expect(head.split(',')).toContain('noticed');
    expect(row).toBe('P01,T1,auto,1,1,0,0,0,true,stop,cancelled,0,6,5,4,yes,"가격이 ""갑자기"", 바뀜"');
  });
});
