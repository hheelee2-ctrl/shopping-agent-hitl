import type { CSSProperties } from 'react';
import type { Lang, StyleProfile } from '../engine/types';
import { COLOR_L, MATERIAL_L, MOOD_L } from '../store/labels';
import { photoUrl } from '../store/photos';
import { MAX_MOODS, cleanProfile, isEmptyProfile } from '../store/taste';
import { MOODS, type Color, type Material, type Mood } from '../store/types';
import { ST, t } from './copy';
import { Icon } from './Icon';

/** 무드 타일의 대표 사진. 그 무드 태그가 붙은 실제 상품이다. */
const MOOD_PHOTO: Record<Mood, string> = { minimal: 'k4', casual: 'j4', formal: 'j2', street: 's2', classic: 'c2', outdoor: 'j1' };
const COLORS = Object.keys(COLOR_L) as Color[];
/** 고르는 소재. 울 혼방은 울에 포함되고, 카탈로그에 없는 소재는 보여주지 않는다. */
const MATERIALS: Material[] = ['wool', 'cashmere', 'cotton', 'leather', 'denim', 'nylon', 'canvas'];

export const EMPTY_STYLE: StyleProfile = { moods: [], likeColors: [], avoidColors: [], avoidMaterials: [] };

const KEY = 'nod.style';
/** 저장된 내 스타일. 한 번도 정하지 않았으면 null (빈 프로필로 건너뛴 것도 저장된 것으로 본다). */
export function loadStyle(): StyleProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanProfile(JSON.parse(raw)) : null;
  } catch { return null; }
}
export function saveStyle(v: StyleProfile) {
  try { localStorage.setItem(KEY, JSON.stringify(cleanProfile(v))); } catch { /* 저장 불가 환경은 무시 */ }
}

/** '미니멀·클래식 · 블랙 · 피함: 브라운, 레더' */
export function styleSummary(v: StyleProfile, lang: Lang): string {
  if (isEmptyProfile(v)) return t(ST.empty, lang);
  const sep = lang === 'ko' ? '·' : ', ';
  const parts: string[] = [];
  if (v.moods.length) parts.push(v.moods.map((m) => t(MOOD_L[m as Mood], lang)).join(sep));
  if (v.likeColors.length) parts.push(v.likeColors.map((c) => t(COLOR_L[c as Color], lang)).join(sep));
  const avoid = [...v.avoidColors.map((c) => t(COLOR_L[c as Color], lang)), ...v.avoidMaterials.map((m) => (m === 'wool' ? t(ST.woolNote, lang) : t(MATERIAL_L[m as Material], lang)))];
  if (avoid.length) parts.push(`${lang === 'ko' ? '피함' : 'Avoid'}: ${avoid.join(sep)}`);
  return parts.join(' · ');
}

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

/** 무드 타일: 사진 + 짧은 이름. 최대 3개, 다 고르면 나머지는 잠긴다. compact면 사진 없이 글자 칩. */
export function MoodPicker({ lang, value, onChange, compact }: { lang: Lang; value: StyleProfile; onChange: (v: StyleProfile) => void; compact?: boolean }) {
  const full = value.moods.length >= MAX_MOODS;
  return (
    <ul className={`moods ${compact ? 'compact' : ''}`} aria-label={t(ST.steps[0].t, lang)}>
      {MOODS.map((m, i) => {
        const on = value.moods.includes(m);
        const src = photoUrl(MOOD_PHOTO[m], 320);
        return (
          <li key={m} style={{ '--i': i } as CSSProperties}>
            <button
              type="button" className={`mood ${on ? 'on' : ''}`} aria-pressed={on} disabled={!on && full}
              onClick={() => onChange({ ...value, moods: toggle(value.moods, m) })}
            >
              {!compact && <span className="mood-ph">{src && <img src={src} alt="" />}</span>}
              <span className="mood-n">{t(MOOD_L[m], lang)}</span>
              {on && <span className="mood-ck" aria-hidden><Icon name="check" size={12} /></span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** 색 칩 한 줄. 같은 색을 반대쪽에서 고르면 그쪽에서 빠진다. */
function ColorRow({ lang, label, picked, other, onPick }: { lang: Lang; label: string; picked: string[]; other: string[]; onPick: (c: Color) => void }) {
  return (
    <div className="crow">
      <p className="label">{label}</p>
      <div className="cchips" role="group" aria-label={label}>
        {COLORS.map((c) => (
          <button key={c} type="button" className={`cchip ${picked.includes(c) ? 'on' : ''} ${other.includes(c) ? 'other' : ''}`} aria-pressed={picked.includes(c)} onClick={() => onPick(c)}>
            <i style={{ background: `var(--cc-${c})` }} aria-hidden />
            {t(COLOR_L[c], lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({ lang, value, onChange }: { lang: Lang; value: StyleProfile; onChange: (v: StyleProfile) => void }) {
  const like = (c: Color) => onChange({ ...value, likeColors: toggle(value.likeColors, c), avoidColors: value.avoidColors.filter((x) => x !== c) });
  const avoid = (c: Color) => onChange({ ...value, avoidColors: toggle(value.avoidColors, c), likeColors: value.likeColors.filter((x) => x !== c) });
  return (
    <div className="cpick">
      <ColorRow lang={lang} label={t(ST.like, lang)} picked={value.likeColors} other={value.avoidColors} onPick={like} />
      <ColorRow lang={lang} label={t(ST.avoid, lang)} picked={value.avoidColors} other={value.likeColors} onPick={avoid} />
    </div>
  );
}

export function MaterialPicker({ lang, value, onChange }: { lang: Lang; value: StyleProfile; onChange: (v: StyleProfile) => void }) {
  return (
    <div className="crow">
      <p className="label">{t(ST.avoidMat, lang)}</p>
      <div className="cchips" role="group" aria-label={t(ST.avoidMat, lang)}>
        {MATERIALS.map((m) => {
          const on = value.avoidMaterials.includes(m);
          return (
            <button key={m} type="button" className={`cchip mat ${on ? 'on' : ''}`} aria-pressed={on}
              onClick={() => onChange({ ...value, avoidMaterials: toggle(value.avoidMaterials, m) })}>
              {m === 'wool' ? t(ST.woolNote, lang) : t(MATERIAL_L[m], lang)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 에이전트 패널 설정 안에서 쓰는 한 화면 편집기 (사진 없이) */
export function StyleProfileEditor({ lang, value, onChange }: { lang: Lang; value: StyleProfile; onChange: (v: StyleProfile) => void }) {
  return (
    <div className="style-ed">
      <div>
        <p className="label">{t(ST.title, lang)} <span className="muted">{t(ST.moodMax, lang)}</span></p>
        <MoodPicker lang={lang} value={value} onChange={onChange} compact />
      </div>
      <ColorPicker lang={lang} value={value} onChange={onChange} />
      <MaterialPicker lang={lang} value={value} onChange={onChange} />
    </div>
  );
}
