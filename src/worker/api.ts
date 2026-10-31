// Contract between the UI and the processing worker (exposed with Comlink).
import type { ArtMode, EdgeStyle, ExportTarget, RGBAImage, SpriteJob, SpriteResult, TileLayout, TileSetResult } from '../core/types.ts';
import type { TileAtlasOptions, TileAtlasResult } from '../core/tiles/index.ts';

/** Cut lines used to slice a tile sheet. confidence is null when the user fixed cols × rows. */
export interface TileGridInfo {
  cols: number;
  rows: number;
  xCuts: number[];
  yCuts: number[];
  confidence: number | null;
}

export interface TileAtlasOutput {
  result: TileAtlasResult;
  grid: TileGridInfo;
}

export interface AtlasExportTargets {
  godot: boolean;
  tiled: boolean;
  png: boolean;
}

export interface TerrainOutput {
  set: TileSetResult;
  /** The textures reduced to exact T×T tiles (what the compositor really used). */
  tileA: RGBAImage;
  tileB: RGBAImage | null;
  /** Wrap quality: ~1 = seamless, > 1.8 = visible seams when tiled. */
  seamA: number;
  seamB: number | null;
}

export interface PipelineApi {
  /** Run jobs as one batch (shared scale + palette). Images are transferred, not copied. */
  runBatch(jobs: SpriteJob[]): Promise<SpriteResult[]>;
  /** Build the export ZIP for the given results and engines. */
  buildZip(results: SpriteResult[], targets: ExportTarget[]): Promise<Uint8Array>;
  /** Detect background colour quickly (for the UI swatch). */
  detectBackground(img: RGBAImage): Promise<{ color: [number, number, number, number]; confidence: number }>;

  /** Normalize an AI tile sheet to an atlas of exact T×T tiles. */
  normalizeTiles(img: RGBAImage, o: TileAtlasOptions): Promise<TileAtlasOutput>;
  /** ZIP of a normalized atlas: godot/<name>/ (.tres), tiled/<name>/ (.tsx) and/or <name>.png. */
  buildAtlasZip(result: TileAtlasResult, name: string, targets: AtlasExportTargets): Promise<Uint8Array>;
  /** Terrain transition tile set (blob47 / dual16). b = null paints A over transparency. Keeps the textures for previews. */
  composeTerrain(a: RGBAImage, b: RGBAImage | null, tileSize: number, layout: TileLayout, style: EdgeStyle, mode: ArtMode): Promise<TerrainOutput>;
  /** Renders a 0/1 test map (w×h cells, 1 = B) with the textures and style of the last composeTerrain call. */
  renderTerrainPreview(cells: Uint8Array, w: number, h: number): Promise<RGBAImage>;
  /** ZIP of a terrain set: <name>/<name>.png + .tres + README.txt. */
  buildTerrainZip(set: TileSetResult, name: string, names: [string, string]): Promise<Uint8Array>;
}
