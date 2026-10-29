import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { L, Lang } from '../engine/types';
import { buildCatalog } from '../store/catalog';
import { photoUrl } from '../store/photos';
import { money, t } from './copy';
import { Mark } from './Mark';
import { reducedMotion } from './motion';

/** 진열대 9칸. 요청에 맞는 건 카멜·베이지 코트 셋, 그중 하나는 예산을 넘는다. 사진에 덧댄 자국이 없는 상품만 쓴다. */
const SHELF = ['k5', 'c6', 'a5', 'c7', 's3', 'sh2', 'l2', 'c4', 'pt3'];
const MATCH = new Set(['c7', 'c6', 'c4']);
const OVER = 'c4';
const PICK = 'c7';

const REQ: L = { ko: '카멜·베이지 코트, 25만원 이하', en: 'Camel or beige coat under 250000' };
const TXT = {
  match: { ko: '요청에 맞음', en: 'Match' },
  over: { ko: '예산 초과', en: 'Over budget' },
  ask: { ko: '이 상품을 담을까요?', en: 'Add this item?' },
  add: { ko: '담기', en: 'Add' },
  skip: { ko: '다음에', en: 'Not now' },
  added: { ko: '장바구니에 담았어요', en: 'Added to cart' },
  cart: { ko: '장바구니', en: 'Cart' },
  free: { ko: '무료배송', en: 'Free shipping' },
} satisfies Record<string, L>;

/** 단계: 입력 → 훑기 → 후보 → 고르고 묻기 → 담음 */
type Stage = 0 | 1 | 2 | 3 | 4;
const AT: number[] = [0, 1500, 2900, 3900, 5600];
const LOOP = 7600;

/**
 * 히어로 오른쪽. 실제 상품 사진으로 채운 진열대에서 에이전트가 요청을 읽고,
 * 맞지 않는 상품을 흐리게 하고, 예산을 넘는 후보를 걸러, 하나를 골라 담기 전에 묻는다.
 * 반듯하게 둔다(기울이면 스크롤 중에 비뚤어져 보인다). 동작 줄이기 설정이면 '묻는 순간'에 멈춰 보여준다.
 */
export function HeroPicks({ lang }: { lang: Lang }) {
  const { products, offers } = useMemo(() => buildCatalog(), []);
  const still = useMemo(() => reducedMotion(), []);
  const [stage, setStage] = useState<Stage>(still ? 3 : 0);
  const [typed, setTyped] = useState(still ? Infinity : 0);
  const [cycle, setCycle] = useState(0);
  const req = t(REQ, lang);

  useEffect(() => {
    if (still) return;
    const ids: number[] = [];
    setStage(0);
    setTyped(0);
    AT.forEach((ms, i) => { if (i > 0) ids.push(window.setTimeout(() => setStage(i as Stage), ms)); });
    for (let i = 1; i <= req.length; i++) ids.push(window.setTimeout(() => setTyped(i), 120 + i * 55));
    ids.push(window.setTimeout(() => setCycle((c) => c + 1), LOOP));
    return () => ids.forEach(window.clearTimeout);
  }, [cycle, still, req]);

  const pick = products[PICK];
  const pickOffer = Object.values(offers).filter((o) => o.productId === PICK).sort((a, b) => a.price - b.price)[0];

  return (
    <div className={`picks st-${stage}`} aria-hidden>
      <div className="picks-tilt">
        <div className="picks-req">
          <Mark size={14} phase={stage >= 1 && stage < 4 ? 'busy' : stage === 4 ? 'done' : 'idle'} />
          <span>{req.slice(0, typed)}{stage === 0 && <i className="caret" />}</span>
          <b className={`picks-cart ${stage === 4 ? 'on' : ''}`}>{t(TXT.cart, lang)} {stage === 4 ? 1 : 0}</b>
        </div>
        <ul className="picks-grid">
          {SHELF.map((id, i) => {
            const p = products[id];
            const state = stage < 1 ? '' : !MATCH.has(id) ? 'out' : id === OVER && stage >= 2 ? 'out over' : id === PICK && stage >= 3 ? 'pick' : stage >= 2 ? 'in' : '';
            const src = photoUrl(id, 360);
            return (
              <li key={id} className={`pk ${state}`} style={{ '--i': i } as CSSProperties}>
                {src && <img src={src} alt="" loading="eager" />}
                <span className="pk-p">{money(p.price, lang)}</span>
                {stage >= 2 && MATCH.has(id) && (
                  <span className={`pk-tag ${id === OVER ? 'warn' : ''}`}>{t(id === OVER ? TXT.over : TXT.match, lang)}</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className={`picks-ask ${stage >= 3 ? 'on' : ''} ${stage === 4 ? 'done' : ''}`}>
          {thumb(PICK) && <img src={thumb(PICK)!} alt="" />}
          <div className="pa-m">
            <p className="pa-q">{t(stage === 4 ? TXT.added : TXT.ask, lang)}</p>
            <p className="pa-n">{t(pick.name, lang)}</p>
            <p className="pa-s">{pick.brand} · {money(pickOffer?.price ?? pick.price, lang)} · {t(TXT.free, lang)}</p>
          </div>
          <div className="pa-b">
            <span className={`pa-add ${stage === 4 ? 'ok' : ''}`}>{stage === 4 ? '✓' : t(TXT.add, lang)}</span>
            {stage < 4 && <span className="pa-skip">{t(TXT.skip, lang)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const thumb = (id: string) => photoUrl(id, 160);
