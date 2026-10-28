import type { Lang } from '../engine/types';
import { TH, t } from './copy';

/** 테스트 결제 띠. 결제 카드·장바구니 결제 위에 둔다(토스 결제창이 진짜처럼 보여도 실제 결제로 오해하지 않게) */
export function TestPay({ lang }: { lang: Lang }) {
  return <p className="test-pay"><b>{t(TH.testPay, lang)}</b><span>{t(TH.testPayNote, lang)}</span></p>;
}
