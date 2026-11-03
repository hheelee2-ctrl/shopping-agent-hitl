import { CheckCircle, Minus } from '@phosphor-icons/react';
import type { Dial, Lang } from '../engine/types';
import { DIAL, t } from './copy';
import { APPROVES, LAND, SETUP } from './landCopy';

const DIALS = Object.keys(DIAL) as Dial[];

/**
 * 맡기는 정도 세 단계 비교. 계획·담기 확인은 APPROVES(= agent.ts의 실제 동작)에서 가져오고,
 * 비슷한 후보 묻기(R5)·한도 알림(R3)·직접 결제(R1)는 어느 단계든 같다.
 */
const HAS: Record<(typeof LAND.cmp)[number]['k'], (d: Dial) => boolean> = {
  plan: (d) => APPROVES[d][0],
  add: (d) => APPROVES[d][1],
  tie: () => true,
  limit: () => true,
  pay: () => true,
};

export function DialTable({ lang }: { lang: Lang }) {
  return (
    <div className="dtab rv">
      <div className="dtab-head">
        {DIALS.map((d) => (
          <div key={d} className="dtab-col">
            <h3>{t(DIAL[d], lang)}</h3>
            <p>{t(SETUP.dialDesc[d], lang)}</p>
          </div>
        ))}
      </div>
      {LAND.cmp.map((row) => (
        <div key={row.k} className="dtab-row">
          <p className="dtab-k">{t(row.t, lang)}</p>
          {DIALS.map((d) => {
            const yes = HAS[row.k](d);
            return (
              <div key={d} className={`dtab-cell${yes ? ' yes' : ''}`}>
                <span className="sr-only">{t(DIAL[d], lang)}: {t(yes ? LAND.cmpYes : LAND.cmpNo, lang)}</span>
                {yes ? <CheckCircle size={28} weight="fill" aria-hidden /> : <Minus size={20} aria-hidden />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
