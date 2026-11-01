// Game kit: every sprite and tile output of a session in one export, organised per engine.
import { buildExport, encodePng, slug } from '../export/index.ts';
import { itemsExport, type ItemsResult } from '../items/index.ts';
import { rgbaToHex } from '../palette/index.ts';
import { parallaxExport, type ParallaxResult } from '../parallax/index.ts';
import { terrainExport, tileAtlasGodot, tileAtlasTiled, type TileAtlasResult } from '../tiles/index.ts';
import type { ExportFile, ExportTarget, RGBA8, RGBAImage, SpriteResult, TileSetResult } from '../types.ts';

export interface KitInput {
  sprites: SpriteResult[];
  atlas?: { result: TileAtlasResult; name: string };
  terrain?: { result: TileSetResult; name: string; names: [string, string] };
  /** Objects and icons; `names` = the user's item names, parallel to `result.items` (as `itemsExport` takes them). */
  items?: { result: ItemsResult; name: string; names: (string | undefined)[] };
  parallax?: { result: ParallaxResult; name: string };
}

/** What the Tiled .tsx and Kaplay exporters need from any tile PNG: the image and its grid. */
interface Grid {
  atlas: RGBAImage;
  tileSize: number;
  cols: number;
  rows: number;
}

/** Unique file slugs, in the order the sprite exporters assign them (`hero`, `hero_2`…). */
function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((n) => {
    const base = slug(n);
    let s = base;
    for (let k = 2; used.has(s); k++) s = `${base}_${k}`;
    used.add(s);
    return s;
  });
}

/** Kaplay tiles: `<name>.png` + `<name>.js` (loadSprite with sliceX/sliceY: one frame per tile, row-major). */
function kaplayTiles(g: Grid, name: string): ExportFile[] {
  const n = slug(name);
  const js = `// ${n}: ${g.tileSize}x${g.tileSize} px tiles, ${g.cols} cols x ${g.rows} rows (frame = row * ${g.cols} + col).
// Pixel art: create the game with crisp rendering, e.g. kaplay({ crisp: true, texFilter: "nearest" });
loadSprite(${JSON.stringify(n)}, ${JSON.stringify(n + '.png')}, { sliceX: ${g.cols}, sliceY: ${g.rows} });

// Draw tile (col, row) at a grid cell:
//   add([sprite(${JSON.stringify(n)}, { frame: row * ${g.cols} + col }), pos(cx * ${g.tileSize}, cy * ${g.tileSize})]);
`;
  return [
    { path: `${n}.png`, data: encodePng(g.atlas) },
    { path: `${n}.js`, data: js },
  ];
}

/** Files of one tile source (atlas or terrain) for one engine, relative to `<target>/tiles/`. */
function tileFiles(kit: KitInput, target: ExportTarget, names: { atlas?: string; terrain?: string }): ExportFile[] {
  const out: ExportFile[] = [];
  const { atlas, terrain } = kit;
  if (atlas) {
    const name = names.atlas!;
    if (target === 'godot') out.push(...tileAtlasGodot(atlas.result, name));
    else if (target === 'kaplay') out.push(...kaplayTiles(atlas.result, name));
    else out.push(...tileAtlasTiled(atlas.result, name));
  }
  if (terrain) {
    const name = names.terrain!;
    const g: Grid = { atlas: terrain.result.atlas, tileSize: terrain.result.tileSize, cols: terrain.result.cols, rows: terrain.result.rows };
    if (target === 'godot') out.push(...terrainExport(terrain.result, name, terrain.names));
    else if (target === 'kaplay') out.push(...kaplayTiles(g, name));
    else out.push(...tileAtlasTiled({ ...g, tiles: [], warnings: [] }, name));
  }
  return out;
}

/** Distinct palette colours of every sprite (first appearance order), as '#rrggbb'. */
function kitPalette(sprites: SpriteResult[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sprites) {
    for (const c of (s.diag.palette ?? []) as RGBA8[]) {
      const h = rgbaToHex(c);
      if (!seen.has(h)) {
        seen.add(h);
        out.push(h);
      }
    }
  }
  return out;
}

