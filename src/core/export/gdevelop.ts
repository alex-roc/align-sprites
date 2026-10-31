// GDevelop 5: one folder per sprite with its cut frames as numbered PNGs (added with multi-select), a README and,
// on request, one horizontal spritesheet strip per animation for the built-in Piskel editor ("Import as spritesheet").
import { blit, createImage } from '../image.ts';
import type { ExportFile, PackedSheet, RGBAImage, SpriteResult } from '../types.ts';
import { animFrames, animSlugs, fl, isCenter, isStatic, sheetOrigin, sheetPng, slug } from './common.ts';
import { encodePng } from './png.ts';

function pad(i: number, n: number): string {
  return String(i).padStart(n, '0');
}

/** Frames side by side in one row (Piskel slices it with the frame size). */
function strip(frames: RGBAImage[]): RGBAImage {
  const w = frames[0]?.width ?? 0, h = frames[0]?.height ?? 0;
  const out = createImage(w * frames.length, h);
  frames.forEach((f, i) => blit(out, f, i * w, 0));
  return out;
}

export interface GdevelopOptions {
  /** Also write `spritesheets/<name>_<anim>.png` (one row per animation, for Piskel). Default off. */
  spritesheets?: boolean;
}

/** File-name prefix of animation k's frames: `<name>_<anim>`, or just `<name>` when the only animation is "default". */
export function gdevelopFramePrefix(name: string, sheet: PackedSheet, k: number): string {
  const slugs = animSlugs(sheet.anims);
  const base = slug(name);
  return sheet.anims.length === 1 && slugs[0] === 'default' ? base : `${base}_${slugs[k]}`;
}

/** Origin as GDevelop's point editor takes it: whole image px (a centred odd-sized cell rounds down). */
function originPoint(sheet: PackedSheet): { x: number; y: number; where: string } {
  const o = sheetOrigin(sheet);
  return { x: Math.floor(o.x), y: Math.floor(o.y), where: isCenter(sheet) ? 'centre' : 'feet' };
}

/**
 * Collision mask steps (en + es) with the 4 polygon points of the automatic box in image px (top-left = 0,0), or
 * null when the sheet has no box. `n` is the step number.
 */
function collisionSteps(sheet: PackedSheet, n: number): { en: string; es: string } | null {
  const b = sheet.collision;
  if (!b) return null;
  const x0 = Math.round(b.x), y0 = Math.round(b.y), x1 = Math.round(b.x + b.w), y1 = Math.round(b.y + b.h);
  const pts = `(${x0}, ${y0}), (${x1}, ${y0}), (${x1}, ${y1}), (${x0}, ${y1})`;
  return {
    en: `${n}. Collision mask: the automatic box is a rectangle with these 4 points (image px, (0, 0) = top-left corner):
   ${pts}.
   Open the collision mask editor of the animation (button "Edit collision masks"), choose a custom mask, and drag the
   corners of the rectangle onto those points. Tick "Use the same collision masks for all animations / frames".
   Without it GDevelop uses the whole ${sheet.cell.w}x${sheet.cell.h} image, empty margins included.
`,
    es: `${n}. Máscara de colisión: la caja automática es un rectángulo con estos 4 puntos (px de la imagen, (0, 0) = esquina superior izquierda):
   ${pts}.
   Abre el editor de máscaras de colisión de la animación (botón "Editar máscaras de colisión"), elige una máscara
   personalizada y arrastra las esquinas del rectángulo hasta esos puntos. Marca "Usar las mismas máscaras de colisión
   para todas las animaciones / fotogramas". Sin eso GDevelop usa la imagen completa de ${sheet.cell.w}x${sheet.cell.h}, márgenes vacíos incluidos.
`,
  };
}

/** Static sprite (one animation, one frame): `<name>/<name>.png` + `<name>/README.txt` with the origin. */
function gdevelopStatic(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  const o = originPoint(sheet);
  const col = collisionSteps(sheet, 4);
  const pixel = sheet.mode === 'pixel';
  const readme = `${name} - GDevelop 5

Static sprite: ${sheet.cell.w}x${sheet.cell.h} px. Origin point: (${o.x}, ${o.y}) (${o.where}).

[EN]
1. Create a "Sprite" object named "${name}", open its (single) animation, click "Add images" and select ${name}.png.
2. Open the "Points" editor and set the point "Origin" to (${o.x}, ${o.y}). ${isCenter(sheet) ? `The origin is the centre,
   so an instance positioned at (x, y) is centred on that spot.` : `The origin is at the feet,
   so an instance positioned at (x, y) stands on that spot.`}
${pixel ? `3. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)",
   and enable "Pixel rounding" if the camera moves.` : `3. Smooth art: keep the default scale mode ("Linear").`}
${col?.en ?? ''}
[ES]
1. Crea un objeto "Sprite" llamado "${name}", abre su (única) animación, pulsa "Añadir imágenes" y selecciona ${name}.png.
2. Abre el editor de "Puntos" y pon el punto "Origin" (Origen) en (${o.x}, ${o.y}). ${isCenter(sheet) ? `El origen es el centro,
   así que una instancia colocada en (x, y) queda centrada en ese punto.` : `El origen está en los pies,
   así que una instancia colocada en (x, y) pisa ese punto.`}
${pixel ? `3. Pixel art: en las Propiedades del juego, pon "Modo de escalado (también llamado muestreo)" en
   "Nearest (sin antialiasing)" y activa el "Redondeo de píxeles" si la cámara se mueve.` : `3. Arte suave: deja el modo de escalado por defecto ("Linear").`}
${col?.es ?? ''}`;
  return [
    { path: `${name}/${name}.png`, data: sheetPng(r) },
    { path: `${name}/README.txt`, data: readme },
  ];
}

