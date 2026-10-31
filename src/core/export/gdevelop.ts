// GDevelop 5: one folder of numbered PNGs per animation (added with multi-select), plus one horizontal
// spritesheet strip per animation for the built-in Piskel editor ("Import as spritesheet"), and a README.
import { blit, createImage } from '../image.ts';
import type { ExportFile, RGBAImage, SpriteResult } from '../types.ts';
import { animFrames, animSlugs, feetOrigin, fl, slug } from './common.ts';
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

/**
 * GDevelop 5: `<name>/<anim>/<anim>_00.png…`, `<name>/spritesheets/<anim>.png` (one row, for Piskel) and
 * README.txt (en + es) with both import methods, the origin point and fps.
 */
export function gdevelopFrames(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const { sheet } = r;
  const slugs = animSlugs(sheet.anims);
  const frames = animFrames(r);
  const o = feetOrigin(sheet);
  const files: ExportFile[] = [];

  const table: string[] = [];
  sheet.anims.forEach((a, k) => {
    const digits = Math.max(2, String(Math.max(0, a.count - 1)).length);
    frames[k]!.forEach((img, i) => {
      files.push({ path: `${name}/${slugs[k]}/${slugs[k]}_${pad(i, digits)}.png`, data: encodePng(img) });
    });
    if (frames[k]!.length) files.push({ path: `${name}/spritesheets/${slugs[k]}.png`, data: encodePng(strip(frames[k]!)) });
    const interval = fl(1 / Math.max(a.fps, 0.001));
    table.push(`  ${slugs[k]}: ${a.count} frames, ${fl(a.fps)} fps (time between frames ${interval} s), loop ${a.loop ? 'ON' : 'OFF'}`);
  });
  const anims = table.join('\n');
  const pixel = sheet.mode === 'pixel';

  const readme = `${name} - GDevelop 5

Animations (folder = animation):
${anims}
Frame size: ${sheet.cell.w}x${sheet.cell.h} px. Origin point: (${o.x}, ${o.y}) (feet).

[EN]
Two ways to add each animation (pick one):
A) Frames: create a "Sprite" object named "${name}". For each animation, add an animation, click
   "Add images" and select ALL the PNGs of that animation's folder at once (multi-select). They are
   added ordered by name.
B) Spritesheet with Piskel: add an animation and open it with "Edit with Piskel". In Piskel use
   Import > choose spritesheets/<animation>.png > "Import as spritesheet" with a frame size of
   ${sheet.cell.w}x${sheet.cell.h}, then save and close Piskel: the frames appear in the animation.
3. Set the time between frames to 1/fps (see the list above) and enable or disable "Loop" as listed.
4. Open the "Points" editor and set the point "Origin" to (${o.x}, ${o.y}) (the same for all frames:
   tick "Apply the same points to all frames"). The origin is at the feet, so an instance
   positioned at (x, y) stands on that spot.
${pixel ? `5. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)",
   and enable "Pixel rounding" if the camera moves.` : `5. Smooth art: keep the default scale mode ("Linear").`}

[ES]
Dos formas de añadir cada animación (elige una):
A) Frames: crea un objeto "Sprite" llamado "${name}". Por cada animación, añade una animación, pulsa
   "Añadir imágenes" y selecciona TODOS los PNG de la carpeta de esa animación a la vez (selección
   múltiple). Se añaden ordenados por nombre.
B) Spritesheet con Piskel: añade una animación y ábrela con "Editar con Piskel". En Piskel usa
   Importar > elige spritesheets/<animación>.png > "Importar como spritesheet" con un tamaño de frame de
   ${sheet.cell.w}x${sheet.cell.h}; guarda y cierra Piskel: los frames aparecen en la animación.
3. Pon el tiempo entre fotogramas en 1/fps (ver lista arriba) y activa o desactiva "Bucle" según la lista.
4. Abre el editor de "Puntos" y pon el punto "Origin" (Origen) en (${o.x}, ${o.y}) (igual en todos los
   fotogramas: marca "Aplicar los mismos puntos a todos los fotogramas"). El origen está en los pies,
   así que una instancia colocada en (x, y) pisa ese punto.
${pixel ? `5. Pixel art: en las Propiedades del juego, pon "Modo de escalado (también llamado muestreo)" en
   "Nearest (sin antialiasing)" y activa el "Redondeo de píxeles" si la cámara se mueve.` : `5. Arte suave: deja el modo de escalado por defecto ("Linear").`}
`;
  files.push({ path: `${name}/README.txt`, data: readme });
  return files;
}