const HOW: Record<ExportTarget, { en: string; es: string }> = {
  godot: {
    en: 'Copy sprites/, tiles/, items/ and backgrounds/ into your project (e.g. res://assets/). Each sprite folder has its .tscn; tiles/ has the TileSet .tres to assign to a TileMapLayer; items/ has one AtlasTexture .tres per item; backgrounds/ has a Parallax2D .tscn (Godot 4.3+) to drag into your level.',
    es: 'Copia sprites/, tiles/, items/ y backgrounds/ a tu proyecto (p. ej. res://assets/). Cada carpeta de sprite trae su .tscn; tiles/ trae el TileSet .tres para asignar a un TileMapLayer; items/ trae un .tres AtlasTexture por objeto; backgrounds/ trae un .tscn con Parallax2D (Godot 4.3+) para arrastrar a tu nivel.',
  },
  gdevelop: {
    en: 'Sprites: one folder per sprite in sprites/ (<name>/<name>_<animation>_00.png…); its README.txt has the origin and fps. Tiles: tiles/ has the atlas PNG and a Tiled .tsx; use them with the Tilemap object (Tiled tileset) at the tile size below. Items: items/<set>/ has one PNG per item. Backgrounds: backgrounds/<name>/ has one PNG per layer and a README.txt with the setup (Tiled Sprite + parallax factors).',
    es: 'Sprites: una carpeta por sprite en sprites/ (<nombre>/<nombre>_<animación>_00.png…); su README.txt trae el origen y los fps. Tiles: tiles/ trae el atlas PNG y un .tsx de Tiled; úsalos con el objeto Tilemap (tileset de Tiled) al tamaño de tile de abajo. Objetos: items/<set>/ trae un PNG por objeto. Fondos: backgrounds/<nombre>/ trae un PNG por capa y un README.txt con la configuración (Tiled Sprite + factores de parallax).',
  },
  kaplay: {
    en: 'Paste each .js snippet after kaplay(...) and keep the PNG next to it (or adjust the path). Tiles load as one sliced sprite; use frame = row * cols + col. items/ has the objects atlas + a loadSpriteAtlas snippet; backgrounds/<name>/ has the layer PNGs + a parallax snippet.',
    es: 'Pega cada snippet .js después de kaplay(...) y deja el PNG a su lado (o ajusta la ruta). Los tiles se cargan como un sprite cortado; usa frame = fila * columnas + columna. items/ trae el atlas de objetos + un snippet loadSpriteAtlas; backgrounds/<nombre>/ trae los PNG de las capas + un snippet de parallax.',
  },
  generic: {
    en: 'Sprites: sheet PNG + Aseprite JSON + one PNG per frame. Tiles: atlas PNG and a Tiled .tsx. items/: atlas PNG + JSON + one PNG per item. backgrounds/<name>/: layer PNGs + JSON.',
    es: 'Sprites: hoja PNG + JSON de Aseprite + un PNG por frame. Tiles: atlas PNG y un .tsx de Tiled. items/: atlas PNG + JSON + un PNG por objeto. backgrounds/<nombre>/: PNG de las capas + JSON.',
  },
};

const num = (n: number): string => String(Math.round(n * 100) / 100);

/** One line per sprite: name, character height, frame size, animations (labels per language). */
function spriteLines(kit: KitInput, names: string[], lang: 'en' | 'es'): string {
  const t = lang === 'en'
    ? { height: 'height', frame: 'frame', still: 'static', noLoop: 'no loop' }
    : { height: 'altura', frame: 'frame', still: 'estático', noLoop: 'sin bucle' };
  const lines = kit.sprites.map((s, i) => {
    const { sheet } = s;
    const anims = sheet.anims
      .map((a) => (a.count === 1 && sheet.anims.length === 1 ? t.still : `${a.name} (${a.count}f, ${num(a.fps)} fps${a.loop ? '' : ', ' + t.noLoop})`))
      .join(', ');
    return `  - ${names[i]}: ${t.height} ${Math.round(s.diag.refHeight)} px, ${t.frame} ${sheet.cell.w}x${sheet.cell.h} px, ${anims || '-'}`;
  });
  return lines.length ? lines.join('\n') : '  -';
}

