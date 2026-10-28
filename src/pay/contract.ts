// 서버 함수(api/pay/*.ts)가 Node ESM으로 직접 불러오므로 의존성 없이 쓴다

/**
 * 토스페이먼츠 테스트 결제의 계약. 서버와 클라이언트(결제 창)가 같은 파일을 쓴다.
 * 가격은 브라우저 안의 시뮬레이션 쇼핑몰이 정하므로 서버는 상품 가격을 모른다.
 * 대신 사람이 Nod에서 승인한 금액에 서명해 두고, 토스가 돌려준 금액이 그 서명과 같을 때만 승인한다(R4).
 */

/** 토스 결제창(구버전 payment) 결과. 결제 창 → 원래 화면으로 BroadcastChannel로 보낸다. */
export type PayResult =
  | { orderId: string; status: 'paid'; method: string; approvedAt: string; receiptUrl?: string }
  | { orderId: string; status: 'canceled' }
  | { orderId: string; status: 'failed'; message: string };

export const CHANNEL = 'nod-pay';

/** 한 번에 결제할 수 있는 금액 범위(원). 테스트 결제라도 말이 안 되는 금액은 받지 않는다. */
export const MIN_AMOUNT = 100;
export const MAX_AMOUNT = 10_000_000;
/** 서명이 유효한 시간. 결제창을 열어 두고 이보다 오래 있으면 다시 승인받는다. */
export const TOKEN_TTL_MS = 30 * 60 * 1000;

export const validAmount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= MIN_AMOUNT && (n as number) <= MAX_AMOUNT;

/** 토스 규칙: 영문·숫자·-·_·=로 6~64자 */
export const ORDER_ID = /^[A-Za-z0-9_=-]{6,64}$/;

export function makeOrderId(rand: () => string = () => crypto.randomUUID()) {
  return `nod-${rand().replace(/-/g, '').slice(0, 24)}`;
}

/** 결제창에 보이는 주문명. "울 코트 외 2건" (토스 상한 100자) */
export function orderNameOf(names: string[]) {
  const first = (names[0] ?? 'Nod 주문').trim();
  const name = names.length > 1 ? `${first} 외 ${names.length - 1}건` : first;
  return name.slice(0, 100);
}

/** 실제 돈이 나가는 키는 받지 않는다. 테스트 키만 test_로 시작한다. */
export const isTestKey = (k: string | undefined): k is string => !!k && k.startsWith('test_');

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer | Uint8Array) => {
  let s = '';
  for (const x of new Uint8Array(b)) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

const hmac = async (secret: string, data: string) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
};

interface Claim { o: string; a: number; e: number }

/** 사람이 승인한 주문번호와 금액에 서명한다 */
export async function signApproval(secret: string, orderId: string, amount: number, now = Date.now()) {
  const body = b64url(enc.encode(JSON.stringify({ o: orderId, a: amount, e: now + TOKEN_TTL_MS } satisfies Claim)));
  return `${body}.${await hmac(secret, body)}`;
}

export type Verdict = { ok: true } | { ok: false; reason: 'bad-token' | 'expired' | 'order-mismatch' | 'amount-mismatch' };

/** 토스가 돌려준 주문번호·금액이 승인한 것과 같은지 본다. 하나라도 다르면 토스에 승인을 요청하지 않는다. */
export async function verifyApproval(secret: string, token: string, orderId: string, amount: number, now = Date.now()): Promise<Verdict> {
  const [body, sig] = token.split('.');
  if (!body || !sig || (await hmac(secret, body)) !== sig) return { ok: false, reason: 'bad-token' };
  let c: Claim;
  try { c = JSON.parse(fromB64url(body)) as Claim; } catch { return { ok: false, reason: 'bad-token' }; }
  if (now > c.e) return { ok: false, reason: 'expired' };
  if (c.o !== orderId) return { ok: false, reason: 'order-mismatch' };
  if (c.a !== amount) return { ok: false, reason: 'amount-mismatch' };
  return { ok: true };
}

/** 서명 키. 토스 시크릿 키에서 파생해 환경 변수를 하나 덜 쓴다. */
export const signingSecret = (tossSecret: string) => `nod-pay:${tossSecret}`;
