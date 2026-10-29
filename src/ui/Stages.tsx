import { useState } from 'react';
import { ChatCircleText, ClockCounterClockwise, CreditCard, Plus, ShoppingBagOpen, type Icon } from '@phosphor-icons/react';
import type { Lang } from '../engine/types';
import { RULES, RULE_TESTS, type RuleId } from '../rules';
import { t } from './copy';
import { LAND } from './landCopy';

const ICON: Record<string, Icon> = { ask: ChatCircleText, pick: ShoppingBagOpen, pay: CreditCard, after: ClockCounterClockwise };

/**
 * 10가지 원칙을 쇼핑이 흘러가는 네 단계로 묶어 보여준다. 처음엔 단계 이름과 한 줄, 원칙은 이름만.
 * 원칙 이름을 누르면 그 원칙 한 문장과 묶인 테스트 수가 펼쳐진다(한 번에 하나).
 * 단계 아이콘은 단계마다 다르게 움직인다: 말풍선은 튀어 오르고, 가방은 떨어지고, 카드는 뒤집히고, 시계는 거꾸로 돈다.
 */
export function Stages({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState<RuleId | null>(null);
  return (
    <ol className="pg rv">
      {LAND.stages.map((s, si) => {
        const I = ICON[s.k];
        return (
          <li key={s.k} className={`pg-st pg-${s.k}`} style={{ ['--i' as string]: si }}>
            <span className="pg-ic" aria-hidden><I size={28} weight="light" /></span>
            <p className="pg-n num">{String(si + 1).padStart(2, '0')}</p>
            <h3>{t(s.t, lang)}</h3>
            <p className="pg-d">{t(s.d, lang)}</p>
            <ul className="pg-rules">
              {s.ids.map((id) => {
                const r = RULES.find((x) => x.id === id)!;
                const on = open === r.id;
                return (
                  <li key={id} className={on ? 'on' : undefined}>
                    <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : r.id)}>
                      <span className="pg-id num">{r.id}</span>
                      <span className="pg-name">{t(r.name, lang)}</span>
                      <Plus className="pg-plus" size={14} weight="regular" aria-hidden />
                    </button>
                    {on && (
                      <div className="pg-more">
                        <p>{t(r.rule, lang)}</p>
                        <p className="pg-tests">{LAND.playTests[lang](RULE_TESTS[r.id])}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
