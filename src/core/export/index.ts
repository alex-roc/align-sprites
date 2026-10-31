// Exporters: one ZIP with a folder per engine target. Paths inside the zip: `<target>/<name>/...`.
import type { ExportFile, ExportTarget, RGBAImage, SpriteResult } from '../types.ts';

/** PNG encode (fast-png). */
export function encodePng(img: RGBAImage): Uint8Array {
  void img;
  throw new Error('not implemented');
}

/** PNG decode (fast-png) → straight RGBA8 (expand grey/RGB/palette/16-bit to RGBA8). */
export function decodePng(bytes: Uint8Array): RGBAImage {
  void bytes;
  throw new Error('not implemented');
}

/** Zip (fflate zipSync, no compression for PNGs, deflate for text). */
export function zipFiles(files: ExportFile[]): Uint8Array {
  void files;
  throw new Error('not implemented');
}

/**
 * Godot 4: `<name>.png`, `<name>.tres` (SpriteFrames, AtlasTexture per frame, relative path, no uid),
 * `<name>.tscn` (AnimatedSprite2D, centered=false, offset=(-floor(w/2), -(h-1-padBottom)) so the origin is at the feet,
 * texture_filter=1 in pixel mode, autoplay first anim). Plus README.txt (en + es).
 */
export function godotSpriteFrames(r: SpriteResult): ExportFile[] {
  void r;
  throw new Error('not implemented');
}

/** GDevelop 5: `<name>/<anim>/<anim>_00.png…` + README.txt (en + es) with import steps, origin point and fps. */
export function gdevelopFrames(r: SpriteResult): ExportFile[] {
  void r;
  throw new Error('not implemented');
}

/** Kaplay: `<name>.png` + `<name>.js` snippet (loadSprite with sliceX/sliceY/anims, anchor("bot")). */
export function kaplaySnippet(r: SpriteResult): ExportFile[] {
  void r;
  throw new Error('not implemented');
}

/** Generic: `<name>.png` + `<name>.json` in Aseprite "hash" format (frames, meta.frameTags, meta.size) + per-frame PNGs. */
export function genericExport(r: SpriteResult): ExportFile[] {
  void r;
  throw new Error('not implemented');
}

/** All requested targets for all results, prefixed `<target>/`. */
export function buildExport(results: SpriteResult[], targets: ExportTarget[]): ExportFile[] {
  void results; void targets;
  throw new Error('not implemented');
}
