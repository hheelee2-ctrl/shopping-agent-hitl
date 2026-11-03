import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { Lang } from '../engine/types';
import { photoUrl } from '../store/photos';
import { t } from './copy';
import { LAND } from './landCopy';

/** 장면마다 보여줄 실제 상품 사진: 178,000원 코트(투어와 같은 상품), 비슷한 두 운동화, 가격 대기 중인 니트 */
const PH = [['c1'], ['s3', 's6'], ['k3']];
/** 사진 아래 한 줄: 무슨 일이 있었고(앞), 에이전트가 어떻게 했는지(끝) */
const TAG: (keyof typeof LAND.vis)[][] = [['priceA', 'priceB', 'ask'], ['candA', 'candB', 'pick'], ['target', 'dropped', 'held']];

/**
 * 멈추는 세 장면. 왼쪽 이름을 누르면 그 장면의 설명이 펼쳐지고 오른쪽 큰 사진이 바뀐다(한 번에 하나).
 * 좁은 화면에서는 사진이 위, 이름 목록이 아래로 쌓인다.
 */
export function Scenes({ lang }: { lang: Lang }) {
  const [on, setOn] = useState(0);
  // 다른 장면을 눌렀을 때 빈 판이 보이지 않게 사진을 미리 받아 둔다
  useEffect(() => { PH.flat().forEach((id) => { new Image().src = photoUrl(id, 720) ?? ''; }); }, []);
  return (
    <div className="stp rv">
      <ul className="stp-list">
        {LAND.scenes.map((s, i) => (
          <li key={i} className={i === on ? 'on' : undefined}>
            <button type="button" aria-expanded={i === on} onClick={() => setOn(i)}>
              <Plus className="stp-plus" size={16} weight="bold" aria-hidden />
              <span className="stp-t">{t(s.t, lang)}</span>
            </button>
            {i === on && <p className="stp-d">{t(s.d, lang)}</p>}
          </li>
        ))}
      </ul>
      <figure className="stp-v" key={on}>
        <div className={`stp-ph n${PH[on].length}`}>
          {PH[on].map((id) => <img key={id} src={photoUrl(id, 720) ?? ''} alt="" decoding="async" />)}
        </div>
        <figcaption className={`stp-tag s${on + 1}`}>
          {TAG[on].map((k, j) => <span key={j} className={j === TAG[on].length - 1 ? 'end' : undefined}>{t(LAND.vis[k], lang)}</span>)}
          <i className="stp-r num">{LAND.scenes[on].r}</i>
        </figcaption>
      </figure>
    </div>
  );
}
