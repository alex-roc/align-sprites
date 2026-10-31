// Godot 4: SpriteFrames .tres (AtlasTexture per frame) + AnimatedSprite2D .tscn with the origin at the feet.
import type { ExportFile, SpriteResult } from '../types.ts';
import { feetOrigin, fl, frameRect, sheetPng, slug } from './common.ts';

/** Godot string literal (double quoted, escaped). */
function gdString(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
}

/** Node name: PascalCase from the slug (`my_hero` → `MyHero`); Godot forbids `. : @ / " %` in names. */
function nodeName(name: string): string {
  return slug(name)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase() + p.slice(1))
    .join('');
}

function readme(name: string): string {
  return `${name} - Godot 4

[EN]
1. Copy this whole folder (${name}/) into your Godot project, e.g. res://sprites/${name}/.
   Keep the files together: ${name}.tres loads ${name}.png by relative path.
2. Drag ${name}.tscn into your scene (an AnimatedSprite2D, ready to play).
   Its origin is at the character's feet: placing it at a position puts the feet there.
3. ${name}.tres is a SpriteFrames resource: use it on any AnimatedSprite2D.
If ${name}.tres shows an error, reimport / rescan the project (Project > Reload Current Project)
and make sure ${name}.png is imported as Texture2D.

[ES]
1. Copia esta carpeta completa (${name}/) a tu proyecto de Godot, p. ej. res://sprites/${name}/.
   Mantén los archivos juntos: ${name}.tres carga ${name}.png con ruta relativa.
2. Arrastra ${name}.tscn a tu escena (un AnimatedSprite2D listo para reproducir).
   Su origen está en los pies del personaje: al colocarlo en una posición, los pies quedan ahí.
3. ${name}.tres es un recurso SpriteFrames: úsalo en cualquier AnimatedSprite2D.
Si ${name}.tres da error, reimporta / reescanea el proyecto (Proyecto > Recargar proyecto actual)
y comprueba que ${name}.png se importe como Texture2D.
`;
}

/**
 * Godot 4: `<name>/<name>.png`, `.tres` (SpriteFrames, AtlasTexture per frame, relative path, no uid),
 * `.tscn` (AnimatedSprite2D, centered=false, offset=(-floor(w/2), -(h-1-padBottom)) so the origin is at the feet,
 * texture_filter=1 in pixel mode, autoplay first anim). Plus README.txt (en + es).
 */
export function godotSpriteFrames(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const dir = `${name}/`;
  const { sheet } = r;

  const subs: string[] = [];
  const anims: string[] = [];
  for (const a of sheet.anims) {
    const frames: string[] = [];
    for (let i = 0; i < a.count; i++) {
      const id = `at_${a.row}_${i}`;
      const rc = frameRect(sheet, a.row, i);
      subs.push(`[sub_resource type="AtlasTexture" id="${id}"]\natlas = ExtResource("1_tex")\nregion = Rect2(${rc.x}, ${rc.y}, ${rc.w}, ${rc.h})\n`);
      frames.push(`{\n"duration": 1.0,\n"texture": SubResource("${id}")\n}`);
    }
    anims.push(
      `{\n"frames": [${frames.join(', ')}],\n"loop": ${a.loop ? 'true' : 'false'},\n"name": &${gdString(a.name)},\n"speed": ${fl(a.fps)}\n}`,
    );
  }
  const loadSteps = 1 + subs.length + 1;
  const tres =
    `[gd_resource type="SpriteFrames" load_steps=${loadSteps} format=3]\n\n` +
    `[ext_resource type="Texture2D" path="${name}.png" id="1_tex"]\n\n` +
    subs.join('\n') +
    (subs.length ? '\n' : '') +
    `[resource]\nanimations = [${anims.join(', ')}]\n`;

  const o = feetOrigin(sheet);
  const first = sheet.anims[0];
  const tscn =
    `[gd_scene load_steps=2 format=3]\n\n` +
    `[ext_resource type="SpriteFrames" path="${name}.tres" id="1"]\n\n` +
    `[node name=${gdString(nodeName(r.name))} type="AnimatedSprite2D"]\n` +
    (sheet.mode === 'pixel' ? 'texture_filter = 1\n' : '') +
    `sprite_frames = ExtResource("1")\n` +
    (first ? `animation = &${gdString(first.name)}\nautoplay = ${gdString(first.name)}\n` : '') +
    `centered = false\n` +
    `offset = Vector2(${-o.x}, ${-o.y})\n`;

  return [
    { path: `${dir}${name}.png`, data: sheetPng(r) },
    { path: `${dir}${name}.tres`, data: tres },
    { path: `${dir}${name}.tscn`, data: tscn },
    { path: `${dir}README.txt`, data: readme(name) },
  ];
}
