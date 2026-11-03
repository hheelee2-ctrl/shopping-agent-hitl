import { useState } from 'react';
import { ArrowsClockwise, CaretDown, ChatCircleText, ClockCounterClockwise, CreditCard, type Icon } from '@phosphor-icons/react';
import type { Lang } from '../engine/types';
import { RULES, RULE_TESTS } from '../rules';
import { t } from './copy';
import { LAND } from './landCopy';

const ICON: Record<string, Icon> = { pay: CreditCard, ask: ChatCircleText, change: ArrowsClockwise, after: ClockCounterClockwise };

/**
 * 믿고 맡길 수 있는 네 가지 약속. 앞에는 쉬운 말(약속 + 한 줄)만 두고,
 * "어떻게 지키나요"를 누르면 그 약속을 지키는 원칙(R번호와 이름)과 테스트 수가 작게 펼쳐진다(한 번에 하나).
 * 아이콘은 약속마다 다르게 움직인다: 카드는 뒤집히고, 말풍선은 튀어 오르고, 화살표는 돌고, 시계는 거꾸로 돈다.
 */
export function Stages({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ol className="pg rv">
      {LAND.stages.map((s, si) => {
        const I = ICON[s.k];
        const on = open === s.k;
        const tests = s.ids.reduce((a, id) => a + RULE_TESTS[id as keyof typeof RULE_TESTS], 0);
        return (
          <li key={s.k} className={`pg-st pg-${s.k}${on ? ' on' : ''}`} style={{ ['--i' as string]: si }}>
            <span className="pg-ic" aria-hidden><I size={28} weight="light" /></span>
            <h3>{t(s.t, lang)}</h3>
            <p className="pg-d">{t(s.d, lang)}</p>
            <button type="button" className="pg-how" aria-expanded={on} onClick={() => setOpen(on ? null : s.k)}>
              {t(LAND.playHow, lang)}
              <CaretDown className="pg-caret" size={12} weight="bold" aria-hidden />
            </button>
            {on && (
              <div className="pg-more">
                <ul>
                  {s.ids.map((id) => {
                    const r = RULES.find((x) => x.id === id)!;
                    return <li key={id}><span className="pg-id num">{r.id}</span><span>{t(r.name, lang)}</span></li>;
                  })}
                </ul>
                <p className="pg-tests">{LAND.playTests[lang](tests)}</p>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
