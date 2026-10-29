import { useState } from 'react';
import { ChatCircleText, CreditCard, ListChecks, ShoppingBagOpen } from '@phosphor-icons/react';
import type { Dial, Lang } from '../engine/types';
import { DIAL, t } from './copy';
import { APPROVES, LAND } from './landCopy';
import { Seg } from './Seg';

/** 단계 아이콘: 요청 · 계획 · 담기 · 결제 */
const STEP_ICON = [ChatCircleText, ListChecks, ShoppingBagOpen, CreditCard];

/**
 * 히어로의 "누가 정하나요": 맡기는 정도를 바꾸면 네 단계 중 내가 정하는 자리가 바뀐다.
 * 기준은 APPROVES(= agent.ts의 실제 동작)다. 요청과 결제는 언제나 사람.
 * 단계 아이콘은 그 단계가 내 손으로 넘어올 때 한 번 튀어 오른다(key가 바뀌며 다시 그려진다).
 */
export function Decides({ lang }: { lang: Lang }) {
  const [dial, setDial] = useState<Dial>('cart-only');
  const M = LAND.map;
  const [plan, add] = APPROVES[dial];
  const you = [true, plan, add, true];
  const touches = you.slice(1).filter(Boolean).length;

  return (
    <figure className="lane" aria-label={t(M.label, lang)}>
      <div className="lane-top">
        <span className="lane-label">{t(M.label, lang)}</span>
        <Seg options={(Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }))} value={dial} onChange={setDial} label={t(M.dial, lang)} />
      </div>
      <ol className="lane-steps">
        {M.steps.map((s, i) => (
          <li key={i} className={you[i] ? 'by-you' : 'by-agent'}>
            <span className="lane-ic" aria-hidden key={`${i}-${you[i]}`}>{(() => { const I = STEP_ICON[i]; return <I size={22} weight="light" />; })()}</span>
            <span className="num">{String(i + 1).padStart(2, '0')}</span>
            <b>{t(s.t, lang)}</b>
            <span className="lane-d">{t(s.d, lang)}</span>
            <span className="lane-who"><i aria-hidden />{you[i] ? t(M.you, lang) : t(M.agent, lang)}</span>
          </li>
        ))}
      </ol>
      <figcaption className="lane-foot">
        <strong key={touches}>{M.touches[lang](touches)}</strong>
        <span>{t(M.touchNote, lang)}</span>
      </figcaption>
    </figure>
  );
}
