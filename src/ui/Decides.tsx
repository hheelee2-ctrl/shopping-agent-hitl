import { useState } from 'react';
import { ChatCircleText, CreditCard, ListChecks, ShoppingBagOpen } from '@phosphor-icons/react';
import type { Dial, Lang } from '../engine/types';
import { DIAL, t } from './copy';
import { APPROVES, LAND, SETUP } from './landCopy';
import { Seg } from './Seg';

/** 단계 아이콘: 요청 · 계획 · 담기 · 결제 */
const STEP_ICON = [ChatCircleText, ListChecks, ShoppingBagOpen, CreditCard];

/**
 * 맡기는 정도 선택기. 위의 큰 판에 네 단계가 있고, 아래에서 정도를 고르면 내가 정하는 단계와 설명이 함께 바뀐다.
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
    <figure className="lane rv" aria-label={t(M.label, lang)}>
      <ol className="lane-steps">
        {M.steps.map((s, i) => {
          const I = STEP_ICON[i];
          return (
            <li key={i} className={you[i] ? 'by-you' : 'by-agent'}>
              <span className="lane-ic" aria-hidden key={`${i}-${you[i]}`}><I size={28} weight="light" /></span>
              <b>{t(s.t, lang)}</b>
              <span className="lane-d">{t(s.d, lang)}</span>
              <span className="lane-who"><i aria-hidden />{you[i] ? t(M.you, lang) : t(M.agent, lang)}</span>
            </li>
          );
        })}
      </ol>
      <div className="lane-ctl">
        <Seg options={(Object.keys(DIAL) as Dial[]).map((d) => ({ value: d, label: t(DIAL[d], lang) }))} value={dial} onChange={setDial} label={t(M.dial, lang)} />
      </div>
      <figcaption className="lane-foot" key={dial}>
        <b>{t(DIAL[dial], lang)}.</b> {t(SETUP.dialDesc[dial], lang)}. {M.touches[lang](touches)}. {t(M.touchNote, lang)}
      </figcaption>
    </figure>
  );
}
