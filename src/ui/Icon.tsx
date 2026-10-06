/** Nod 아이콘. 24 격자, 1.6 선, 둥근 끝. 의미가 정해진 몇 개만 둔다. */
export type IconName = 'ship' | 'arrive' | 'return' | 'store' | 'check' | 'globe' | 'noReturn' | 'bag' | 'clock';

const P: Record<IconName, string> = {
  ship: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01',
  arrive: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4M9 14l2 2 4-4',
  return: 'M9 7H5V3M5 7a8 8 0 1 1-1 7',
  noReturn: 'M9 7H5V3M5 7a8 8 0 1 1-1 7M4 4l16 16',
  store: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 7v5l3 2',
};

export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`ic ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={P[name]} />
    </svg>
  );
}
