// AI가 만든 UI 코드 게이트: 토큰 파일 밖에서 색상 리터럴 사용 금지.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const ALLOWED = new Set(['src/styles/tokens.css']);
const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const bad = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(css|tsx?)$/.test(name) && !ALLOWED.has(relative('.', p))) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (COLOR.test(line)) bad.push(`${p}:${i + 1}  ${line.trim()}`);
        COLOR.lastIndex = 0;
      });
    }
  }
}
walk(ROOT);
if (bad.length) {
  console.error('색상 리터럴은 src/styles/tokens.css 에서만 정의한다:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('check:tokens OK');
