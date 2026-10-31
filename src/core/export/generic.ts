// Generic export: spritesheet + Aseprite "hash" JSON + one PNG per frame.
import type { ExportFile, SpriteResult } from '../types.ts';
import { animFrames, animSlugs, frameRect, isCenter, r2, sheetOrigin, sheetPng, slug } from './common.ts';
import { encodePng } from './png.ts';

interface AseFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  duration: number;
}

/**
 * Generic: `<name>.png` + `<name>.json` in Aseprite "hash" format (frames, meta.frameTags, meta.size) + per-frame PNGs.
 * Extra `meta` fields (ignored by Aseprite readers): `anchor` ('feet' | 'center'), `origin` (the pivot, cell px) and,
 * when the sheet has one, `collision` ({x, y, w, h} in cell px, same for every frame).
 */
export function genericExport(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  const slugs = animSlugs(sheet.anims);
  const frames: Record<string, AseFrame> = {};
  const tags: { name: string; from: number; to: number; direction: string }[] = [];
  const imgs = animFrames(r);
  const o = sheetOrigin(sheet);
  const files: ExportFile[] = [{ path: `${name}.png`, data: sheetPng(r) }];

  // Frame indices are contiguous in the JSON (anim after anim), even if the sheet rows have gaps.
  let index = 0;
  sheet.anims.forEach((a, k) => {
    const from = index;
    const duration = Math.round(1000 / Math.max(a.fps, 0.001));
    for (let i = 0; i < a.count; i++) {
      const rc = frameRect(sheet, a.row, i);
      frames[`${name} ${index}.png`] = {
        frame: rc,
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: rc.w, h: rc.h },
        sourceSize: { w: rc.w, h: rc.h },
        duration,
      };
      const digits = Math.max(2, String(Math.max(0, a.count - 1)).length);
      files.push({ path: `frames/${name}/${slugs[k]}_${String(i).padStart(digits, '0')}.png`, data: encodePng(imgs[k]![i]!) });
      index++;
    }
    if (a.count > 0) tags.push({ name: a.name, from, to: index - 1, direction: 'forward' });
  });

  const json = {
    frames,
    meta: {
      app: 'align-sprites',
      image: `${name}.png`,
      format: 'RGBA8888',
      size: { w: sheet.image.width, h: sheet.image.height },
      scale: '1',
      frameTags: tags,
      anchor: isCenter(sheet) ? 'center' : 'feet',
      origin: { x: o.x, y: o.y },
      ...(sheet.collision ? { collision: { x: r2(sheet.collision.x), y: r2(sheet.collision.y), w: r2(sheet.collision.w), h: r2(sheet.collision.h) } } : {}),
    },
  };
  files.push({ path: `${name}.json`, data: JSON.stringify(json, null, 2) + '\n' });
  return files;
}
