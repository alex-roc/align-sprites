import type { SpriteResult } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { rgbToHex } from '../../lib/image.ts';

const fmt = (n: number, d = 2) => String(Number(n.toFixed(d)));

export function Diagnostics({ result }: { result: SpriteResult }) {
  const { t, tw } = useI18n();
  const { diag, sheet } = result;
  const { grid, palette, warnings } = diag;
  return (
    <div className="diag">
      <dl>
        <dt>{t('diag.frames')}</dt>
        <dd>{diag.regions.length}</dd>
        <dt>{t('diag.scale')}</dt>
        <dd>{fmt(diag.scale, 3)}×</dd>
        {sheet.mode === 'pixel' && (
          <>
            <dt>{t('diag.period')}</dt>
            <dd>{grid ? `${fmt(grid.periodX)} × ${fmt(grid.periodY)} px` : t('diag.noGrid')}</dd>
          </>
        )}
        <dt>{t('diag.refHeight')}</dt>
        <dd>{fmt(diag.refHeight, 1)} px</dd>
        <dt>{t('diag.cell')}</dt>
        <dd>{sheet.cell.w}×{sheet.cell.h} px</dd>
      </dl>
      {palette && palette.length > 0 && (
        <div>
          <span className="field-label">{t('diag.palette', { count: palette.length })}</span>
          <div className="palette">
            {palette.map((c, i) => (
              <span key={i} className="checker palette-sw" title={rgbToHex(c)}>
                <i style={{ background: `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})` }} />
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <span className="field-label">{t('diag.warnings')}</span>
        {warnings.length ? (
          <ul className="warnings">
            {warnings.map((w, i) => (
              <li key={i}>{tw(w)}</li>
            ))}
          </ul>
        ) : (
          <p className="ok">{t('diag.noWarnings')}</p>
        )}
      </div>
    </div>
  );
}
