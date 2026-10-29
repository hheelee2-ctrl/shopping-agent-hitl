import { useEffect, useState } from 'react';
import type { Dial, L, Lang, SizeProfile } from '../engine/types';
import { interventionCost, type Cost } from '../agent/cost';
import { DIAL, t } from './copy';

const X = {
  title: { ko: '맡기는 정도별로 묻는 횟수', en: 'How often it asks, by setting' } satisfies L,
  go: { ko: '같은 요청을 세 가지 설정으로 돌려 보기', en: 'Run this request at all three settings' } satisfies L,
  busy: { ko: '계산 중', en: 'Running' } satisfies L,
  times: { ko: '회', en: '×' } satisfies L,
  note: {
    ko: '가격·재고가 움직이지 않는 연습용 쇼핑몰에서, 묻는 건 모두 승인하고 질문에는 첫 번째 답을 고른다고 치고 끝까지 돌려 센 횟수예요. 결제 승인은 어느 설정이든 1번이에요.',
    en: 'Counted on a separate, quiet shop, accepting every approval and picking the first option on questions. Payment approval is 1 at every level.',
  } satisfies L,
  plan: { ko: '계획 승인', en: 'Plan approval' } satisfies L,
  cart: { ko: '담기 승인', en: 'Cart approval' } satisfies L,
  ask: { ko: '질문 답변', en: 'Question' } satisfies L,
  pay: { ko: '결제 승인', en: 'Payment approval' } satisfies L,
};
const DIALS: Dial[] = ['always', 'cart-only', 'auto'];
const KINDS = ['plan', 'cart', 'ask', 'pay'] as const;

interface Props {
  lang: Lang; request: string; limit: number; sizes: SizeProfile; dial: Dial; disabled: boolean;
  onPick: (d: Dial) => void;
}

/** 에이전트가 낸 이벤트를 세어, 자율도를 바꾸면 사람의 부담이 어떻게 달라지는지 보여준다. */
export function CostMeter({ lang, request, limit, sizes, dial, disabled, onPick }: Props) {
  const [rows, setRows] = useState<Record<Dial, Cost> | null>(null);
  const [busy, setBusy] = useState(false);
  const key = `${request}|${limit}|${JSON.stringify(sizes)}`;
  useEffect(() => { setRows(null); }, [key]);

  const run = async () => {
    setBusy(true);
    const o = { request, limit, sizes };
    const [a, c, u] = await Promise.all(DIALS.map((d) => interventionCost({ ...o, dial: d })));
    setRows({ always: a, 'cart-only': c, auto: u });
    setBusy(false);
  };

  return (
    <div className="card cost">
      <h2>{t(X.title, lang)}</h2>
      {!rows ? (
        <button className="btn sm" onClick={run} disabled={busy || disabled}>{busy ? t(X.busy, lang) : t(X.go, lang)}</button>
      ) : (
        <>
          <ul className="cost-rows">
            {DIALS.map((d, r) => (
              <li key={d} className={d === dial ? 'now' : ''} style={{ '--r': r } as React.CSSProperties}>
                <button className="cost-row" onClick={() => onPick(d)} disabled={disabled} aria-pressed={d === dial}>
                  <span className="cost-name">{t(DIAL[d], lang)}</span>
                  <span className="cost-sq" role="img" aria-label={`${rows[d].total}${t(X.times, lang)}`}>
                    {KINDS.flatMap((k) => Array.from({ length: rows[d][k] }, (_, j) => ({ k, j }))).map((s, i) => (
                      <i key={`${s.k}${s.j}`} className={`sq ${s.k}`} style={{ '--i': i } as React.CSSProperties} title={t(X[s.k], lang)} />
                    ))}
                  </span>
                  <b className="cost-n">{rows[d].total}{t(X.times, lang)}</b>
                </button>
              </li>
            ))}
          </ul>
          <div className="cost-key">
            {KINDS.map((k) => <span key={k}><i className={`sq ${k}`} />{t(X[k], lang)}</span>)}
          </div>
          <p className="note">{t(X.note, lang)}</p>
        </>
      )}
    </div>
  );
}
