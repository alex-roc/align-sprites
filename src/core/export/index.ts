// Exporters: one ZIP with a folder per engine target. Paths inside the zip: `<target>/<name>/...`.
import type { ExportFile, ExportTarget, SpriteResult } from '../types.ts';
import { slug } from './common.ts';
import { genericExport } from './generic.ts';
import { gdevelopFrames } from './gdevelop.ts';
import { godotSpriteFrames } from './godot.ts';
import { kaplaySnippet } from './kaplay.ts';

export { encodePng, decodePng } from './png.ts';
export { zipFiles } from './zip.ts';
export { slug } from './common.ts';
export { godotSpriteFrames, gdevelopFrames, kaplaySnippet, genericExport };

export interface ExportOptions {
  /** Put each target in its own `<target>/` folder. Default: only when exporting several targets. */
  prefix?: boolean;
  /** GDevelop: also the Piskel spritesheet strips (off by default). */
  gdevelopSpritesheets?: boolean;
}

const EXPORTERS: Record<ExportTarget, (r: SpriteResult, o: ExportOptions) => ExportFile[]> = {
  godot: (r) => godotSpriteFrames(r),
  gdevelop: (r, o) => gdevelopFrames(r, { spritesheets: o.gdevelopSpritesheets }),
  kaplay: (r) => kaplaySnippet(r),
  generic: (r) => genericExport(r),
};

/**
 * All requested targets for all results; with several targets each one goes in a `<target>/` folder (a one-engine
 * ZIP is already named after its engine). Results whose names collide get a numeric suffix.
 */
export function buildExport(results: SpriteResult[], targets: ExportTarget[], opts: ExportOptions = {}): ExportFile[] {
  const prefix = opts.prefix ?? targets.length > 1;
  const used = new Set<string>();
  const named = results.map((r) => {
    const base = slug(r.name);
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
    used.add(name);
    return name === r.name ? r : { ...r, name };
  });
  const files: ExportFile[] = [];
  for (const target of targets) {
    for (const r of named) {
      for (const f of EXPORTERS[target](r, opts)) files.push({ path: prefix ? `${target}/${f.path}` : f.path, data: f.data });
    }
  }
  return files;
}
