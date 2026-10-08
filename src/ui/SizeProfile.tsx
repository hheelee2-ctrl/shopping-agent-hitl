import type { Lang, SizeProfile } from '../engine/types';
import { DEFAULT_PROFILE } from '../store/catalog';
import { SIZE_COMMON, SIZE_SETS } from '../store/types';
import { SZ, t } from './copy';
import { Seg } from './Seg';

export const DEFAULT_SIZES: SizeProfile = DEFAULT_PROFILE;
const KINDS = ['top', 'shoe', 'bottom'] as const;

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
