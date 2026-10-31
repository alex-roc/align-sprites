// Game kit: every sprite and tile output of a session in one export, organised per engine.
import type { TileAtlasResult } from '../tiles/index.ts';
import type { ExportFile, ExportTarget, SpriteResult, TileSetResult } from '../types.ts';

export interface KitInput {
  sprites: SpriteResult[];
  atlas?: { result: TileAtlasResult; name: string };
  terrain?: { result: TileSetResult; name: string; names: [string, string] };
}

/**
 * One file list for one engine: `<target>/sprites/...` (the usual sprite export for that target) and
 * `<target>/tiles/...` (Godot: TileSet .tres; GDevelop/other: atlas PNG + Tiled .tsx; Kaplay: atlas PNG +
 * snippet), plus `<target>/README.txt` (en + es) listing the kit: tile size, sprite heights, palette.
 */
export function buildKitExport(kit: KitInput, target: ExportTarget): ExportFile[] {
  void kit; void target;
  throw new Error('not implemented');
}
