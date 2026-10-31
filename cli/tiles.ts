// `tiles` (atlas), `terrain` (transitions), `items` (icons atlas) and `parallax` (looping layers).
import { encodePng, slug } from '../src/core/export/index.ts';
import { inspectImage } from '../src/core/inspect/index.ts';
import { itemsExport, normalizeItems, type ItemsOptions } from '../src/core/items/index.ts';
import { buildParallax, defaultFactors, parallaxExport, wantsCutout } from '../src/core/parallax/index.ts';
import {
  composeTransitions, defaultEdgeStyle, normalizeTileAtlas, terrainExport, tileAtlasGodot, tileAtlasTiled,
  type TileAtlasOptions,
} from '../src/core/tiles/index.ts';
import type { ArtMode, BgOptions, ExportFile, RGBAImage } from '../src/core/types.ts';
import {
  CliError, UsageError, baseName, flag, int, loadCore, loadImage, mode, num, oneOf, parse, parseGrid, parseTargets, printJson,
  printWarnings, reportOutput, resolvePalette, str, tw, type Values,
} from './common.ts';

/** `--bg none|auto|global|flood` → BgOptions (undefined = leave the background alone), as the Tiles tab builds it. */
function tileBg(v: Values, img: RGBAImage, artMode: ArtMode): BgOptions | undefined {
  const opt = oneOf(v, 'bg', ['auto', 'none', 'global', 'flood'], 'auto');
  if (opt === 'none') return undefined;
  const strategy = opt === 'auto' ? inspectImage(img, artMode).bg.strategy : opt;
  const bg: BgOptions = { color: 'auto', tolerance: num(v, 'tolerance') ?? 25, strategy, minHole: 16 };
  if (artMode === 'cartoon') {
    bg.soft = { inner: 10, outer: 40 };
    bg.despill = true;
  }
  return bg;
}

const names = (text: string | undefined): string[] => (text ? text.split(',').map((s) => s.trim()) : []);
const outOf = (v: Values, fallback: string): string => str(v, 'out') ?? fallback;

const COMMON_BG = `  --bg auto|none|global|flood   remove the background first (default auto: by colour; none keeps the image as is)
  --tolerance N                 background tolerance, ΔE (default 25)`;

// ---------------------------------------------------------------- tiles

const TILES_USAGE = `Usage: align-sprites tiles <atlas.png> [options]

Cuts a tile sheet (an AI image with tiles separated by gutters) into an atlas of exact tile x tile cells.

  --tile N                tile size in px (default 32)
  --grid RxC              ROWS x COLS of the sheet (default: detect the gutters)
  --mode pixel|cartoon    (default pixel)
${COMMON_BG}
  --palette P / --colors N   fixed palette (pico-8, sweetie-16, endesga-32, game-boy, file.hex|gpl|txt) or N shared colours
  --format F              godot (.tres TileSet), tiled (.tsx: GDevelop, Tiled, LDtk), png, or all (default all)
  --name N                export name (default: file name)
  --out PATH              directory or file.zip (default ./align-sprites-out)
  --json                  print the summary as JSON`;

const TILES_OPTS = {
  tile: { type: 'string' }, grid: { type: 'string' }, mode: { type: 'string' }, bg: { type: 'string' }, tolerance: { type: 'string' },
  palette: { type: 'string' }, colors: { type: 'string' }, format: { type: 'string' }, name: { type: 'string' }, out: { type: 'string' },
  json: { type: 'boolean' },
} as const;

