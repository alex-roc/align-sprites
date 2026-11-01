// Exports of an items atlas, per engine: the atlas PNG plus what each engine needs to use the items by name.
import { cropCell, slug } from '../export/common.ts';
import { encodePng } from '../export/png.ts';
import type { ExportFile, ExportTarget } from '../types.ts';
import type { ItemsResult } from './index.ts';

export interface ItemsExportOptions {
  /** Put each engine in a `<target>/` folder (default: when there are several targets). */
  prefix?: boolean;
  /** Folder (with trailing `/`) holding the generic target's individual PNGs, under `<set>/`. Default `items/` (`items/<set>/`). */
  pngDir?: string;
}

/** Unique file-safe names for the items of `r` (`names[i]` replaces the default of item i; blanks keep the default). */
export function itemNames(r: ItemsResult, names: readonly (string | undefined)[] = []): string[] {
  const used = new Set<string>();
  return r.items.map((it, i) => {
    const base = slug(names[i]?.trim() || it.name);
    let s = base;
    for (let k = 2; used.has(s); k++) s = `${base}_${k}`;
    used.add(s);
    return s;
  });
}

const rectOf = (r: ItemsResult, i: number) => r.items[i].rect;

/** One PNG per item, cell-sized. GDevelop keys images by file name, so the set name makes every name unique. */
function itemPngs(r: ItemsResult, set: string, names: string[], dir: string): ExportFile[] {
  return r.items.map((_, i) => {
    const c = rectOf(r, i);
    return { path: `${dir}${set}_${names[i]}.png`, data: encodePng(cropCell(r.atlas, c.x, c.y, c.w, c.h)) };
  });
}

const pixelNote = (r: ItemsResult): boolean => r.mode === 'pixel';

function godot(r: ItemsResult, set: string, names: string[]): ExportFile[] {
  const files: ExportFile[] = [{ path: `${set}/${set}.png`, data: encodePng(r.atlas) }];
  names.forEach((n, i) => {
    const c = rectOf(r, i);
    files.push({
      path: `${set}/${n}.tres`,
      data:
        `[gd_resource type="AtlasTexture" load_steps=2 format=3]\n\n` +
        `[ext_resource type="Texture2D" path="${set}.png" id="1_tex"]\n\n` +
        `[resource]\natlas = ExtResource("1_tex")\nregion = Rect2(${c.x}, ${c.y}, ${c.w}, ${c.h})\nfilter_clip = true\n`,
    });
  });
  const readme = `${set} - Godot 4

${names.length} items of ${r.cellSize}x${r.cellSize} px in ${set}.png. Each <item>.tres is an AtlasTexture of one cell.

[EN]
1. Copy the folder ${set} into your project.
2. Use any .tres as a texture: drag it to the Texture of a Sprite2D, a TextureRect or a button icon.
${pixelNote(r) ? '3. Pixel art: set Project Settings, Rendering, Textures, Default Texture Filter to Nearest.\n' : ''}
[ES]
1. Copia la carpeta ${set} a tu proyecto.
2. Usa cualquier .tres como textura: arrástralo a la Texture de un Sprite2D, un TextureRect o el icono de un botón.
${pixelNote(r) ? '3. Pixel art: en Project Settings, Rendering, Textures, pon Default Texture Filter en Nearest.\n' : ''}`;
  files.push({ path: `${set}/README.txt`, data: readme });
  return files;
}

