import { GAME_RESOLUTIONS, SCREENS, integerScaleTo } from '../../../core/kit/level.ts';
import { useI18n } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { useApp } from '../../state/context.ts';

/** Game resolution chips and the table of sizes that go together (tile, character, whole-number scale to the screen). */
export function ResolutionField() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const current = state.global.gameRes;
  return (
    <>
      <div className="chips" role="group" aria-label={t('kit.resTitle')}>
        {GAME_RESOLUTIONS.map((r) => (
          <button key={r.w} type="button" className={cx('chip', 'is-32', r.w === current && 'is-on')} aria-pressed={r.w === current} onClick={() => dispatch({ type: 'global/patch', patch: { gameRes: r.w } })}>
            {r.w}×{r.h}
          </button>
        ))}
      </div>
      <table className="res-table" aria-label={t('kit.resTable')}>
        <thead>
          <tr>
            <th scope="col">{t('kit.resColGame')}</th>
            <th scope="col">{t('kit.resColTile')}</th>
            <th scope="col">{t('kit.resColCharacter')}</th>
            <th scope="col">{t('kit.resColHd')}</th>
            <th scope="col">{t('kit.resColUhd')}</th>
          </tr>
        </thead>
        <tbody>
          {GAME_RESOLUTIONS.map((r) => (
            <tr key={r.w} className={cx(r.w === current && 'is-on')}>
              <th scope="row">{r.w}×{r.h}</th>
              <td>{r.tile}</td>
              <td>{r.character[0]}–{r.character[1]}</td>
              {SCREENS.map(([name, w]) => {
                const k = integerScaleTo(r, w);
                return <td key={name}>{k ? `×${k}` : '–'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">{t('kit.resNote')}</p>
    </>
  );
}
