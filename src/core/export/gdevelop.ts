// GDevelop 5 has no spritesheet import: one folder per animation, PNGs ordered by name, plus a README with the steps.
import type { ExportFile, SpriteResult } from '../types.ts';
import { animFrames, animSlugs, feetOrigin, fl, slug } from './common.ts';
import { encodePng } from './png.ts';

function pad(i: number, n: number): string {
  return String(i).padStart(n, '0');
}

/** GDevelop 5: `<name>/<anim>/<anim>_00.png…` + README.txt (en + es) with import steps, origin point and fps. */
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
GDevelop cannot import spritesheets, so every animation is a folder of numbered PNGs.
1. Create a new object of type "Sprite" and name it "${name}".
2. For each animation: add an animation, click "Add a frame"/"Add images from files", open the
   animation's folder and select ALL its images at once (multi-select). They are added ordered by name.
3. Set the time between frames to 1/fps (see the list above) and enable or disable "Loop" as listed.
4. Open the "Points" editor and set the point "Origin" to (${o.x}, ${o.y}) (the same for all frames:
   tick "Apply the same points to all frames"). The origin is at the feet, so an instance
   positioned at (x, y) stands on that spot.
${pixel ? `5. Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)",
   and enable "Pixel rounding" if the camera moves.` : `5. Smooth art: keep the default scale mode ("Linear").`}

[ES]
GDevelop no puede importar spritesheets, así que cada animación es una carpeta de PNG numerados.
1. Crea un objeto nuevo de tipo "Sprite" y llámalo "${name}".
2. Por cada animación: añade una animación, pulsa "Añadir un fotograma"/"Añadir imágenes desde archivos",
   abre la carpeta de la animación y selecciona TODAS sus imágenes a la vez (selección múltiple).
   Se añaden ordenadas por nombre.
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
