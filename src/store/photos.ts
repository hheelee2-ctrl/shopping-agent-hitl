// Unsplash 무료 라이선스 이미지. 상품(가상)과 실제 관계 없음 — 분위기용.
// 색·소재는 완전히 일치하지 않을 수 있어, 카드는 이미지 위에 상품 정보를 텍스트로 항상 함께 보여준다.
type Photo = { id: string; by: string };

const P: Record<string, Photo> = {
  c1: { id: '1779153249388-5b80de105ec7', by: 'ola szkolda' },
  c2: { id: '1619603364937-8d7af41ef206', by: 'Taras Chernus' },
  c3: { id: '1683642765591-2370edc15193', by: 'Mohammad Hossein Mirzagol' },
  c4: { id: '1781454230007-7c4beb40d34b', by: 'Margo Evardson' },
  c5: { id: '1579921562939-d9cc7a7dbd8e', by: 'Seyi Ariyo' },
  j1: { id: '1665407415286-2b29719f0daa', by: 'Petr Urbanek' },
  j2: { id: '1617114919297-3c8ddb01f599', by: 'Mohamad Khosravi' },
  j3: { id: '1544022613-e87ca75a784a', by: 'Toa Heftiba' },
  j4: { id: '1516257984-b1b4d707412e', by: 'Isaac Ramirez' },
  j5: { id: '1773259592395-144b30949978', by: 'Ndagire' },
  j6: { id: '1633821879282-0c4e91f96232', by: 'Dane Moukao' },
  s1: { id: '1544441892-794166f1e3be', by: 'Mukesh Naik' },
  s2: { id: '1608229751021-ed4bd8677753', by: 'The DK Photography' },
  s3: { id: '1600269452121-4f2416e55c28', by: 'Jeff Tumale' },
  s4: { id: '1597350584914-55bb62285896', by: 'Brian Hall' },
  s5: { id: '1720019315323-5e2b98a58ba8', by: 'Grailify' },
  l1: { id: '1784822041003-504771076494', by: 'McFollis' },
  l2: { id: '1676121270762-47c8d3a7b9d5', by: 'Nelibar Shoes' },
  l3: { id: '1760616172899-0681b97a2de3', by: 'taha siddiqui' },
  k1: { id: '1631541909061-71e349d1f203', by: 'Toa Heftiba' },
  k2: { id: '1752486268240-0507bb1ebc7e', by: 'Nice M Nshuti' },
  k3: { id: '1643015862949-5c8d15a4242e', by: 'Ruta Gudeliene' },
  k4: { id: '1611312449297-a69dc9c3987b', by: 'Caio Coelho' },
  sh1: { id: '1603252110481-7ba873bf42ab', by: 'Nimble Made' },
  sh2: { id: '1602810316693-3667c854239a', by: 'Nimble Made' },
  sh3: { id: '1562157873-818bc0726f68', by: 'Md Salman' },
  sh4: { id: '1642764873855-934ed87e79e1', by: 'farhad chaudhary' },
  pt1: { id: '1761726065663-6e550c25a6ef', by: "Bien'arts" },
  pt2: { id: '1633963643586-1a39077623be', by: 'Hamed darzi' },
  pt3: { id: '1789110520148-bb52ba37759b', by: 'engin akyurt' },
  pt4: { id: '1714030282710-4f003762bfb1', by: 'sattar kazemi' },
  b1: { id: '1705909237050-7a7625b47fac', by: 'Mobina Ghazazani' },
  b2: { id: '1473188588951-666fce8e7c68', by: 'Álvaro Serrano' },
  b3: { id: '1591534577302-1696205bb2bc', by: 'Yucel M' },
};

export const photoUrl = (productId: string, w = 640): string | null => {
  const p = P[productId];
  return p ? `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${w}&h=${w}&q=70` : null;
};
export const photoCredit = (productId: string): string | null => P[productId]?.by ?? null;
