// Kaplay: one spritesheet + a loadSprite snippet using sliceX/sliceY/anims.
import type { ExportFile, SpriteResult } from '../types.ts';
import { fl, isStatic, sheetPng, slug } from './common.ts';

const IDENT = /^[A-Za-z_$][\w$]*$/;
const key = (s: string): string => (IDENT.test(s) ? s : JSON.stringify(s));

/** Kaplay: `<name>.png` + `<name>.js` snippet (loadSprite with sliceX/sliceY/anims, anchor("bot")). */
export function kaplaySnippet(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  if (isStatic(sheet)) return kaplayStatic(r);
  const anims = sheet.anims
    .filter((a) => a.count > 0)
    .map((a) => {
      const from = a.row * sheet.cols;
      return `    ${key(a.name)}: { from: ${from}, to: ${from + a.count - 1}, loop: ${a.loop}, speed: ${fl(a.fps)} },`;
    });
  const first = sheet.anims.find((a) => a.count > 0);
  const pad = sheet.padBottom;
  const posY = pad > 0 ? `y + ${pad}` : 'y';

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

// anchor("bot") puts the origin at the bottom-centre of the cell, i.e. the feet.
${pad > 0 ? `// The cell keeps ${pad} empty px below the feet: add ${pad} to y so the feet (not the cell bottom) stand on pos.\n` : ''}add([
  sprite(${JSON.stringify(name)}${first ? `, { anim: ${JSON.stringify(first.name)} }` : ''}),
  pos(x, ${posY}),
  anchor("bot"),
]);
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
  const pad = sheet.padBottom;
  const js = `// ${name}: ${sheet.cell.w}x${sheet.cell.h} px static sprite.
${sheet.mode === 'pixel' ? `// Pixel art: create the game with crisp rendering, e.g.
//   kaplay({ crisp: true, texFilter: "nearest" });
` : ''}loadSprite(${JSON.stringify(name)}, ${JSON.stringify(name + '.png')});

// anchor("bot") puts the origin at the bottom-centre of the image, i.e. the feet.
${pad > 0 ? `// The image keeps ${pad} empty px below the feet: add ${pad} to y so the feet (not the image bottom) stand on pos.\n` : ''}add([
  sprite(${JSON.stringify(name)}),
  pos(x, ${pad > 0 ? `y + ${pad}` : 'y'}),
  anchor("bot"),
]);
`;
  return [
    { path: `${name}.png`, data: sheetPng(r) },
    { path: `${name}.js`, data: js },
  ];
}
