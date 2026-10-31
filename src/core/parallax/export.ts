// Parallax exports per engine. Every engine gets the layer PNGs `<name>_<i>_<role>.png` (unique names, GDevelop keys
// images by file name) plus what it needs to scroll them: Godot a Parallax2D scene, GDevelop a README (Tiled Sprite +
// the "Parallax for Tiled Sprite" extension), Kaplay a snippet, generic a JSON.
import { fl, slug } from '../export/common.ts';
import { encodePng } from '../export/png.ts';
import type { ExportFile, ExportTarget } from '../types.ts';
import type { ParallaxLayer, ParallaxResult } from './build.ts';

const pascal = (s: string): string => slug(s).split(/[_-]+/).filter(Boolean).map((p) => p[0]!.toUpperCase() + p.slice(1)).join('');
const gdString = (s: string): string => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

const fileOf = (n: string, l: ParallaxLayer, i: number): string => `${n}_${i}_${l.role}.png`;
const loopsX = (l: ParallaxLayer): boolean => l.loop.applied || l.loop.alreadyLoops;
const pngs = (r: ParallaxResult, n: string): ExportFile[] => r.layers.map((l, i) => ({ path: fileOf(n, l, i), data: encodePng(l.image) }));

// ---------------------------------------------------------------- Godot 4

/**
 * Godot ≥ 4.3: `<name>.tscn` = Node2D with one Parallax2D per layer (`scroll_scale = (factor, 1)`, `repeat_size =
 * (width, 0)`) holding a Sprite2D (`centered = false`, nearest filter for pixel art). Relative paths, no uid.
 */
export function parallaxGodot(r: ParallaxResult, name: string): ExportFile[] {
  const n = slug(name);
  const ids = r.layers.map((l, i) => `${i + 1}_${l.role}`);
  const head = `[gd_scene load_steps=${r.layers.length + 1} format=3]\n\n`;
  const res = r.layers.map((l, i) => `[ext_resource type="Texture2D" path=${gdString(fileOf(n, l, i))} id="${ids[i]}"]\n`).join('');
  const nodes = r.layers
    .map((l, i) => {
      const node = pascal(l.role);
      return (
        `\n[node name="${node}" type="Parallax2D" parent="."]\n` +
        `scroll_scale = Vector2(${fl(l.factor)}, 1)\n` +
        `repeat_size = Vector2(${l.image.width}, 0)\n` +
        `\n[node name="Sprite2D" type="Sprite2D" parent="${node}"]\n` +
        (r.mode === 'pixel' ? 'texture_filter = 1\n' : '') +
        `texture = ExtResource("${ids[i]}")\n` +
        `centered = false\n`
      );
    })
    .join('');
  const tscn = `${head}${res}\n[node name=${gdString(pascal(name) || 'Parallax')} type="Node2D"]\n${nodes}`;
  return [...pngs(r, n), { path: `${n}.tscn`, data: tscn }, { path: 'README.txt', data: godotReadme(r, n) }];
}

function godotReadme(r: ParallaxResult, n: string): string {
  const list = r.layers.map((l, i) => `   ${fileOf(n, l, i)}  ${l.image.width}x${l.image.height}  scroll ${fl(l.factor)}`).join('\n');
  return `${n} - parallax background, Godot 4.3 or newer

Layers (far to near):
${list}

[EN]
1. Copy this whole folder (${n}/) into your Godot project, e.g. res://backgrounds/${n}/.
   Keep the files together: ${n}.tscn loads the PNGs by relative path.
2. Drag ${n}.tscn into your level scene. Each layer is a Parallax2D with a Sprite2D: scroll_scale is the factor
   (0 = fixed to the screen, 1 = moves with the camera) and repeat_size is the layer width, so it loops sideways.
3. You need a Camera2D in the scene. Set the node's position so the layers sit where you want (the layers are ${r.height} px high).
   Pixel art: set Project Settings, Rendering, Textures, Default Texture Filter to Nearest.
Parallax2D does not exist before Godot 4.3: with 4.2 or older use ParallaxBackground and ParallaxLayer instead.

[ES]
1. Copia esta carpeta completa (${n}/) a tu proyecto de Godot, p. ej. res://backgrounds/${n}/.
   Mantén los archivos juntos: ${n}.tscn carga los PNG con ruta relativa.
2. Arrastra ${n}.tscn a la escena de tu nivel. Cada capa es un Parallax2D con un Sprite2D: scroll_scale es el factor
   (0 = fija a la pantalla, 1 = se mueve con la cámara) y repeat_size es el ancho de la capa, así se repite hacia los lados.
3. Necesitas una Camera2D en la escena. Cambia la posición del nodo para colocar las capas donde quieras (miden ${r.height} px de alto).
   Pixel art: en Ajustes del proyecto, Rendering, Textures, pon Default Texture Filter en Nearest.
Parallax2D no existe antes de Godot 4.3: con 4.2 o anterior usa ParallaxBackground y ParallaxLayer.
`;
}

// ---------------------------------------------------------------- GDevelop 5

