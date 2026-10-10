import { useEffect, useRef, useState } from 'react';
import type { Dial, Lang } from '../engine/types';
import type { Phase } from '../state/console';
import type { Frame } from '../state/timeline';
import { TASKS, dialOrder, loadSession, measure, saveSession, toCsv, type Session, type Survey, type TaskMetrics } from '../study/study';
import { DIAL, t } from './copy';

const X = {
  tag: { ko: '사용성 테스트', en: 'Usability test' },
  task: { ko: (i: number, n: number) => `과제 ${i}/${n}`, en: (i: number, n: number) => `Task ${i}/${n}` },
  dial: { ko: '이번 자율도', en: 'Autonomy this time' },
  start: { ko: '과제 시작', en: 'Start task' },
  done: { ko: '과제 끝내기', en: 'End task' },
  doneNote: { ko: '샀거나, 그만두기로 했으면 눌러 주세요.', en: 'Press when you bought it or decided to stop.' },
  survey: { ko: '방금 과제는 어땠나요?', en: 'How was that task?' },
  q: {
    predictable: { ko: '에이전트가 다음에 무엇을 할지 예상할 수 있었다', en: 'I could predict what the agent would do next' },
    control: { ko: '내가 통제하고 있다고 느꼈다', en: 'I felt in control' },
    again: { ko: '다음에도 이 방식으로 맡기겠다', en: 'I would delegate this way again' },
  },
  scale: { ko: ['전혀 아니다', '매우 그렇다'], en: ['Strongly disagree', 'Strongly agree'] },
  noticed: { ko: '과제 중에 가격이 바뀐 걸 알아챘나요?', en: 'Did you notice a price change during the task?' },
  yn: { yes: { ko: '네', en: 'Yes' }, no: { ko: '아니요', en: 'No' }, unsure: { ko: '잘 모르겠다', en: 'Not sure' } },
  memo: { ko: '한 줄 메모 (선택)', en: 'One-line note (optional)' },
  next: { ko: '저장하고 다음', en: 'Save and continue' },
  finished: { ko: '모든 과제를 마쳤어요. 고맙습니다.', en: 'All tasks done. Thank you.' },
  json: { ko: 'JSON 내려받기', en: 'Download JSON' },
  csv: { ko: 'CSV 내려받기', en: 'Download CSV' },
  restart: { ko: '이 참가자 기록 지우기', en: 'Clear this participant' },
  confirmClear: { ko: '이 참가자의 기록을 지울까요? 내려받지 않았다면 되돌릴 수 없어요.', en: 'Clear this participant’s records? This cannot be undone unless you downloaded them.' },
};

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  pid: string;
  lang: Lang;
  frames: Frame[];
  phase: Phase;
  /** 과제를 새로 시작한다: 쇼핑몰을 처음 상태로 돌리고 자율도를 맞춘다 */
  onBegin: (dial: Dial) => void;
  /** 담긴 상품 하나의 가격을 올린다. 올렸으면 true */
  onInject: () => boolean;
}

/**
 * 사용성 테스트 띠. 과제 안내 → 수행 → 설문을 세 번 돌고, 끝나면 기록을 내려받는다.
 * 기록은 이 브라우저의 localStorage에도 남아 새로고침해도 이어진다.
 */
