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

const EXPORTERS: Record<ExportTarget, (r: SpriteResult) => ExportFile[]> = {
  godot: godotSpriteFrames,
  gdevelop: gdevelopFrames,
  kaplay: kaplaySnippet,
  generic: genericExport,
};

/** All requested targets for all results, prefixed `<target>/`. Results whose names collide get a numeric suffix. */
export function buildExport(results: SpriteResult[], targets: ExportTarget[]): ExportFile[] {
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
      for (const f of EXPORTERS[target](r)) files.push({ path: `${target}/${f.path}`, data: f.data });
    }
  }
  return files;
}