/**
 * GDevelop 5: one folder per sprite, `<name>/<name>_<anim>_00.png…` (just `<name>_00.png…` when the only animation is
 * "default"), so every frame of an animation sits side by side and is picked with one multi-select. File names stay
 * unique across the batch even without the folder: GDevelop identifies images by file name. `README.txt` (en + es) has the
 * origin point, fps and loop. With `spritesheets`, also `spritesheets/<name>_<anim>.png` (one row, for Piskel).
 * A single-frame sheet exports as a static sprite instead (`<name>.png` + README).
 */
export function gdevelopFrames(r: SpriteResult, opts: GdevelopOptions = {}): ExportFile[] {
  if (isStatic(r.sheet)) return gdevelopStatic(r);
  const name = slug(r.name);
  const { sheet } = r;
  const slugs = animSlugs(sheet.anims);
  const frames = animFrames(r);
  const o = originPoint(sheet);
  const col = collisionSteps(sheet, 5);
  const files: ExportFile[] = [];
  const prefix = (k: number) => gdevelopFramePrefix(name, sheet, k);

  const table: string[] = [];
  sheet.anims.forEach((a, k) => {
    const digits = Math.max(2, String(Math.max(0, a.count - 1)).length);
    frames[k]!.forEach((img, i) => {
      files.push({ path: `${name}/${prefix(k)}_${pad(i, digits)}.png`, data: encodePng(img) });
    });
    if (opts.spritesheets && frames[k]!.length) files.push({ path: `${name}/spritesheets/${prefix(k)}.png`, data: encodePng(strip(frames[k]!)) });
    const interval = fl(1 / Math.max(a.fps, 0.001));
    table.push(`  ${slugs[k]}: ${prefix(k)}_00.png… (${a.count} frames), ${fl(a.fps)} fps (time between frames ${interval} s), loop ${a.loop ? 'ON' : 'OFF'}`);
  });
  const anims = table.join('\n');
  const pixel = sheet.mode === 'pixel';

  const readme = `${name} - GDevelop 5

Animations (files of each animation):
${anims}
Frame size: ${sheet.cell.w}x${sheet.cell.h} px. Origin point: (${o.x}, ${o.y}) (${o.where}).

[EN]
1. Create a "Sprite" object named "${name}".
2. For each animation, add an animation, click "Add images" and select ALL its PNGs at once
   (multi-select, see the list above). They are added ordered by name.${opts.spritesheets ? `
   Or with Piskel: open the animation with "Edit with Piskel", Import > spritesheets/<file>.png >
   "Import as spritesheet" with a frame size of ${sheet.cell.w}x${sheet.cell.h}; save and close Piskel.` : ''}
   Tip when importing AGAIN: GDevelop copies the images into the project folder, and deleting them in
   GDevelop leaves the files there. Delete the old PNGs from the project folder first (or unzip this folder
   inside the project and pick the images there), or GDevelop renames the copies and can repeat or mix frames.
3. Set the time between frames to 1/fps (see the list above) and enable or disable "Loop" as listed.
4. Open the "Points" editor and set the point "Origin" to (${o.x}, ${o.y}) (the same for all frames:
   tick "Apply the same points to all frames"). ${isCenter(sheet) ? `The origin is the centre, so an instance
   positioned at (x, y) is centred on that spot.` : `The origin is at the feet, so an instance
   positioned at (x, y) stands on that spot.`}
${col?.en ?? ''}${pixel ? `${col ? 6 : 5}. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)",
   and enable "Pixel rounding" if the camera moves.` : `${col ? 6 : 5}. Smooth art: keep the default scale mode ("Linear").`}

[ES]
1. Crea un objeto "Sprite" llamado "${name}".
2. Por cada animación, añade una animación, pulsa "Añadir imágenes" y selecciona TODOS sus PNG a la vez
   (selección múltiple, mira la lista de arriba). Se añaden ordenados por nombre.${opts.spritesheets ? `
   O con Piskel: abre la animación con "Editar con Piskel", Importar > spritesheets/<archivo>.png >
   "Importar como spritesheet" con un tamaño de frame de ${sheet.cell.w}x${sheet.cell.h}; guarda y cierra Piskel.` : ''}
   Consejo al volver a importar: GDevelop copia las imágenes a la carpeta del proyecto, y borrarlas en
   GDevelop deja los archivos. Borra antes los PNG viejos de la carpeta del proyecto (o descomprime esta carpeta
   dentro del proyecto y elige las imágenes ahí), o GDevelop renombra las copias y puede repetir o mezclar frames.
3. Pon el tiempo entre fotogramas en 1/fps (ver lista arriba) y activa o desactiva "Bucle" según la lista.
4. Abre el editor de "Puntos" y pon el punto "Origin" (Origen) en (${o.x}, ${o.y}) (igual en todos los
   fotogramas: marca "Aplicar los mismos puntos a todos los fotogramas"). ${isCenter(sheet) ? `El origen es el centro,
   así que una instancia colocada en (x, y) queda centrada en ese punto.` : `El origen está en los pies,
   así que una instancia colocada en (x, y) pisa ese punto.`}
${col?.es ?? ''}${pixel ? `${col ? 6 : 5}. Pixel art: en las Propiedades del juego, pon "Modo de escalado (también llamado muestreo)" en
   "Nearest (sin antialiasing)" y activa el "Redondeo de píxeles" si la cámara se mueve.` : `${col ? 6 : 5}. Arte suave: deja el modo de escalado por defecto ("Linear").`}
`;
  files.push({ path: `${name}/README.txt`, data: readme });
  return files;
}
