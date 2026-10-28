import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../engine/types';
import type { Account } from '../auth/auth';

/** 헤더의 계정: 이름 대신 동그란 사진(없으면 첫 글자). 누르면 이름과 로그아웃이 나온다. */
export function AccountMenu({ account, lang, onSignOut }: { account: Account; lang: Lang; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const initial = [...account.name.trim()][0]?.toUpperCase() ?? '?';
  return (
    <div className="acct" ref={box}>
      <button className="acct-btn" aria-haspopup="menu" aria-expanded={open} aria-label={lang === 'ko' ? `${account.name} 계정` : `${account.name} account`} onClick={() => setOpen((o) => !o)}>
        {account.avatar ? <img src={account.avatar} alt="" referrerPolicy="no-referrer" /> : <span aria-hidden>{initial}</span>}
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <p className="acct-name">{account.name}</p>
          <button role="menuitem" className="acct-out" onClick={() => { setOpen(false); onSignOut(); }}>{lang === 'ko' ? '로그아웃' : 'Sign out'}</button>
        </div>
      )}
    </div>
  );
}
