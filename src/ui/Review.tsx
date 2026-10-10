import { createContext, useContext, useState } from 'react';
import type { Lang } from '../engine/types';
import { RULE_TESTS, ruleOf, type RuleId } from '../rules';
import { t } from './copy';

/** 리뷰 모드(설계 보기)가 켜졌는지. 켜지면 화면 곳곳에 그 자리가 지키는 승인 규칙이 붙는다. */
export const ReviewCtx = createContext(false);

const TXT = {
  tests: { ko: (n: number) => `테스트 ${n}개가 지켜요`, en: (n: number) => `Guarded by ${n} tests` },
  playbook: { ko: '플레이북에서 보기', en: 'See the playbook' },
  where: { ko: '화면', en: 'Where' },
};

/**
 * 규칙 표시. 리뷰 모드에서만 보인다. 칩을 누르면 규칙 내용과 그 규칙을 지키는 테스트 수가 펼쳐진다.
 * 레이아웃을 건드리지 않도록 카드 바로 위에 한 줄로 끼어든다.
 */
export function RuleMark({ ids, lang }: { ids: RuleId[]; lang: Lang }) {
  const on = useContext(ReviewCtx);
  const [open, setOpen] = useState<RuleId | null>(null);
  if (!on) return null;
  const r = open ? ruleOf(open) : null;
  return (
    <div className="rmark" role="note">
      <div className="rmark-chips">
        {ids.map((id) => (
          <button key={id} type="button" className={`rmark-chip ${open === id ? 'on' : ''}`} aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
            <b>{id}</b>{t(ruleOf(id).name, lang)}
          </button>
        ))}
      </div>
      {r && (
        <div className="rmark-pop">
          <p className="rmark-rule">{t(r.rule, lang)}</p>
          <p className="rmark-meta">
            <span>{TXT.tests[lang](RULE_TESTS[r.id])}</span>
            <a href="#/playbook">{t(TXT.playbook, lang)}</a>
          </p>
        </div>
      )}
    </div>
  );
}

/** 헤더의 '설계 보기' 토글 */
export function ReviewToggle({ on, onToggle, lang }: { on: boolean; onToggle: () => void; lang: Lang }) {
  return (
    <button className={`top-btn review-btn ${on ? 'on' : ''}`} aria-pressed={on} onClick={onToggle} title={lang === 'ko' ? '화면마다 지키는 승인 규칙과 테스트를 보여줘요' : 'Show the approval rules and tests behind each part'}>
      <span className="review-dot" aria-hidden />{lang === 'ko' ? '설계 보기' : 'Design notes'}
    </button>
  );
}
