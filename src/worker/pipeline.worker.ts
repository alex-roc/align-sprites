// Comlink worker implementing PipelineApi: heavy processing stays off the UI thread.
import * as Comlink from 'comlink';
import { detectBackground } from '../core/bg/index.ts';
import { buildExport, encodePng, slug, zipFiles } from '../core/export/index.ts';
import { findDuplicateFrames } from '../core/frames/index.ts';
import { inspectImage } from '../core/inspect/index.ts';
import { itemsExport, normalizeItems } from '../core/items/index.ts';
import { buildKitExport } from '../core/kit/index.ts';
import { paletteFromImage } from '../core/palette/index.ts';
import { buildParallax, parallaxExport } from '../core/parallax/index.ts';
import { runBatch } from '../core/pipeline/index.ts';
import { unfakeFromUrl, type UnfakeCore } from '../core/pixel/unfake.ts';
import {
  composeTransitions, detectTileGrid, gridCutsFor, normalizeTileAtlas, prepareTerrain, renderTerrainMap, seamScore, terrainExport,
  tileAtlasGodot, tileAtlasTiled, type TerrainKit,
} from '../core/tiles/index.ts';
import type { ExportFile, RGBA8, RGBAImage, SpriteResult } from '../core/types.ts';
import wasmUrl from '../vendor/unfake/unfake_wasm_bg.wasm?url';
import type { PipelineApi, TileGridInfo } from './api.ts';

let corePromise: Promise<UnfakeCore> | null = null;

/** Load the unfake WASM once; a failed load can be retried. */
function getCore(): Promise<UnfakeCore> {
  corePromise ??= unfakeFromUrl(wasmUrl).catch((e: unknown) => {
    corePromise = null;
    throw e;
  });
  return corePromise;
}

/** Every distinct pixel buffer of the results, so they are transferred instead of copied. */
function resultBuffers(results: SpriteResult[]): ArrayBuffer[] {
  const set = new Set<ArrayBuffer>();
  for (const r of results) {
    set.add(r.sheet.image.data.buffer as ArrayBuffer);
    for (const f of r.frames) set.add(f.data.buffer as ArrayBuffer);
  }
  return [...set];
}

/** Textures + style of the last composeTerrain call, so the test-map preview does not resend the images. */
interface TerrainParams {
  a: Parameters<PipelineApi['composeTerrain']>[0];
  b: Parameters<PipelineApi['composeTerrain']>[1];
  tileSize: number;
  style: Parameters<PipelineApi['composeTerrain']>[4];
  mode: Parameters<PipelineApi['composeTerrain']>[5];
  palette: RGBA8[] | undefined;
}
let terrainParams: TerrainParams | null = null;
let terrainKit: TerrainKit | null = null;

async function coreFor(mode: 'pixel' | 'cartoon'): Promise<UnfakeCore | null> {
  return mode === 'pixel' ? getCore() : null;
}

const api: PipelineApi = {
  async runBatch(jobs) {
    const core = jobs.some((j) => j.mode === 'pixel') ? await getCore() : null;
    const results = runBatch(core, jobs);
    return Comlink.transfer(results, resultBuffers(results));
  },
  async buildZip(results, targets, opts) {
    const zip = zipFiles(buildExport(results, targets, opts));
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },
  async detectBackground(img) {
    return detectBackground(img);
  },

  async inspect(img, mode) {
    return inspectImage(img, mode);
  },
  async paletteFromImage(img, max) {
    return paletteFromImage(await getCore(), img, max);
  },
  async findDuplicates(frames) {
    return findDuplicateFrames(frames);
  },
  async buildKitZip(kit, target) {
    const zip = zipFiles(buildKitExport(kit, target));
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },

  async normalizeTiles(img, o, palette) {
    const core = await coreFor(o.mode);
    const result = normalizeTileAtlas(core, img, palette?.length ? { ...o, palette } : o);
    let grid: TileGridInfo;
    if (o.cols && o.rows) {
      const cuts = gridCutsFor(img, o.cols, o.rows);
      grid = { cols: o.cols, rows: o.rows, ...cuts, confidence: null };
    } else {
      const g = detectTileGrid(img);
      grid = { cols: g.cols, rows: g.rows, xCuts: g.xCuts, yCuts: g.yCuts, confidence: g.confidence };
    }
    return Comlink.transfer({ result, grid }, [result.atlas.data.buffer as ArrayBuffer]);
  },
  async buildAtlasZip(result, name, targets) {
    const files: ExportFile[] = [];
    const prefixed = (prefix: string, list: ExportFile[]) => list.forEach((f) => files.push({ ...f, path: `${prefix}/${f.path}` }));
    if (targets.godot) prefixed('godot', tileAtlasGodot(result, name));
    if (targets.tiled) prefixed('tiled', tileAtlasTiled(result, name));
    if (targets.png) {
      files.push({ path: `${slug(name)}.png`, data: encodePng(result.atlas) });
    }
    const zip = zipFiles(files);
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },
  async composeTerrain(a, b, tileSize, layout, style, mode, palette) {
    const core = await coreFor(mode);
    terrainParams = { a, b, tileSize, style, mode, palette };
    terrainKit = null;
    const set = composeTransitions(core, a, b, tileSize, layout, style, mode, { palette });
    const kit = prepareTerrain(core, a, b, tileSize, style, mode, palette);
    terrainKit = kit;
    // The kit keeps its tiles for the preview, so they travel as copies; only the atlas is transferred.
    const copy = (img: RGBAImage): RGBAImage => ({ ...img, data: img.data.slice() });
    const tileA = copy(kit.tileA);
    const tileB = kit.tileB ? copy(kit.tileB) : null;
    const out = { set, tileA, tileB, seamA: seamScore(kit.tileA), seamB: kit.tileB ? seamScore(kit.tileB) : null };
    const buffers = [set.atlas.data.buffer as ArrayBuffer, tileA.data.buffer as ArrayBuffer];
    if (tileB) buffers.push(tileB.data.buffer as ArrayBuffer);
    return Comlink.transfer(out, buffers);
  },
  async renderTerrainPreview(cells, w, h) {
    if (!terrainParams) throw new Error('No terrain composed yet');
    if (!terrainKit) {
      const p = terrainParams;
      terrainKit = prepareTerrain(await coreFor(p.mode), p.a, p.b, p.tileSize, p.style, p.mode, p.palette);
    }
    const img = renderTerrainMap(terrainKit, cells, w, h);
    return Comlink.transfer(img, [img.data.buffer as ArrayBuffer]);
  },
  async buildTerrainZip(set, name, names) {
    const zip = zipFiles(terrainExport(set, name, names));
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },
  async normalizeItems(img, o, palette) {
    const result = normalizeItems(await coreFor(o.mode), img, palette?.length ? { ...o, palette } : o);
    return Comlink.transfer(result, [result.atlas.data.buffer as ArrayBuffer]);
  },
  async buildItemsZip(result, name, names, targets) {
    const zip = zipFiles(itemsExport(result, name, names, targets));
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },

  async buildParallax(inputs, o) {
    const result = buildParallax(await coreFor(o.mode), inputs, o);
    return Comlink.transfer(result, result.layers.map((l) => l.image.data.buffer as ArrayBuffer));
  },
  async buildParallaxZip(result, name, targets) {
    const zip = zipFiles(parallaxExport(result, name, targets));
    return Comlink.transfer(zip, [zip.buffer as ArrayBuffer]);
  },
};

Comlink.expose(api);
