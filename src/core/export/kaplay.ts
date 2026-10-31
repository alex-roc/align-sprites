// Kaplay: one spritesheet + a loadSprite snippet using sliceX/sliceY/anims.
import type { ExportFile, PackedSheet, SpriteResult } from '../types.ts';
import { fl, isCenter, isStatic, r2, sheetPng, slug } from './common.ts';

const IDENT = /^[A-Za-z_$][\w$]*$/;
const key = (s: string): string => (IDENT.test(s) ? s : JSON.stringify(s));

/** The `anims` entries of the snippet (frame indexes are row-major in the sheet). The Kit's test level uses the same ones. */
export function kaplayAnims(sheet: PackedSheet): { name: string; from: number; to: number; loop: boolean; speed: number }[] {
  return sheet.anims
    .filter((a) => a.count > 0)
    .map((a) => ({ name: a.name, from: a.row * sheet.cols, to: a.row * sheet.cols + a.count - 1, loop: a.loop, speed: a.fps }));
}

/**
 * The collision box as Kaplay wants it: `offset` + size of the `Rect` shape for `area()` (null when the sheet has none).
 * Kaplay places a Rect shape so that ITS anchor point (the same anchor as the object) lands on `pos + shape.pos`: the
 * rect's bottom-centre for "bot", its centre for "center". So the offset is the box's anchor point minus the cell's.
 * The snippet writes it and the Kit's test level uses it as is.
 */
export function kaplayArea(sheet: PackedSheet): { x: number; y: number; w: number; h: number } | null {
  const b = sheet.collision;
  if (!b) return null;
  const x = b.x + b.w / 2 - sheet.cell.w / 2;
  const y = isCenter(sheet) ? b.y + b.h / 2 - sheet.cell.h / 2 : b.y + b.h - sheet.cell.h;
  return { x, y, w: b.w, h: b.h };
}

/** `area({ shape: new Rect(...) })` line for the automatic collision box ('' when the sheet has none). */
export function kaplayAreaLine(sheet: PackedSheet): string {
  const a = kaplayArea(sheet);
  return a ? `  area({ shape: new Rect(vec2(${r2(a.x)}, ${r2(a.y)}), ${r2(a.w)}, ${r2(a.h)}) }),\n` : '';
}

/** Comment above `add([...])` explaining the origin and the collision box. */
function originNote(sheet: PackedSheet, what: string): string {
  const pad = sheet.padBottom;
  if (isCenter(sheet)) return `// anchor("center") puts the origin at the middle of the ${what}: pos(x, y) is the centre of the effect.\n`;
  return (
    `// anchor("bot") puts the origin at the bottom-centre of the ${what}, i.e. the feet.\n` +
    (pad > 0 ? `// The ${what} keeps ${pad} empty px below the feet: add ${pad} to y so the feet (not the ${what} bottom) stand on pos.\n` : '')
  );
}

/** Kaplay: `<name>.png` + `<name>.js` snippet (loadSprite with sliceX/sliceY/anims, anchor("bot") or "center", area for the box). */
export function kaplaySnippet(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  if (isStatic(sheet)) return kaplayStatic(r);
  const anims = kaplayAnims(sheet).map((a) => `    ${key(a.name)}: { from: ${a.from}, to: ${a.to}, loop: ${a.loop}, speed: ${fl(a.speed)} },`);
  const first = sheet.anims.find((a) => a.count > 0);
  const pad = sheet.padBottom;
  const posY = pad > 0 ? `y + ${pad}` : 'y';
  const box = kaplayAreaLine(sheet);
  const area = box ? `// area() is the automatic collision box (in px of the cell, relative to the anchor).\n` : '';

  const js = `// ${name}: ${sheet.cell.w}x${sheet.cell.h} px cells, ${sheet.cols} cols x ${sheet.rows} rows.
${sheet.mode === 'pixel' ? `// Pixel art: create the game with crisp rendering, e.g.
//   kaplay({ crisp: true, texFilter: "nearest" });
` : ''}loadSprite(${JSON.stringify(name)}, ${JSON.stringify(name + '.png')}, {
  sliceX: ${sheet.cols},
  sliceY: ${sheet.rows},
  anims: {
${anims.join('\n')}
  },
});

${originNote(sheet, 'cell')}${area}add([
  sprite(${JSON.stringify(name)}${first ? `, { anim: ${JSON.stringify(first.name)} }` : ''}),
  pos(x, ${isCenter(sheet) ? 'y' : posY}),
  anchor(${isCenter(sheet) ? '"center"' : '"bot"'}),
${box}]);
`;
  return [
    { path: `${name}.png`, data: sheetPng(r) },
    { path: `${name}.js`, data: js },
  ];
}

/** Static sprite (one animation, one frame): plain loadSprite without slicing or anims. */
function kaplayStatic(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  const box = kaplayAreaLine(sheet);
  const area = box ? `// area() is the automatic collision box (in px of the image, relative to the anchor).\n` : '';
  const js = `// ${name}: ${sheet.cell.w}x${sheet.cell.h} px static sprite.
${sheet.mode === 'pixel' ? `// Pixel art: create the game with crisp rendering, e.g.
//   kaplay({ crisp: true, texFilter: "nearest" });
` : ''}loadSprite(${JSON.stringify(name)}, ${JSON.stringify(name + '.png')});

${originNote(sheet, 'image')}${area}add([
  sprite(${JSON.stringify(name)}),
  pos(x, ${isCenter(sheet) || sheet.padBottom <= 0 ? 'y' : `y + ${sheet.padBottom}`}),
  anchor(${isCenter(sheet) ? '"center"' : '"bot"'}),
${box}]);
`;
  return [
    { path: `${name}.png`, data: sheetPng(r) },
    { path: `${name}.js`, data: js },
  ];
}
