import type { Lang, SizeProfile } from '../engine/types';
import { DEFAULT_PROFILE } from '../store/catalog';
import { SIZE_SETS } from '../store/types';
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

/** 상의·신발·하의 사이즈를 한 번 정해두는 편집기. 비워두면 에이전트가 담기 전에 묻는다. */
export function SizeProfileEditor({ lang, value, onChange, disabled }: Props) {
  return (
    <div className="sizes">
      {KINDS.map((k) => (
        <div key={k} className="sizes-row">
          <span className="sizes-k">{t(SZ.kind[k], lang)}</span>
          <Seg
            options={[...SIZE_SETS[k].map((z) => ({ value: z, label: z })), { value: '', label: t(SZ.none, lang) }]}
            value={value[k] ?? ''}
            onChange={(v) => onChange({ ...value, [k]: v || undefined })}
            label={t(SZ.kind[k], lang)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