export async function tilesCommand(argv: string[]): Promise<void> {
  const parsed = parse(argv, TILES_OPTS, TILES_USAGE);
  if (!parsed) return;
  const { v, pos } = parsed;
  if (pos.length !== 1) throw new UsageError(`tiles: expected one image\n\n${TILES_USAGE}`);
  const artMode = mode(v);
  const img = loadImage(pos[0]);
  const name = slug(str(v, 'name') ?? baseName(pos[0]));
  const grid = str(v, 'grid') ? parseGrid(str(v, 'grid')!) : null;
  const palette = artMode === 'pixel' ? resolvePalette(str(v, 'palette')) : undefined;
  const colors = int(v, 'colors') ?? 0;
  const formats = oneOf(v, 'format', ['godot', 'tiled', 'png', 'all'], 'all');
  const o: TileAtlasOptions = {
    tileSize: int(v, 'tile') ?? 32,
    cols: grid?.cols,
    rows: grid?.rows,
    mode: artMode,
    bg: tileBg(v, img, artMode),
    maxColors: artMode === 'pixel' && !palette && colors > 0 ? colors : undefined,
    ...(palette ? { palette } : {}),
  };
  const r = normalizeTileAtlas(artMode === 'pixel' ? loadCore() : null, img, o);
  const filled = r.tiles.filter((t) => !t.empty).length;

  const picked = formats === 'all' ? ['godot', 'tiled', 'png'] : [formats];
  const files: ExportFile[] = [];
  const put = (prefix: string, list: ExportFile[]) => list.forEach((f) => files.push({ ...f, path: picked.length > 1 ? `${prefix}/${f.path}` : f.path }));
  if (picked.includes('godot')) put('godot', tileAtlasGodot(r, name));
  if (picked.includes('tiled')) put('tiled', tileAtlasTiled(r, name));
  if (picked.includes('png')) put('png', [{ path: `${name}.png`, data: encodePng(r.atlas) }]);

  const summary = { name, tileSize: r.tileSize, cols: r.cols, rows: r.rows, tiles: filled, atlas: { width: r.atlas.width, height: r.atlas.height }, warnings: r.warnings.map(tw) };
  if (flag(v, 'json')) printJson(summary);
  else {
    console.log(`${name}: ${r.cols}x${r.rows} cells, ${filled} tiles of ${r.tileSize}x${r.tileSize}, atlas ${r.atlas.width}x${r.atlas.height}`);
    printWarnings(r.warnings);
  }
  if (!filled) throw new CliError('No tiles were found. Check --bg, --tolerance or --grid.');
  reportOutput(files, outOf(v, 'align-sprites-out'), flag(v, 'json'));
}

// ---------------------------------------------------------------- terrain

const TERRAIN_USAGE = `Usage: align-sprites terrain <A.png> [B.png] [options]

Transition tiles between terrain A (base) and B (overlay) from two seamless textures. Without B, A is painted
over transparency (an upper layer to stack on any terrain). Exports PNG + Godot .tres (terrain set) + README.

  --layout blob47|dual16   blob47 = 8x6 atlas, 47 tiles (default); dual16 = 4x4 dual-grid, 16 tiles
  --tile N                 tile size in px (default 32; even for dual16)
  --mode pixel|cartoon     (default pixel)
  --palette P              fixed palette (pixel only)
  --margin N --blur N --noise N --seed N   edge style (defaults scale with the tile size)
  --outline                pixel only: automatic dark outline on the overlay edge
  --names a,b              terrain names in the .tres (default: file names)
  --name N                 export name (default: A-B)
  --out PATH               directory or file.zip (default ./align-sprites-out)
  --json                   print the summary as JSON`;

export async function terrainCommand(argv: string[]): Promise<void> {
  const parsed = parse(
    argv,
    {
      layout: { type: 'string' }, tile: { type: 'string' }, mode: { type: 'string' }, palette: { type: 'string' }, margin: { type: 'string' },
      blur: { type: 'string' }, noise: { type: 'string' }, seed: { type: 'string' }, outline: { type: 'boolean' }, names: { type: 'string' },
      name: { type: 'string' }, out: { type: 'string' }, json: { type: 'boolean' },
    },
    TERRAIN_USAGE,
  );
  if (!parsed) return;
  const { v, pos } = parsed;
  if (pos.length < 1 || pos.length > 2) throw new UsageError(`terrain: expected one or two textures\n\n${TERRAIN_USAGE}`);
  const artMode = mode(v);
  const layout = oneOf(v, 'layout', ['blob47', 'dual16'], 'blob47');
  const T = int(v, 'tile') ?? 32;
  const [a, b] = pos.map(loadImage);
  const base = defaultEdgeStyle(T, int(v, 'seed') ?? 1);
  const style = {
    ...base,
    margin: int(v, 'margin') ?? base.margin,
    blur: int(v, 'blur') ?? base.blur,
    noiseAmp: int(v, 'noise') ?? base.noiseAmp,
    outline: artMode === 'pixel' && flag(v, 'outline') ? ('auto' as const) : undefined,
  };
  const palette = artMode === 'pixel' ? resolvePalette(str(v, 'palette')) : undefined;
  const set = composeTransitions(artMode === 'pixel' ? loadCore() : null, a, b ?? null, T, layout, style, artMode, { palette });

  const given = names(str(v, 'names'));
  const terrainNames: [string, string] = [given[0] || baseName(pos[0]), given[1] || (pos[1] ? baseName(pos[1]) : 'overlay')];
  const name = slug(str(v, 'name') ?? (pos[1] ? `${baseName(pos[0])}-${baseName(pos[1])}` : baseName(pos[0])));
  const files = terrainExport(set, name, terrainNames);

  if (flag(v, 'json')) printJson({ name, layout, tileSize: T, cols: set.cols, rows: set.rows, tiles: set.tiles.length, warnings: set.warnings.map(tw) });
  else {
    console.log(`${name}: ${layout}, ${set.tiles.length} tiles of ${T}x${T}, atlas ${set.atlas.width}x${set.atlas.height}`);
    printWarnings(set.warnings);
  }
  reportOutput(files, outOf(v, 'align-sprites-out'), flag(v, 'json'));
}