export function StudyBar({ pid, lang, frames, phase, onBegin, onInject }: Props) {
  const [session, setSession] = useState<Session>(() => loadSession(pid));
  const [stage, setStage] = useState<'brief' | 'running' | 'survey'>('brief');
  const run = useRef<{ injected: boolean } | null>(null);
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const order = dialOrder(pid);
  const i = session.records.length;
  const finished = i >= TASKS.length;
  const task = TASKS[Math.min(i, TASKS.length - 1)];
  const dial = order[Math.min(i, order.length - 1)];

  useEffect(() => { saveSession(session); }, [session]);

  // 결제 승인 카드가 뜨면 잠시 뒤 가격을 바꾼다 (자율도와 상관없이 같은 지점)
  useEffect(() => {
    if (stage !== 'running' || phase !== 'payment-gate' || !run.current || run.current.injected) return;
    const id = window.setTimeout(() => { if (run.current && onInject()) run.current.injected = true; }, 1200);
    return () => window.clearTimeout(id);
  }, [stage, phase, onInject]);

  const begin = () => {
    // onBegin이 쇼핑몰을 처음 상태로 돌리면 타임라인도 새로 시작한다. 그 뒤 프레임이 이번 과제다.
    onBegin(dial);
    run.current = { injected: false };
    setStage('running');
  };
  const end = () => {
    if (!run.current) return;
    setMetrics(measure(frames, frames[0]?.orders ?? 0));
    setStage('survey');
  };
  const submit = (survey: Survey) => {
    if (!metrics || !run.current) return;
    const rec = { task: task.id, dial, injected: run.current.injected, ...metrics, survey };
    setSession((s) => ({ ...s, records: [...s.records, rec] }));
    run.current = null;
    setMetrics(null);
    setStage('brief');
  };
  const clear = () => {
    if (!window.confirm(t(X.confirmClear, lang))) return;
    setSession({ pid, startedAt: new Date().toISOString(), records: [] });
    setStage('brief');
  };

  return (
    <>
      <div className={`study-bar ${stage}`} role="region" aria-label={t(X.tag, lang)}>
        <span className="study-tag">{t(X.tag, lang)} · {pid}</span>
        {finished ? (
          <>
            <p className="study-brief">{t(X.finished, lang)}</p>
            <div className="study-act">
              <button className="btn" onClick={() => download(`nod-study-${pid}.json`, JSON.stringify(session, null, 2), 'application/json')}>{t(X.json, lang)}</button>
              <button className="btn primary" onClick={() => download(`nod-study-${pid}.csv`, toCsv([session]), 'text/csv')}>{t(X.csv, lang)}</button>
              <button className="btn ghost" onClick={clear}>{t(X.restart, lang)}</button>
            </div>
          </>
        ) : (
          <>
            <span className="study-step">{X.task[lang](i + 1, TASKS.length)}<i>{t(X.dial, lang)}: <b>{t(DIAL[dial], lang)}</b></i></span>
            <p className="study-brief">{t(task.brief, lang)}</p>
            <div className="study-act">
              {stage === 'brief' && <button className="btn primary" onClick={begin}>{t(X.start, lang)}</button>}
              {stage === 'running' && <button className="btn" title={t(X.doneNote, lang)} onClick={end}>{t(X.done, lang)}</button>}
            </div>
          </>
        )}
      </div>
      {stage === 'survey' && <SurveyCard lang={lang} onSubmit={submit} />}
    </>
  );
}

function SurveyCard({ lang, onSubmit }: { lang: Lang; onSubmit: (s: Survey) => void }) {
  const [v, setV] = useState<Partial<Survey>>({ memo: '' });
  const ready = v.predictable && v.control && v.again && v.noticed;
  return (
    <div className="cmp-wrap study-survey" role="dialog" aria-modal="true" aria-label={t(X.survey, lang)}>
      <div className="cmp-scrim" />
      <form className="cmp" onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(v as Survey); }}>
        <h2>{t(X.survey, lang)}</h2>
        {(['predictable', 'control', 'again'] as const).map((k) => (
          <fieldset key={k} className="likert">
            <legend>{t(X.q[k], lang)}</legend>
            <div className="likert-row">
              <span>{X.scale[lang][0]}</span>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <label key={n}><input type="radio" name={k} checked={v[k] === n} onChange={() => setV({ ...v, [k]: n })} /><b>{n}</b></label>
              ))}
              <span>{X.scale[lang][1]}</span>
            </div>
          </fieldset>
        ))}
        <fieldset className="likert">
          <legend>{t(X.noticed, lang)}</legend>
          <div className="likert-row yn">
            {(['yes', 'no', 'unsure'] as const).map((k) => (
              <label key={k}><input type="radio" name="noticed" checked={v.noticed === k} onChange={() => setV({ ...v, noticed: k })} /><b>{t(X.yn[k], lang)}</b></label>
            ))}
          </div>
        </fieldset>
        <label className="study-memo">
          <span>{t(X.memo, lang)}</span>
          <input type="text" value={v.memo} maxLength={200} onChange={(e) => setV({ ...v, memo: e.target.value })} />
        </label>
        <div className="row"><button className="btn primary" type="submit" disabled={!ready}>{t(X.next, lang)}</button></div>
      </form>
    </div>
  );
}
