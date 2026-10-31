import { PALETTES } from '../../core/palette/index.ts';
import { useI18n } from '../../i18n/index.ts';
import type { GlobalSettings } from './types.ts';

/** One-line description of the palette choice (fold summary, kit summary). */
export function usePaletteSummary(): (g: GlobalSettings) => string {
  const { t } = useI18n();
  return (g) => {
    if (g.mode === 'cartoon') return t('palette.original');
    const p = g.palette;
    if (p.kind === 'reduce') return t('palette.reduceN', { n: g.maxColors });
    if (p.kind === 'preset') return PALETTES.find((x) => x.id === p.id)?.name ?? p.id;
    if (p.kind === 'custom') return t('palette.customN', { n: g.customColors.length });
    if (p.kind === 'image') return t('palette.imageN', { n: p.colors.length });
    return t('palette.original');
  };
}