/** Summary lines for the objects and the background (empty when the kit has none). */
function extraLines(kit: KitInput, lang: 'en' | 'es'): string {
  const en = lang === 'en';
  let out = '';
  if (kit.items) {
    const { result } = kit.items;
    out += en
      ? `Items: ${result.items.length} items, ${result.cellSize}x${result.cellSize} px slot\n`
      : `Objetos: ${result.items.length} objetos, casilla de ${result.cellSize}x${result.cellSize} px\n`;
  }
  if (kit.parallax) {
    const { result } = kit.parallax;
    const factors = result.layers.map((l) => num(l.factor)).join(', ');
    out += en
      ? `Background: ${result.layers.length} layers, ${result.height} px high, scroll factors ${factors || '-'} (far to near)\n`
      : `Fondo: ${result.layers.length} capas, ${result.height} px de alto, factores de scroll ${factors || '-'} (de lejos a cerca)\n`;
  }
  return out;
}

function readme(kit: KitInput, target: ExportTarget, spriteNames: string[], tileSize: number | null, palette: string[]): string {
  const tilesTxt = tileSize ? `${tileSize}x${tileSize} px` : '-';
  const palTxt = palette.length ? palette.join(' ') : '-';
  return `Game kit - ${target}

[EN]
${HOW[target].en}

Sprites (name: character height, frame size, animations):
${spriteLines(kit, spriteNames, 'en')}
Tile size: ${tilesTxt}
${extraLines(kit, 'en')}Palette (${palette.length} colours): ${palTxt}

[ES]
${HOW[target].es}

Sprites (nombre: altura del personaje, tamaño de frame, animaciones):
${spriteLines(kit, spriteNames, 'es')}
Tamaño de tile: ${tilesTxt}
${extraLines(kit, 'es')}Paleta (${palette.length} colores): ${palTxt}
`;
}

/**
 * One file list for one engine: `<target>/sprites/...` (the usual sprite export for that target) and
 * `<target>/tiles/...` (Godot: TileSet .tres; GDevelop/other: atlas PNG + Tiled .tsx; Kaplay: atlas PNG +
 * snippet), `<target>/items/...` (objects and icons: Godot `<set>/` with an AtlasTexture .tres per item; GDevelop `<set>/`
 * with one PNG per item; Kaplay atlas PNG + snippet; generic atlas PNG + JSON + `<set>/` PNGs) and
 * `<target>/backgrounds/<name>/...` (parallax layer PNGs + Parallax2D .tscn / README / snippet / JSON), plus
 * `<target>/README.txt` (en + es) listing the kit: tile size, sprite heights, objects, background, palette.
 * Each part is optional; Godot's relative resource paths keep resolving because every folder travels whole.
 */
export function buildKitExport(kit: KitInput, target: ExportTarget): ExportFile[] {
  const files: ExportFile[] = [];
  const pre = `${target}/`;
  for (const f of buildExport(kit.sprites, [target], { prefix: false })) files.push({ path: `${pre}sprites/${f.path}`, data: f.data });

  // Atlas and terrain must not overwrite each other when they share a name.
  const [atlasName, terrainName] = uniqueNames([kit.atlas?.name ?? 'tiles', kit.terrain?.name ?? 'terrain']);
  for (const f of tileFiles(kit, target, { atlas: atlasName, terrain: terrainName })) files.push({ path: `${pre}tiles/${f.path}`, data: f.data });

  if (kit.items) {
    const { result, name, names } = kit.items;
    for (const f of itemsExport(result, name, names, [target], { prefix: false, pngDir: '' })) files.push({ path: `${pre}items/${f.path}`, data: f.data });
  }
  if (kit.parallax) {
    for (const f of parallaxExport(kit.parallax.result, kit.parallax.name, [target])) files.push({ path: `${pre}backgrounds/${f.path}`, data: f.data });
  }

  const tileSize = kit.atlas?.result.tileSize ?? kit.terrain?.result.tileSize ?? null;
  files.push({ path: `${pre}README.txt`, data: readme(kit, target, uniqueNames(kit.sprites.map((s) => s.name)), tileSize, kitPalette(kit.sprites)) });
  return files;
}