// ---------------------------------------------------------------- items

const ITEMS_USAGE = `Usage: align-sprites items <image.png> [options]

An AI image with many separate objects (coins, potions, keys, icons) becomes an atlas of exact square cells
plus one file per item, per engine.

  --size N                cell size in px (default 32)
  --fill common|each      common = one scale for all, relative sizes kept (default); each = every item fills its cell
  --margin N              empty px on every side of the cell (default 1)
  --cols N                atlas columns (default: the squarest layout)
  --grid RxC              look for the items inside a ROWS x COLS grid instead of by separate shapes
  --mode pixel|cartoon    (default pixel)
${COMMON_BG}
  --palette P / --colors N   fixed palette or N shared colours (pixel only)
  --names a,b,c           item names in reading order (default item_00, item_01…)
  --target T              godot,gdevelop,kaplay,generic or all (default all)
  --name N                set name (default: file name)
  --out PATH              directory or file.zip (default ./align-sprites-out)
  --json                  print the summary as JSON`;

export async function itemsCommand(argv: string[]): Promise<void> {
  const parsed = parse(
    argv,
    {
      size: { type: 'string' }, fill: { type: 'string' }, margin: { type: 'string' }, cols: { type: 'string' }, grid: { type: 'string' },
      mode: { type: 'string' }, bg: { type: 'string' }, tolerance: { type: 'string' }, palette: { type: 'string' }, colors: { type: 'string' },
      names: { type: 'string' }, target: { type: 'string' }, name: { type: 'string' }, out: { type: 'string' }, json: { type: 'boolean' },
    },
    ITEMS_USAGE,
  );
  if (!parsed) return;
  const { v, pos } = parsed;
  if (pos.length !== 1) throw new UsageError(`items: expected one image\n\n${ITEMS_USAGE}`);
  const artMode = mode(v);
  const img = loadImage(pos[0]);
  const palette = artMode === 'pixel' ? resolvePalette(str(v, 'palette')) : undefined;
  const colors = int(v, 'colors') ?? 0;
  const o: ItemsOptions = {
    cellSize: int(v, 'size') ?? 32,
    mode: artMode,
    bg: tileBg(v, img, artMode),
    fill: oneOf<'common' | 'each'>(v, 'fill', ['common', 'each'], 'common'),
    margin: int(v, 'margin') ?? 1,
    cols: int(v, 'cols') || undefined,
    grid: str(v, 'grid') ? parseGrid(str(v, 'grid')!) : undefined,
    maxColors: artMode === 'pixel' && !palette && colors > 0 ? colors : undefined,
    ...(palette ? { palette } : {}),
  };
  const r = normalizeItems(artMode === 'pixel' ? loadCore() : null, img, o);
  const name = slug(str(v, 'name') ?? baseName(pos[0]));
  const files = itemsExport(r, name, names(str(v, 'names')), parseTargets(str(v, 'target')));

  if (flag(v, 'json')) printJson({ name, items: r.items.length, cols: r.cols, rows: r.rows, cellSize: r.cellSize, warnings: r.warnings.map(tw) });
  else {
    console.log(`${name}: ${r.items.length} items in ${r.cols}x${r.rows} cells of ${r.cellSize}x${r.cellSize}, atlas ${r.atlas.width}x${r.atlas.height}`);
    printWarnings(r.warnings);
  }
  if (!r.items.length) throw new CliError('No items were found. Check --bg, --tolerance or --grid.');
  reportOutput(files, outOf(v, 'align-sprites-out'), flag(v, 'json'));
}

// ---------------------------------------------------------------- parallax