function gdevelop(r: ItemsResult, set: string, names: string[]): ExportFile[] {
  const files = itemPngs(r, set, names, `${set}/`);
  const first = `${set}_${names[0] ?? 'item_00'}.png`;
  const readme = `${set} - GDevelop 5

${names.length} items of ${r.cellSize}x${r.cellSize} px, one PNG each (${first}, ...).

[EN]
1. Create one "Sprite" object per item (or one object with an animation per item, for a pickup that changes).
2. Open its animation, click "Add images" and pick the PNG. You can pick several PNGs at once.
3. File names are unique (${set}_<item>.png). Importing again? Also delete the old PNGs from the project folder first,
   or GDevelop renames the copies.
${pixelNote(r) ? '4. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)".\n' : ''}
[ES]
1. Crea un objeto "Sprite" por cada item (o un objeto con una animación por item, para un objeto que cambia).
2. Abre su animación, pulsa "Añadir imágenes" y elige el PNG. Puedes elegir varios PNG a la vez.
3. Los nombres de archivo son únicos (${set}_<item>.png). ¿Importas otra vez? Borra también los PNG viejos de la carpeta
   del proyecto, o GDevelop renombra las copias.
${pixelNote(r) ? '4. Pixel art: en las Propiedades del juego, pon "Modo de escalado (también llamado muestreo)" en "Nearest (sin antialiasing)".\n' : ''}`;
  files.push({ path: `${set}/README.txt`, data: readme });
  return files;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
const key = (s: string): string => (IDENT.test(s) ? s : JSON.stringify(s));

function kaplay(r: ItemsResult, set: string, names: string[]): ExportFile[] {
  const rows = names.map((n, i) => {
    const c = rectOf(r, i);
    return `  ${key(n)}: { x: ${c.x}, y: ${c.y}, width: ${c.w}, height: ${c.h} },`;
  });
  const js = `// ${set}: ${names.length} items of ${r.cellSize}x${r.cellSize} px in one atlas (${r.atlas.width}x${r.atlas.height}).
${pixelNote(r) ? `// Pixel art: create the game with crisp rendering, e.g.
//   kaplay({ crisp: true, texFilter: "nearest" });
` : ''}// Each key becomes a sprite name. Names are global in Kaplay: rename an item if it clashes with another sprite.
loadSpriteAtlas(${JSON.stringify(set + '.png')}, {
${rows.join('\n')}
});

// Use an item by name:
add([
  sprite(${JSON.stringify(names[0] ?? 'item_00')}),
  pos(x, y),
]);
`;
  return [
    { path: `${set}.png`, data: encodePng(r.atlas) },
    { path: `${set}.js`, data: js },
  ];
}

function generic(r: ItemsResult, set: string, names: string[], pngDir: string): ExportFile[] {
  const items: Record<string, { x: number; y: number; w: number; h: number }> = {};
  names.forEach((n, i) => {
    const c = rectOf(r, i);
    items[n] = { x: c.x, y: c.y, w: c.w, h: c.h };
  });
  const json = { image: `${set}.png`, size: { w: r.atlas.width, h: r.atlas.height }, cell: r.cellSize, items };
  return [
    { path: `${set}.png`, data: encodePng(r.atlas) },
    { path: `${set}.json`, data: JSON.stringify(json, null, 2) + '\n' },
    ...itemPngs(r, set, names, `${pngDir}${set}/`),
  ];
}

const EXPORTERS: Record<ExportTarget, (r: ItemsResult, set: string, names: string[], pngDir: string) => ExportFile[]> = { godot, gdevelop, kaplay, generic };

/**
 * Items atlas for the requested engines: `godot` = atlas PNG + one AtlasTexture .tres per item (relative path, no uid),
 * `gdevelop` = one PNG per item, `kaplay` = PNG + loadSpriteAtlas snippet, `generic` = atlas PNG + JSON (name → rect)
 * + the individual PNGs (`items/<set>/`, or `<o.pngDir><set>/`). `names` overrides the default item names (parallel to `r.items`).
 */
export function itemsExport(r: ItemsResult, setName: string, names: readonly (string | undefined)[], targets: ExportTarget[], o: ItemsExportOptions = {}): ExportFile[] {
  const set = slug(setName);
  const unique = itemNames(r, names);
  const prefix = o.prefix ?? targets.length > 1;
  const pngDir = o.pngDir ?? 'items/';
  return targets.flatMap((t) => EXPORTERS[t](r, set, unique, pngDir).map((f) => ({ path: prefix ? `${t}/${f.path}` : f.path, data: f.data })));
}
