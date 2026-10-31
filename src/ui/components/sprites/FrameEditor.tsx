import { useI18n } from '../../../i18n/index.ts';
import type { FrameEditor as Editor } from './useFrameEditor.ts';

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Actions on the selected frame: reorder inside the animation, duplicate, remove, and nudge a few px. */
export function FrameEditor({ editor, pos, count, onMove, onDuplicate, onRemove }: {
  editor: Editor;
  pos: number;
  count: number;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const off = editor.offset;
  const nudged = off.dx !== 0 || off.dy !== 0;
  const dis = !editor.canEdit;
  const arrow = (label: string, glyph: string, dx: number, dy: number) => (
    <button type="button" className="btn btn-sm btn-icon" disabled={dis} onClick={() => editor.push(dx, dy)} aria-label={label} title={label}>
      {glyph}
    </button>
  );
  return (
    <div className="fed" role="group" aria-label={t('fed.label')}>
      <p className="fed-title">
        <strong>{t('fed.frame', { n: editor.frame ?? pos })}</strong>
        <span className="muted"> {t('fed.position', { pos: pos + 1, count })}</span>
      </p>
      <div className="fed-groups">
        <div className="fed-group" role="group" aria-label={t('fed.order')}>
          <button type="button" className="btn btn-sm" disabled={dis || pos === 0} onClick={() => onMove(-1)}>{t('fed.moveLeft')}</button>
          <button type="button" className="btn btn-sm" disabled={dis || pos >= count - 1} onClick={() => onMove(1)}>{t('fed.moveRight')}</button>
          <button type="button" className="btn btn-sm" disabled={dis} onClick={onDuplicate}>{t('fed.duplicate')}</button>
          <button type="button" className="btn btn-sm" disabled={dis || count < 2} onClick={onRemove}>{t('fed.remove')}</button>
        </div>
        <div className="fed-group" role="group" aria-label={t('fed.nudge')}>
          <span className="field-label">{t('fed.nudge')}</span>
          {arrow(t('fed.nudgeUp'), '↑', 0, -1)}
          {arrow(t('fed.nudgeDown'), '↓', 0, 1)}
          {arrow(t('fed.nudgeLeft'), '←', -1, 0)}
          {arrow(t('fed.nudgeRight'), '→', 1, 0)}
          <span className="fed-off" aria-live="polite">x {signed(off.dx)}, y {signed(off.dy)} px</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={dis || !nudged} onClick={editor.resetPush}>{t('fed.reset')}</button>
        </div>
      </div>
      <p className="hint">{t('fed.keys')}</p>
    </div>
  );
}