export function parallaxGdevelop(r: ParallaxResult, name: string): ExportFile[] {
  const n = slug(name);
  const list = r.layers.map((l, i) => `  ${fileOf(n, l, i)}   ${l.image.width}x${l.image.height} px   parallax factor ${fl(l.factor)}`).join('\n');
  const first = r.layers[0]!;
  const pixel = r.mode === 'pixel';
  const readme = `${n} - parallax background, GDevelop 5

Layers (far to near):
${list}

[EN]
GDevelop has an official extension for this: "Parallax for Tiled Sprite" (Project Manager, Extensions, Search for new
extensions). Install it once.
1. Create a Tiled Sprite object for each PNG (New object, Tiled Sprite) and give it its image.
2. Make a scene layer for each one (Layers panel, e.g. "bg_far", "bg_near"), placed behind your gameplay layer, and put
   the object on it. The layer of the object must not move: the extension follows the camera of another layer.
3. Set each object's width to your game width (it repeats the image sideways) and its height to ${r.height}
   (the image height), with its position at 0, 0.
4. Add the behavior "Horizontal Parallax for a Tiled Sprite" to each object and set "Parallax factor" to the number in
   the list above (0 = fixed, 1 = moves with the camera). Leave "Layer to be followed" empty for the base layer.
Without the extension, use one event per layer instead: no condition, action "Change the image X offset" of the Tiled
Sprite to CameraX("") * factor (for ${first.role}: CameraX("") * ${fl(first.factor)}).
${pixel ? `Pixel art: in Project properties, set "Scale mode (also called sampling)" to "Nearest (no antialiasing)".` : `Smooth art: keep the default scale mode ("Linear").`}

[ES]
GDevelop tiene una extensión oficial para esto: "Parallax for Tiled Sprite" (Gestor del proyecto, Extensiones, Buscar
nuevas extensiones). Instálala una vez.
1. Crea un objeto Sprite en mosaico (Tiled Sprite) por cada PNG (Nuevo objeto, Tiled Sprite) y ponle su imagen.
2. Crea una capa de escena para cada uno (panel Capas, p. ej. "bg_far", "bg_near"), detrás de tu capa de juego, y mete
   el objeto en ella. La capa del objeto no debe moverse: la extensión sigue la cámara de otra capa.
3. Pon el ancho de cada objeto igual al ancho de tu juego (repite la imagen hacia los lados) y el alto en ${r.height}
   (el alto de la imagen), con la posición en 0, 0.
4. Añade a cada objeto el comportamiento "Horizontal Parallax for a Tiled Sprite" y pon "Parallax factor" con el número
   de la lista de arriba (0 = fija, 1 = se mueve con la cámara). Deja "Layer to be followed" vacío para la capa base.
Sin la extensión, usa un evento por capa: sin condición, acción "Cambiar el desplazamiento X de la imagen" del Tiled
Sprite a CameraX("") * factor (para ${first.role}: CameraX("") * ${fl(first.factor)}).
${pixel ? `Pixel art: en Propiedades del proyecto, pon "Modo de escala (muestreo)" en "Nearest (sin antialiasing)".` : `Arte suave: deja el modo de escala por defecto ("Linear").`}
`;
  return [...pngs(r, n), { path: 'README.txt', data: readme }];
}

// ---------------------------------------------------------------- Kaplay

export function parallaxKaplay(r: ParallaxResult, name: string): ExportFile[] {
  const n = slug(name);
  const layers = r.layers.map((l, i) => `  { sprite: ${JSON.stringify(fileOf(n, l, i).replace(/\.png$/, ''))}, w: ${l.image.width}, factor: ${fl(l.factor)} },`);
  const js = `// ${n}: parallax background, ${r.layers.length} layer${r.layers.length === 1 ? '' : 's'}, each ${r.height} px high (far to near).
// Make the game ${r.height} px high, e.g. kaplay({ width: ${Math.round((r.height * 16) / 9)}, height: ${r.height}${r.mode === 'pixel' ? ', crisp: true, texFilter: "nearest"' : ''} }).
const LAYERS = [
${layers.join('\n')}
];
for (const l of LAYERS) loadSprite(l.sprite, l.sprite + ".png");

// Draws every layer as many times as the screen needs, behind everything else (z = -100).
// factor 0 = fixed to the screen, 1 = moves with the camera (move the camera with camPos).
add([
  z(-100),
  {
    draw() {
      const left = camPos().x - width() / 2;
      for (const l of LAYERS) {
        // In the world the layer moves (1 - factor) of the camera, so on screen it slides by camera x factor.
        const offset = (1 - l.factor) * left;
        for (let x = offset + Math.floor((left - offset) / l.w) * l.w; x < left + width(); x += l.w) {
          drawSprite({ sprite: l.sprite, pos: vec2(x, 0) });
        }
      }
    },
  },
]);
`;
  return [...pngs(r, n), { path: `${n}.js`, data: js }];
}

// ---------------------------------------------------------------- generic

/** Layer PNGs + `<name>.json` (file, role, size, factor, whether it repeats sideways). */
export function parallaxGeneric(r: ParallaxResult, name: string): ExportFile[] {
  const n = slug(name);
  const json = {
    name: n,
    mode: r.mode,
    height: r.height,
    layers: r.layers.map((l, i) => ({
      file: fileOf(n, l, i),
      role: l.role,
      width: l.image.width,
      height: l.image.height,
      factor: Math.round(l.factor * 1000) / 1000,
      loopX: loopsX(l),
    })),
  };
  return [...pngs(r, n), { path: `${n}.json`, data: JSON.stringify(json, null, 2) + '\n' }];
}

const EXPORTERS: Record<ExportTarget, (r: ParallaxResult, name: string) => ExportFile[]> = {
  godot: parallaxGodot,
  gdevelop: parallaxGdevelop,
  kaplay: parallaxKaplay,
  generic: parallaxGeneric,
};

/** The requested engines, each under `<name>/` (one engine) or `<engine>/<name>/` (several). */
export function parallaxExport(r: ParallaxResult, name: string, targets: ExportTarget[]): ExportFile[] {
  const n = slug(name);
  const prefix = targets.length > 1;
  return targets.flatMap((t) => EXPORTERS[t](r, name).map((f) => ({ ...f, path: `${prefix ? `${t}/` : ''}${n}/${f.path}` })));
}
