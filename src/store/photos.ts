// 상품 사진은 흰 배경 단독 제품컷(public/products/<id>.jpg, 600x800)이다. 옷이 주인공이 되도록 모델 없이 같은 조명·구도로 맞췄다.
// 제품컷이 없는 가방 두 개(b1, b5)만 Unsplash 사진(무료 라이선스)을 쓴다. 실존 브랜드 로고가 드러나는 사진은 쓰지 않는다.
type Photo = { id: string; by: string };

const UNSPLASH: Record<string, Photo> = {
  b1: { id: '1614179689702-355944cd0918', by: 'Laura Chouette' },
  b5: { id: '1620786514684-ff35b5aae55e', by: 'Maryam Nemati' },
};

/** 카드와 같은 3:4로 받는다. w는 화면 폭의 2배 기준(레티나). */
export const photoUrl = (productId: string, w = 720): string | null => {
  const p = UNSPLASH[productId];
  return p ? `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${w}&h=${Math.round((w * 4) / 3)}&q=80` : `/products/${productId}.jpg`;
};
/** Unsplash 사진만 작가를 밝힌다 */
export const photoCredit = (productId: string): string | null => UNSPLASH[productId]?.by ?? null;