const PARALLAX_USAGE = `Usage: align-sprites parallax <far.png> [mid.png] [near.png] [front.png] [options]

Background layers, ordered far to near, become looping layers at the game height with the scroll factor of each one,
exported per engine. Pixel art keeps its own grid: it is enlarged by a whole number and the top is padded or cropped
to the game height; cartoon art is resampled once to the height.

  --height N              game height in px: every layer gets exactly this height (default 360 = 640x360 game)
  --mode pixel|cartoon    (default pixel)
  --no-loop               do not make the layers repeat sideways
  --overlap N             join band of the loop, % of the layer width (default 12)
  --cut auto|none|2,3     layers (1 = far) whose flat background colour is cut out (default auto: not the far
                          one, and only layers with a chroma key along the top)
  --tolerance N           background tolerance, ΔE (default 25)
  --factors 0.2,0.5,0.8   scroll factor of each layer, far to near (default by count; 0 = fixed, 1 = camera speed)
  --palette P             fixed palette (pixel only)
  --target T              godot,gdevelop,kaplay,generic or all (default all)
  --name N                export name (default background)
  --out PATH              directory or file.zip (default ./align-sprites-out)
  --json                  print the summary as JSON`;

export async function parallaxCommand(argv: string[]): Promise<void> {
  const parsed = parse(
    argv,
    {
      height: { type: 'string' }, mode: { type: 'string' }, 'no-loop': { type: 'boolean' }, overlap: { type: 'string' }, cut: { type: 'string' },
      tolerance: { type: 'string' }, factors: { type: 'string' }, palette: { type: 'string' }, target: { type: 'string' }, name: { type: 'string' },
      out: { type: 'string' }, json: { type: 'boolean' },
    },
    PARALLAX_USAGE,
  );
  if (!parsed) return;
  const { v, pos } = parsed;
  if (pos.length < 1 || pos.length > 4) throw new UsageError(`parallax: expected 1 to 4 layers, far to near\n\n${PARALLAX_USAGE}`);
  const artMode = mode(v);
  const images = pos.map(loadImage);

  const cutText = str(v, 'cut') ?? 'auto';
  const cutIdx = cutText === 'auto' || cutText === 'none' ? [] : cutText.split(',').map((s) => Number(s) - 1);
  if (cutIdx.some((i) => !Number.isInteger(i) || i < 0 || i >= pos.length)) throw new UsageError(`--cut: layer numbers go from 1 to ${pos.length}`);
  const cut = (i: number): boolean => {
    if (cutText === 'none') return false;
    if (cutText !== 'auto') return cutIdx.includes(i);
    // Same rule as the Tiles tab (core wantsCutout): a chroma key along the TOP of the layer; the far layer never.
    return wantsCutout(images[i], i);
  };
  const factors = str(v, 'factors') ? str(v, 'factors')!.split(',').map(Number) : defaultFactors(pos.length);
  if (factors.length !== pos.length || factors.some((f) => !Number.isFinite(f))) throw new UsageError(`--factors: give ${pos.length} numbers, far to near`);
  const palette = artMode === 'pixel' ? resolvePalette(str(v, 'palette')) : undefined;

  const r = buildParallax(
    artMode === 'pixel' ? loadCore() : null,
    images.map((image, i) => ({ image, removeBg: cut(i), factor: factors[i] })),
    { mode: artMode, height: int(v, 'height') ?? 360, loop: !flag(v, 'no-loop'), overlap: (num(v, 'overlap') ?? 12) / 100, bgTolerance: num(v, 'tolerance') ?? 25, palette },
  );
  const name = slug(str(v, 'name') ?? 'background');
  const files = parallaxExport(r, name, parseTargets(str(v, 'target')));

  const layers = r.layers.map((l, i) => ({ role: l.role, file: pos[i], width: l.image.width, height: l.image.height, factor: l.factor, loop: l.loop.applied, seamScore: Number(l.loop.after.toFixed(2)) }));
  if (flag(v, 'json')) printJson({ name, height: r.height, layers, warnings: r.warnings.map(tw) });
  else {
    console.log(`${name}: ${r.layers.length} layer${r.layers.length === 1 ? '' : 's'} at height ${r.height} px`);
    for (const l of layers) console.log(`  ${l.role}: ${l.width}x${l.height}, factor ${l.factor}, ${l.loop ? 'looped' : 'not looped'} (seam ${l.seamScore})`);
    printWarnings(r.warnings);
  }
  reportOutput(files, outOf(v, 'align-sprites-out'), flag(v, 'json'));
}
