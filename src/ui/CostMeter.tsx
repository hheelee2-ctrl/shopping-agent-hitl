import { useEffect, useState } from 'react';
import type { Dial, L, Lang } from '../engine/types';
import { interventionCost, type Cost } from '../agent/cost';
import { DIAL, t } from './copy';

const X = {
  title: { ko: '자율도별 개입 비용', en: 'Human effort by autonomy' } satisfies L,
  go: { ko: '같은 요청을 세 단계로 돌려보기', en: 'Run this request at all three levels' } satisfies L,
  busy: { ko: '계산 중', en: 'Running' } satisfies L,
  times: { ko: '회', en: '×' } satisfies L,
  note: {
    ko: '승인은 모두 수락하고, 질문은 첫 번째 선택지로 답한다고 가정해 별도 쇼핑몰에서 끝까지 돌린 횟수예요. 결제 승인은 어느 단계에서도 1번이에요.',
    en: 'Counted by running the request to the end on a separate shop, accepting every approval and picking the first option on questions. Payment approval is 1 at every level.',
  } satisfies L,
  plan: { ko: '계획 승인', en: 'Plan approval' } satisfies L,
  cart: { ko: '담기 승인', en: 'Cart approval' } satisfies L,
  ask: { ko: '질문 답변', en: 'Question' } satisfies L,
  pay: { ko: '결제 승인', en: 'Payment approval' } satisfies L,
};
const DIALS: Dial[] = ['always', 'cart-only', 'auto'];
const KINDS = ['plan', 'cart', 'ask', 'pay'] as const;

interface Props {
  lang: Lang; request: string; limit: number; stockout: boolean; priceChange: boolean; dial: Dial; disabled: boolean;
  onPick: (d: Dial) => void;
}

/** 에이전트가 낸 이벤트를 세어, 자율도를 바꾸면 사람의 부담이 어떻게 달라지는지 보여준다. */
export function CostMeter({ lang, request, limit, stockout, priceChange, dial, disabled, onPick }: Props) {
  const [rows, setRows] = useState<Record<Dial, Cost> | null>(null);
  const [busy, setBusy] = useState(false);
  const key = `${request}|${limit}|${stockout}|${priceChange}`;
  useEffect(() => { setRows(null); }, [key]);

  const run = async () => {
    setBusy(true);
    const o = { request, limit, simulateStockout: stockout, simulatePriceChange: priceChange };
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
