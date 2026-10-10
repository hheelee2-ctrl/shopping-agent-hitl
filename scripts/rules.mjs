// 승인 설계 규칙 게이트: 테스트 이름의 [R1] 같은 태그를 세어 규칙마다 테스트 수를 남긴다.
// describe에 붙은 태그는 그 안의 모든 it에, it에 붙은 태그는 그 테스트에만 적용된다.
// 테스트가 하나도 없는 규칙이 있으면 실패한다. 결과는 src/rules.counts.json (리뷰 모드·플레이북이 읽는다).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RULES = readFileSync('src/rules.ts', 'utf8').match(/id: '(R\d+)'/g).map((m) => m.slice(5, -1));
const count = Object.fromEntries(RULES.map((r) => [r, 0]));
const files = [];
const walk = (d) => readdirSync(d).forEach((n) => { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : /\.test\.ts$/.test(n) && files.push(p); });
walk('src');

const tagsOf = (line) => [...line.matchAll(/\[(R\d+)\]/g)].map((m) => m[1]);
for (const f of files) {
  const stack = []; // [indent, tags]
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const d = line.match(/^(\s*)describe\(\s*'([^']*)'/);
    if (d) { while (stack.length && stack[stack.length - 1][0] >= d[1].length) stack.pop(); stack.push([d[1].length, tagsOf(d[2])]); continue; }
    const t = line.match(/^(\s*)it(?:\.each\([^)]*\))?\(\s*'([^']*)'/);
    if (t) {
      while (stack.length && stack[stack.length - 1][0] >= t[1].length) stack.pop();
      const tags = new Set([...stack.flatMap((s) => s[1]), ...tagsOf(t[2])]);
      for (const r of tags) if (r in count) count[r]++;
    }
  }
}
writeFileSync('src/rules.counts.json', JSON.stringify(count, null, 2) + '\n');
const empty = RULES.filter((r) => count[r] === 0);
if (empty.length) { console.error(`테스트가 없는 승인 규칙: ${empty.join(', ')}`); process.exit(1); }
console.log('check:rules OK', JSON.stringify(count));
