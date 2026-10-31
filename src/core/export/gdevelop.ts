// GDevelop 5: the cut frames as flat numbered PNGs at the root (added with multi-select), a README per sprite and,
// on request, one horizontal spritesheet strip per animation for the built-in Piskel editor ("Import as spritesheet").
import { blit, createImage } from '../image.ts';
import type { ExportFile, RGBAImage, SpriteResult } from '../types.ts';
import { animFrames, animSlugs, feetOrigin, fl, isStatic, sheetPng, slug } from './common.ts';
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

/** Static sprite (one animation, one frame): `<name>.png` + `README-<name>.txt` with the origin. */
function gdevelopStatic(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  const o = feetOrigin(sheet);
  const pixel = sheet.mode === 'pixel';
  const readme = `${name} - GDevelop 5

Static sprite: ${sheet.cell.w}x${sheet.cell.h} px. Origin point: (${o.x}, ${o.y}) (feet).

[EN]
1. Create a "Sprite" object named "${name}", open its (single) animation, click "Add images" and select ${name}.png.
2. Open the "Points" editor and set the point "Origin" to (${o.x}, ${o.y}). The origin is at the feet,
   so an instance positioned at (x, y) stands on that spot.
${pixel ? `3. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)",
   and enable "Pixel rounding" if the camera moves.` : `3. Smooth art: keep the default scale mode ("Linear").`}

[ES]
1. Crea un objeto "Sprite" llamado "${name}", abre su (única) animación, pulsa "Añadir imágenes" y selecciona ${name}.png.
2. Abre el editor de "Puntos" y pon el punto "Origin" (Origen) en (${o.x}, ${o.y}). El origen está en los pies,
   así que una instancia colocada en (x, y) pisa ese punto.
${pixel ? `3. Pixel art: en las Propiedades del juego, pon "Modo de escalado (también llamado muestreo)" en
   "Nearest (sin antialiasing)" y activa el "Redondeo de píxeles" si la cámara se mueve.` : `3. Arte suave: deja el modo de escalado por defecto ("Linear").`}
`;
  return [
    { path: `${name}.png`, data: sheetPng(r) },
    { path: `README-${name}.txt`, data: readme },
  ];
}

/**
 * GDevelop 5, flat: `<name>_<anim>_00.png…` (just `<name>_00.png…` when the only animation is "default"), so every
 * frame of an animation sits side by side and is picked with one multi-select. `README-<name>.txt` (en + es) has the
 * origin point, fps and loop. With `spritesheets`, also `spritesheets/<name>_<anim>.png` (one row, for Piskel).
 * A single-frame sheet exports as a static sprite instead (`<name>.png` + README).
 */
export function gdevelopFrames(r: SpriteResult, opts: GdevelopOptions = {}): ExportFile[] {
  if (isStatic(r.sheet)) return gdevelopStatic(r);
  const name = slug(r.name);
  const { sheet } = r;
  const slugs = animSlugs(sheet.anims);
  const frames = animFrames(r);
  const o = feetOrigin(sheet);
  const files: ExportFile[] = [];
  const onlyDefault = sheet.anims.length === 1 && slugs[0] === 'default';
  const prefix = (k: number) => (onlyDefault ? name : `${name}_${slugs[k]}`);

  const table: string[] = [];
  sheet.anims.forEach((a, k) => {
    const digits = Math.max(2, String(Math.max(0, a.count - 1)).length);
    frames[k]!.forEach((img, i) => {
      files.push({ path: `${prefix(k)}_${pad(i, digits)}.png`, data: encodePng(img) });
    });
    if (opts.spritesheets && frames[k]!.length) files.push({ path: `spritesheets/${prefix(k)}.png`, data: encodePng(strip(frames[k]!)) });
    const interval = fl(1 / Math.max(a.fps, 0.001));
    table.push(`  ${slugs[k]}: ${prefix(k)}_00.png… (${a.count} frames), ${fl(a.fps)} fps (time between frames ${interval} s), loop ${a.loop ? 'ON' : 'OFF'}`);
  });
  const anims = table.join('\n');
  const pixel = sheet.mode === 'pixel';

  const readme = `${name} - GDevelop 5

Animations (files of each animation):
${anims}
Frame size: ${sheet.cell.w}x${sheet.cell.h} px. Origin point: (${o.x}, ${o.y}) (feet).

[EN]
1. Create a "Sprite" object named "${name}".
2. For each animation, add an animation, click "Add images" and select ALL its PNGs at once
   (multi-select, see the list above). They are added ordered by name.${opts.spritesheets ? `
   Or with Piskel: open the animation with "Edit with Piskel", Import > spritesheets/<file>.png >
   "Import as spritesheet" with a frame size of ${sheet.cell.w}x${sheet.cell.h}; save and close Piskel.` : ''}
3. Set the time between frames to 1/fps (see the list above) and enable or disable "Loop" as listed.
4. Open the "Points" editor and set the point "Origin" to (${o.x}, ${o.y}) (the same for all frames:
   tick "Apply the same points to all frames"). The origin is at the feet, so an instance
   positioned at (x, y) stands on that spot.
${pixel ? `5. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)",
   and enable "Pixel rounding" if the camera moves.` : `5. Smooth art: keep the default scale mode ("Linear").`}

[ES]
1. Crea un objeto "Sprite" llamado "${name}".
2. Por cada animación, añade una animación, pulsa "Añadir imágenes" y selecciona TODOS sus PNG a la vez
   (selección múltiple, mira la lista de arriba). Se añaden ordenados por nombre.${opts.spritesheets ? `
   O con Piskel: abre la animación con "Editar con Piskel", Importar > spritesheets/<archivo>.png >
   "Importar como spritesheet" con un tamaño de frame de ${sheet.cell.w}x${sheet.cell.h}; guarda y cierra Piskel.` : ''}
3. Pon el tiempo entre fotogramas en 1/fps (ver lista arriba) y activa o desactiva "Bucle" según la lista.
4. Abre el editor de "Puntos" y pon el punto "Origin" (Origen) en (${o.x}, ${o.y}) (igual en todos los
   fotogramas: marca "Aplicar los mismos puntos a todos los fotogramas"). El origen está en los pies,
   así que una instancia colocada en (x, y) pisa ese punto.
${pixel ? `5. Pixel art: en las Propiedades del juego, pon "Modo de escalado (también llamado muestreo)" en
   "Nearest (sin antialiasing)" y activa el "Redondeo de píxeles" si la cámara se mueve.` : `5. Arte suave: deja el modo de escalado por defecto ("Linear").`}
`;
  files.push({ path: `README-${name}.txt`, data: readme });
  return files;
}
