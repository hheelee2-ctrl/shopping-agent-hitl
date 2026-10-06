import type { Lang } from '../engine/types';
import { arrivalLabel, returnLabel, sellerOf, type Seller } from '../store/sellers';
import type { Ranked } from '../store/store';
import { SV, money, t } from './copy';
import { Icon } from './Icon';

/** 판매처 표식: 종류별 색의 원 안에 첫 글자. 이름 없이도 같은 판매처를 알아보게 한다. */
export function SellerBadge({ s, lang, size = 22 }: { s: Seller; lang: Lang; size?: number }) {
  const ch = t(s.name, lang).replace(/^[^A-Za-z가-힣0-9]+/, '').charAt(0);
  return <span className={`sb sb-${s.kind}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }} aria-hidden>{ch}</span>;
}

/** 겹쳐 놓은 판매처 표식 + "3곳" */
export function SellerStack({ ids, lang }: { ids: string[]; lang: Lang }) {
  return (
    <span className="sstack">
      <span className="sstack-b">{ids.slice(0, 4).map((id) => <SellerBadge key={id} s={sellerOf(id)} lang={lang} size={20} />)}</span>
    </span>
  );
}

/** 배송·도착·반품을 아이콘과 짧은 값으로 */
export function Terms({ shipping, arriveAt, now, s, lang, compact }: { shipping: number; arriveAt: number; now: number; s: Seller; lang: Lang; compact?: boolean }) {
  return (
    <ul className={`terms ${compact ? 'compact' : ''}`}>
      <li><Icon name="ship" size={15} />{shipping <= 0 ? t(SV.freeShip, lang) : money(shipping, lang)}</li>
      <li><Icon name="arrive" size={15} />{t(arrivalLabel(arriveAt, now), lang).replace(/ 도착$/, '').replace(/^Arrives /, '')}</li>
      {!compact && <li className={s.returnDays === null ? 'bad' : ''}><Icon name={s.returnDays === null ? 'noReturn' : 'return'} size={15} />{t(returnLabel(s), lang)}</li>}
    </ul>
  );
}

/**
 * 판매처별 총액 비교 막대. 판매가(진한 부분)와 배송비(옅은 부분)를 이어 붙여, 표시가가 싸도 배송비로 뒤집히는 걸 한눈에 보인다.
 * 가장 싼 국내 판매처는 초록, 해외직구는 회색으로 뒤에 둔다.
 */
export function PriceBars({ rows, lang, chosen, onPick }: {
  rows: Ranked[]; lang: Lang; chosen?: string; onPick?: (sellerId: string) => void;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.landed));
  const min = Math.min(...rows.map((r) => r.offer.price));
  const floor = min * 0.8;
  const span = Math.max(1, max - floor);
  const w = (v: number) => `${(((v - floor) / span) * 100).toFixed(1)}%`;
  const best = rows.find((r) => !r.seller.overseas)?.offer.sellerId;
  return (
    <ol className="pbars" aria-label={t(SV.landed, lang)}>
      {rows.map((r) => {
        const on = (chosen ?? best) === r.offer.sellerId;
        const body = (
          <>
            <span className="pb-who"><SellerBadge s={r.seller} lang={lang} size={20} /><span>{t(r.seller.name, lang)}</span></span>
            <span className="pb-bar" aria-hidden>
              <i className="pb-price" style={{ width: w(r.offer.price) }} />
              {r.shipping > 0 && <i className="pb-ship" style={{ left: w(r.offer.price), width: `calc(${w(r.landed)} - ${w(r.offer.price)})` }} />}
            </span>
            <span className="pb-sum">{r.offer.sellerId === best && <em>{t(SV.best, lang)}</em>}<b>{money(r.landed, lang)}</b></span>
          </>
        );
        return (
          <li key={r.offer.sellerId} className={`${on ? 'on' : ''} ${r.seller.overseas ? 'abroad' : ''}`}>
            {onPick ? <button type="button" className="pb-row" aria-pressed={on} onClick={() => onPick(r.offer.sellerId)}>{body}</button> : <div className="pb-row">{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}
