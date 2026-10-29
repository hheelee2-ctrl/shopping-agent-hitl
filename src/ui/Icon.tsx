import { ArrowCounterClockwise, CalendarCheck, Check, Clock, Globe, Handbag, Prohibit, Storefront, Truck, type Icon as PIcon } from '@phosphor-icons/react';

/** Nod 아이콘. 사이트 전체가 Phosphor 한 가족만 쓴다(랜딩·앱 같은 선 굵기). 의미가 정해진 몇 개만 둔다. */
export type IconName = 'ship' | 'arrive' | 'return' | 'store' | 'check' | 'globe' | 'noReturn' | 'bag' | 'clock';

const P: Record<IconName, PIcon> = {
  ship: Truck,
  arrive: CalendarCheck,
  return: ArrowCounterClockwise,
  noReturn: Prohibit,
  store: Storefront,
  check: Check,
  globe: Globe,
  bag: Handbag,
  clock: Clock,
};

export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  const I = P[name];
  return <I className={`ic ${className}`} size={size} weight="regular" aria-hidden />;
}
