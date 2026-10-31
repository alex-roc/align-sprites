import type { SpriteResult, Warning } from '../../../core/types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { hrefFor } from '../../route.ts';
import { useApp } from '../../state/context.ts';
import type { Asset } from '../../state/types.ts';
import type { Fix } from '../common/Warnings.tsx';

const up32 = (n: number) => Math.ceil(n / 32) * 32;

/** Maps a core warning to the setting change that fixes it (or a guide link). */
export function useSpriteFixes(asset: Asset, result: SpriteResult): (w: Warning) => Fix | null {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const g = state.global;
  const patchG = (p: Partial<typeof g>) => dispatch({ type: 'global/patch', patch: p });

  return (w) => {
    const p = w.params ?? {};
    switch (w.key) {
      case 'warn.clipped': {
        if (!g.cellAuto) return { label: t('fix.autoCell'), onClick: () => patchG({ cellAuto: true }) };
        const px = Number(p.px) || 1;
        const cw = up32(result.sheet.cell.w + px);
        const ch = up32(result.sheet.cell.h + px);
        return { label: t('fix.cellTo', { w: cw, h: ch }), onClick: () => patchG({ cellAuto: false, cellW: cw, cellH: ch }) };
      }
      case 'warn.frameCount':
        return { label: t('fix.grid'), onClick: () => dispatch({ type: 'asset/patch', id: asset.id, patch: { seg: { ...asset.seg, mode: 'grid' } } }) };
      case 'warn.noFrames':
        return { label: t('fix.lowerTolerance'), onClick: () => dispatch({ type: 'asset/patch', id: asset.id, patch: { bg: { ...asset.bg, tolerance: Math.min(60, asset.bg.tolerance + 12) } } }) };
      case 'warn.animRange':
        return { label: t('fix.resetAnims'), onClick: () => dispatch({ type: 'asset/patch', id: asset.id, patch: { anims: [{ ...asset.anims[0], name: 'default', frames: '', fps: 8, loop: true }] } }) };
      case 'warn.bigDownscale':
        return { label: t('fix.learnMore'), href: hrefFor('guide', 'generate') };
      case 'warn.noGrid':
        return { label: t('fix.cartoon'), onClick: () => patchG({ mode: 'cartoon' }) };
      case 'warn.upscale': {
        const from = Number(p.from);
        const to = Number(p.to);
        if (!from || !to) return null;
        const k = Math.max(1, Math.round(to / from));
        return { label: t('fix.height', { px: from * k }), onClick: () => patchG({ targetHeight: from * k }) };
      }
      default:
        return null;
    }
  };
}
