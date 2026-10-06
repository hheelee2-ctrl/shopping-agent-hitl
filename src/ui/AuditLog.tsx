import type { Lang } from '../engine/types';
import type { LogEntry, Phase } from '../state/console';
import { C, TH, t } from './copy';

interface Props {
  lang: Lang;
  log: LogEntry[];
  phase: Phase;
  cartIds: Set<string>;
  onUndo: (id: string) => void;
}

const STATUS = {
  running: C.statusRunning,
  'awaiting-approval': C.statusWaiting,
  done: C.statusDone,
  failed: C.statusFailed,
};

export function AuditLog({ lang, log, phase, cartIds, onUndo }: Props) {
  const canUndo = phase === 'payment-gate' || phase === 'cancelled' || phase === 'done';
  return (
    <details className="audit">
      <summary>{t(TH.log, lang)}{log.length > 0 && <span className="cnt">{log.length}</span>}</summary>
      {log.length === 0 ? (
        <p className="note">{t(C.auditEmpty, lang)}</p>
      ) : (
        <ul className="log">
          {log.map((l) => {
            const pid = l.itemIds?.[0];
            const inCart = pid ? cartIds.has(pid) : false;
            const ordered = l.undoable && !l.undone && phase === 'done';
            const removed = l.undoable && !l.undone && !ordered && !inCart;
            const status = l.undone ? C.undone : ordered ? C.ordered : removed ? C.removedByYou : STATUS[l.status];
            return (
              <li key={l.id} className={l.status}>
                <div className={`t ${l.undone || removed ? 'undone' : ''}`}>{t(l.label, lang)}</div>
                <div className="s">{t(status, lang)}</div>
                {l.note && <div className="nt">{t(l.note, lang)}</div>}
                {l.undoBlocked && <div className="blocked">{t(l.undoBlocked, lang)}</div>}
                {l.undoable && !l.undone && !removed && canUndo && !ordered && (
                  <button className="btn sm" onClick={() => onUndo(l.id)}>{t(C.undo, lang)}</button>
                )}
                {ordered && canUndo && !l.undoBlocked && (
                  <button className="btn sm" onClick={() => onUndo(l.id)}>{t(C.undo, lang)}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
