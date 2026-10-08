import type { Lang, SizeProfile } from '../engine/types';
import { DEFAULT_PROFILE } from '../store/catalog';
import { SIZE_COMMON, SIZE_SETS } from '../store/types';
import { SZ, t } from './copy';
import { Seg } from './Seg';

export const DEFAULT_SIZES: SizeProfile = DEFAULT_PROFILE;
const KINDS = ['top', 'shoe', 'bottom'] as const;

const KEY = 'nod.sizes';
/** 저장해 둔 내 사이즈. 없거나 읽을 수 없으면 null. 체계에 없는 사이즈는 버린다. */
export function loadSizes(): SizeProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SizeProfile;
    return Object.fromEntries(KINDS.filter((k) => v[k] && SIZE_SETS[k].includes(v[k]!)).map((k) => [k, v[k]]));
  } catch { return null; }
}
export function saveSizes(v: SizeProfile) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 불가 환경은 무시 */ }
}
export const sizeSummary = (v: SizeProfile, lang: Lang) =>
  KINDS.map((k) => `${t(SZ.kind[k], lang)} ${v[k] ?? t(SZ.none, lang)}`).join(' · ');

interface Props {
  lang: Lang;
  value: SizeProfile;
  onChange: (v: SizeProfile) => void;
  disabled?: boolean;
}

/**
 * 상의·신발·하의 사이즈를 한 번 정해두는 편집기. 비워두면 에이전트가 담기 전에 묻는다.
 * 많이 고르는 사이즈는 바로 누르고, 나머지는 '다른 사이즈' 드롭다운에서 고른다.
 */
export function SizeProfileEditor({ lang, value, onChange, disabled }: Props) {
  return (
    <div className="sizes">
      {KINDS.map((k) => {
        const v = value[k] ?? '';
        const common = SIZE_COMMON[k];
        const other = v && !common.includes(v) ? v : '';
        const set = (z: string) => onChange({ ...value, [k]: z || undefined });
        return (
          <div key={k} className="sizes-row">
            <span className="sizes-k">{t(SZ.kind[k], lang)}</span>
            <div className="sizes-ctl">
              <Seg
                options={[...common.map((z) => ({ value: z, label: z })), { value: '', label: t(SZ.none, lang) }]}
                value={other ? '__other' : v}
                onChange={set}
                label={t(SZ.kind[k], lang)}
                disabled={disabled}
              />
              <label className={`size-more ${other ? 'on' : ''}`}>
                <span className="sr-only">{t(SZ.other, lang)}</span>
                <select value={other} disabled={disabled} onChange={(e) => set(e.target.value)} aria-label={`${t(SZ.kind[k], lang)} ${t(SZ.other, lang)}`}>
                  <option value="">{t(SZ.other, lang)}</option>
                  {SIZE_SETS[k].map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
