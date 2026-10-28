import { CHANNEL, type PayResult } from './contract';
import { confirmPayment, isCancel } from './toss';
import './pay.css';

/**
 * 토스 테스트 결제 창(pay.html). 모바일에서만 Nod 화면이 팝업으로 연다(데스크톱은 Nod 화면 위에 결제창을 띄운다).
 * 결제창은 모바일에서 페이지를 이동시키므로, 이동은 이 창 안에서만 일어나고 Nod 화면(장바구니·에이전트)은 그대로 남는다.
 *   1) 처음: 주소의 #o(주문번호)·a(금액)·n(주문명)·k(클라이언트 키)·t(승인 서명)를 받아 토스 결제창을 연다
 *   2) 토스가 성공 주소로 돌려보내면(?paymentKey=) 서버에서 금액을 대조해 승인한다
 *   3) 결과를 Nod 화면에 보내고 창을 닫는다
 */

const KO = {
  opening: ['결제창을 여는 중', '토스페이먼츠 테스트 결제예요. 실제로 돈이 나가지 않아요.'],
  confirming: ['결제를 확인하는 중', 'Nod에서 승인한 금액과 같은지 확인하고 있어요.'],
  paid: ['결제했어요', '이 창은 곧 닫혀요. Nod 화면으로 돌아가 주세요.'],
  canceled: ['결제하지 않았어요', '이 창은 곧 닫혀요. 장바구니는 그대로예요.'],
  failed: ['결제하지 못했어요', ''],
  broken: ['결제 정보를 찾지 못했어요', 'Nod 화면에서 다시 결제를 승인해 주세요.'],
} as const;
const EN: Record<keyof typeof KO, readonly [string, string]> = {
  opening: ['Opening the payment window', 'This is a Toss Payments test. No real money moves.'],
  confirming: ['Checking the payment', 'Making sure the amount matches what you approved in Nod.'],
  paid: ['Paid', 'This window will close. Head back to Nod.'],
  canceled: ['Not paid', 'This window will close. Your cart is unchanged.'],
  failed: ['Payment failed', ''],
  broken: ['Payment details missing', 'Approve the payment again in Nod.'],
};

const store = (() => { try { return sessionStorage; } catch { return null; } })();
const lang = store?.getItem('nod-pay:lang') === 'en' || new URLSearchParams(location.hash.slice(1)).get('l') === 'en' ? 'en' : 'ko';
const say = (k: keyof typeof KO, extra?: string) => {
  const [title, sub] = (lang === 'en' ? EN : KO)[k];
  document.getElementById('title')!.textContent = title;
  document.getElementById('sub')!.textContent = extra || sub;
};

const ch = new BroadcastChannel(CHANNEL);
const finish = (r: PayResult, k: keyof typeof KO, extra?: string) => {
  ch.postMessage(r);
  say(k, extra);
  store?.removeItem(`nod-pay:${r.orderId}`);
  setTimeout(() => window.close(), r.status === 'failed' ? 2500 : 900);
};

async function open(h: URLSearchParams) {
  const [orderId, amount, orderName, clientKey, token] = ['o', 'a', 'n', 'k', 't'].map((x) => h.get(x) ?? '');
  if (!orderId || !clientKey || !token || !window.TossPayments) return say('broken');
  store?.setItem(`nod-pay:${orderId}`, token);
  store?.setItem('nod-pay:current', orderId);
  store?.setItem('nod-pay:lang', lang);
  history.replaceState(null, '', location.pathname); // 서명을 주소창에 남기지 않는다
  const back = `${location.origin}${location.pathname}`;
  try {
    await window.TossPayments(clientKey).payment({ customerKey: window.TossPayments.ANONYMOUS }).requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: Number(amount) },
      orderId,
      orderName,
      successUrl: back,
      failUrl: back,
      windowTarget: 'self',
    });
  } catch (e) {
    if (isCancel(e)) finish({ orderId, status: 'canceled' }, 'canceled');
    else finish({ orderId, status: 'failed', message: (e as Error).message ?? '' }, 'failed', (e as Error).message);
  }
}

async function confirm(q: URLSearchParams) {
  const orderId = q.get('orderId') ?? '';
  const token = store?.getItem(`nod-pay:${orderId}`);
  if (!token) return finish({ orderId, status: 'failed', message: 'no-token' }, 'broken');
  say('confirming');
  const r = await confirmPayment({ paymentKey: q.get('paymentKey') ?? '', orderId, amount: Number(q.get('amount')), token });
  if (r.status === 'paid') finish(r, 'paid');
  else finish(r, 'failed', r.status === 'failed' ? r.message : undefined);
}

const q = new URLSearchParams(location.search);
if (q.has('paymentKey')) void confirm(q);
else if (q.has('code')) {
  // 사용자가 결제창을 닫으면(PAY_PROCESS_CANCELED) 토스는 orderId를 돌려주지 않는다
  const orderId = q.get('orderId') ?? store?.getItem('nod-pay:current') ?? '';
  if (q.get('code') === 'PAY_PROCESS_CANCELED') finish({ orderId, status: 'canceled' }, 'canceled');
  else finish({ orderId, status: 'failed', message: q.get('message') ?? q.get('code') ?? '' }, 'failed', q.get('message') ?? undefined);
} else void open(new URLSearchParams(location.hash.slice(1)));
