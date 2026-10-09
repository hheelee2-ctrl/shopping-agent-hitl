// Unsplash 무료 라이선스 이미지. 국내 쇼핑몰처럼 모델컷보다 제품컷(옷걸이·플랫레이·누끼·디테일) 위주로 골랐다.
// 상품(가상)과 실제 관계 없고, 실존 브랜드 로고가 드러나는 사진은 뺐다.
// 색·소재는 완전히 일치하지 않을 수 있어, 카드는 이미지 위에 상품 정보를 텍스트로 항상 함께 보여준다.
type Photo = { id: string; by: string };

const P: Record<string, Photo> = {
  c1: { id: '1639270601211-9265bafae0f9', by: 'steph washi' },
  c2: { id: '1722858958066-97deb3471c89', by: 'Lisa Anna' },
  c3: { id: '1648458461360-d2e724ac5321', by: 'Emre ÇOBAN' },
  c4: { id: '1722859031306-4c81e8d83957', by: 'Lisa Anna' },
  c5: { id: '1658418818804-adc6dc129ac2', by: 'nkosie MAPHUMULO' },
  j1: { id: '1624548140129-74786c5f1279', by: 'Bulbul Ahmed' },
  j2: { id: '1784749615306-10675f31bae2', by: 'Alexander Mass' },
  j3: { id: '1591047139829-d91aecb6caea', by: 'Tobias Tullius' },
  j4: { id: '1611312449408-fcece27cdbb7', by: 'Caio Coelho' },
  j5: { id: '1739384879592-79903b12b2a6', by: 'philippe wehrli' },
  j6: { id: '1740650874524-4f57a78e5878', by: 'Robert Richman' },
  s1: { id: '1586556694812-fdae68467216', by: 'Yucel M' },
  s2: { id: '1556812191-381c7e7d96d6', by: 'The DK Photography' },
  s3: { id: '1608379743498-ac08f6d022ba', by: 'The DK Photography' },
  s4: { id: '1547586877-0351a7143cbe', by: 'Nikolai Chernichenko' },
  s5: { id: '1621665421571-2d325f9c7c6a', by: 'Ervan M Wirawan' },
  l1: { id: '1649503376979-25d9ce7df3ea', by: 'Davide Zacchello' },
  l2: { id: '1676121270762-47c8d3a7b9d5', by: 'Nelibar Shoes' },
  l3: { id: '1570800493677-12a7ad3d4d86', by: 'Amirreza Tavassoli' },
  k1: { id: '1633943934209-31b7f3775fee', by: 'Kateryna Hliznitsova' },
  k2: { id: '1635447272203-92e6fdf27245', by: 'Sama Hosseini' },
  k3: { id: '1621198059871-0d5f9b449233', by: 'Shelter' },
  k4: { id: '1635447272615-a414b7ea1df4', by: 'Sama Hosseini' },
  sh1: { id: '1761896902115-49793a359daf', by: 'Vooglam Eyewear' },
  sh2: { id: '1441035430039-1c421470b6c0', by: 'Angelina Litvin' },
  sh3: { id: '1691053318576-4bf08315e877', by: 'tian dayong' },
  sh4: { id: '1642764873855-934ed87e79e1', by: 'farhad chaudhary' },
  pt1: { id: '1718252540511-e958742e4165', by: 'TuanAnh Blue' },
  pt2: { id: '1714143164072-7646ef5cb24d', by: 'TuanAnh Blue' },
  pt3: { id: '1711443813147-def27861b9af', by: 'saeed karimi' },
  pt4: { id: '1789110520148-bb52ba37759b', by: 'engin akyurt' },
  b1: { id: '1614179689702-355944cd0918', by: 'Laura Chouette' },
  b2: { id: '1574365569389-a10d488ca3fb', by: 'Brando Makes Branding' },
  b3: { id: '1581605405669-fcdf81165afa', by: 'Luis Quintero' },
};

export const photoUrl = (productId: string, w = 640): string | null => {
  const p = P[productId];
  return p ? `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${w}&h=${w}&q=70` : null;
};
export const photoCredit = (productId: string): string | null => P[productId]?.by ?? null;
