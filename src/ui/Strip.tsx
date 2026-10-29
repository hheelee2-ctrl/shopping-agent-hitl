import type { Lang } from '../engine/types';
import { photoUrl } from '../store/photos';
import { t } from './copy';
import { LAND } from './landCopy';

/** 히어로 아래 상품 사진 띠. 실제 진열대(catalog)의 사진만 쓴다. 옷·신발·소품을 번갈아 둔다 */
const IDS = ['c4', 'k8', 's3', 'sh2', 'd1', 'bt2', 'j1', 'sc1', 'pt1', 'l1', 'w1', 'cp1', 'c1', 'sk1', 'h1', 't1', 'wt1', 'k5'];

/**
 * 장식이다: 사진은 alt를 비우고, 띠 전체에 이름만 붙인다.
 * 같은 줄을 두 번 이어 붙여 끊김 없이 흐르게 한다(두 번째 줄은 화면 읽기에서 숨긴다).
 * 움직임 줄이기를 켜면 흐르지 않고 가로로 넘겨 본다.
 */
export function Strip({ lang }: { lang: Lang }) {
  const row = (dup: boolean) => (
    <ul className="strip-row" aria-hidden={dup || undefined}>
      {IDS.map((id) => (
        <li key={id}>
          <img src={photoUrl(id, 360) ?? ''} alt="" loading="lazy" decoding="async" width={180} height={240} />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="strip" aria-label={t(LAND.map.strip, lang)}>
      <div className="strip-track">{row(false)}{row(true)}</div>
    </section>
  );
}
