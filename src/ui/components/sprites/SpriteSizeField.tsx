import { useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { nearestHeight } from '../../lib/size.ts';
import { SPRITE_HEIGHTS } from '../../persist.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import { NumberInput } from '../common/Field.tsx';

/** Native heights of the batch in output px (the finished result when there is one, the upload estimate before). */
function nativeHeights(state: ReturnType<typeof useApp>['state']): number[] {
  return state.assets
    .map((a) => state.run.results[a.id]?.diag.refHeight || a.detected?.sourceHeight || 0)
    .map((h) => Math.round(h))
    .filter((h) => h > 0);
}

/** Sprite height presets (shared by every image) with its equivalence in game tiles and the "different heights" fix. */
export function SpriteSizeField() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const [other, setOther] = useState(false);
  const set = (targetHeight: number | null) => dispatch({ type: 'global/patch', patch: { targetHeight } });
  const h = g.targetHeight;
  const isOther = other || (h !== null && !SPRITE_HEIGHTS.includes(h));

  const heights = nativeHeights(state);
  const sorted = [...heights].sort((a, b) => a - b);
  const differ = h === null && state.assets.length > 1 && sorted.length > 1 && sorted[sorted.length - 1] / sorted[0] > 1.15;
  const median = sorted[Math.floor(sorted.length / 2)];
  const common = differ ? nearestHeight(median) : 0;
  const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format([...new Set(sorted)].map(String));
  const tiles = h === null ? null : Number((h / g.gameTile).toFixed(2));

  return (
    <div className="sub">
      <p className="hint">{t('size.spriteWhy')}</p>
      <div className="chips" role="group" aria-label={t('size.sprite')}>
        <button type="button" className={cx('chip', h === null && 'is-on')} aria-pressed={h === null} onClick={() => { setOther(false); set(null); }}>
          {t('size.original')}
        </button>
        {SPRITE_HEIGHTS.map((p) => (
          <button key={p} type="button" className={cx('chip', !isOther && p === h && 'is-on')} aria-pressed={!isOther && p === h} onClick={() => { setOther(false); set(p); }}>
            {p}
          </button>
        ))}
        <button type="button" className={cx('chip', isOther && 'is-on')} aria-pressed={isOther} onClick={() => { setOther(true); if (h === null) set(48); }}>
          {t('size.other')}
        </button>
        {isOther && h !== null && <NumberInput value={h} min={4} max={1024} onChange={set} className="num-sm" aria-label={t('size.otherPx')} />}
      </div>
      {tiles !== null && (
        <p className="hint">
          {t(tiles === 1 ? 'size.tilesOne' : 'size.tiles', { n: tiles.toLocaleString(lang), tile: g.gameTile })}{' '}
          <a href={hrefFor('kit')}>{t('size.tilesChange')}</a>
        </p>
      )}
      {differ && (
        <div className="notice" role="status">
          <span>{t('size.differ', { list })}</span>
          <button type="button" className="btn btn-sm" onClick={() => set(common)}>{t('size.differFix', { px: common })}</button>
        </div>
      )}
      {h === null && !differ && state.assets.length > 1 && <p className="hint">{t('size.originalBatch')}</p>}
    </div>
  );
}
