// Godot 4: SpriteFrames .tres (AtlasTexture per frame) + AnimatedSprite2D .tscn with the origin at the feet.
import type { ExportFile, PackedSheet, SpriteResult } from '../types.ts';
import { feetOrigin, fl, frameRect, isCenter, isStatic, r2, sheetOrigin, sheetPng, slug } from './common.ts';

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

/** README (en + es) of a sprite folder; the origin sentence and the body scene step depend on the sheet. */
function readme(name: string, sheet: PackedSheet, animated: boolean): string {
  const file = animated ? `${name}.tres` : `${name}.tscn`;
  const node = animated ? 'an AnimatedSprite2D, ready to play' : 'a Sprite2D';
  const nodeEs = animated ? 'un AnimatedSprite2D listo para reproducir' : 'un Sprite2D';
  const center = isCenter(sheet);
  const originEn = center
    ? `Its origin is at the centre of the frame: placing it at a position puts the effect's centre there.`
    : `Its origin is at the character's feet: placing it at a position puts the feet there.`;
  const originEs = center
    ? `Su origen está en el centro del cuadro: al colocarlo en una posición, el centro del efecto queda ahí.`
    : `Su origen está en los pies del personaje: al colocarlo en una posición, los pies quedan ahí.`;
  const bodyEn = sheet.collision
    ? `\n${animated ? '4' : '3'}. ${name}_body.tscn is the same sprite inside a CharacterBody2D with a CollisionShape2D (a rectangle,
   ${center ? 'centred on the effect' : 'standing on the feet'}): use it for the player or an enemy, or copy the shape. Resize the shape if you need a tighter hitbox.`
    : '';
  const bodyEs = sheet.collision
    ? `\n${animated ? '4' : '3'}. ${name}_body.tscn es el mismo sprite dentro de un CharacterBody2D con un CollisionShape2D (un rectángulo,
   ${center ? 'centrado en el efecto' : 'apoyado en los pies'}): úsalo para el jugador o un enemigo, o copia la forma. Cambia el tamaño de la forma si quieres una caja más ajustada.`
    : '';
  return `${name} - Godot 4

[EN]
1. Copy this whole folder (${name}/) into your Godot project, e.g. res://sprites/${name}/.
   Keep the files together: ${file} loads ${name}.png by relative path.
2. Drag ${name}.tscn into your scene (${node}).
   ${originEn}${animated ? `
3. ${name}.tres is a SpriteFrames resource: use it on any AnimatedSprite2D.` : ''}${bodyEn}
If ${file} shows an error, reimport / rescan the project (Project > Reload Current Project)
and make sure ${name}.png is imported as Texture2D.

[ES]
1. Copia esta carpeta completa (${name}/) a tu proyecto de Godot, p. ej. res://sprites/${name}/.
   Mantén los archivos juntos: ${file} carga ${name}.png con ruta relativa.
2. Arrastra ${name}.tscn a tu escena (${nodeEs}).
   ${originEs}${animated ? `
3. ${name}.tres es un recurso SpriteFrames: úsalo en cualquier AnimatedSprite2D.` : ''}${bodyEs}
Si ${file} da error, reimporta / reescanea el proyecto (Proyecto > Recargar proyecto actual)
y comprueba que ${name}.png se importe como Texture2D.
`;
}

/** Sprite placement lines: feet = top-left drawn at -origin; centre = Godot's default (centred on the node). */
function placement(sheet: PackedSheet): string {
  if (isCenter(sheet)) return 'centered = true\n';
  const o = feetOrigin(sheet);
  return `centered = false\noffset = Vector2(${-o.x}, ${-o.y})\n`;
}

/**
 * `<name>_body.tscn`: a CharacterBody2D at the sprite's origin with the sprite as a child (same placement as
 * `<name>.tscn`) and a CollisionShape2D whose RectangleShape2D is the automatic collision box of the sheet.
 * Only when the sheet has one (the pipeline always computes it).
 */
function bodyScene(r: SpriteResult, animated: boolean): ExportFile[] {
  const { sheet } = r;
  const box = sheet.collision;
  if (!box) return [];
  const name = slug(r.name);
  const o = sheetOrigin(sheet);
  const pos = { x: r2(box.x + box.w / 2 - o.x), y: r2(box.y + box.h / 2 - o.y) };
  const first = sheet.anims[0];
  const sprite = animated
    ? `[ext_resource type="SpriteFrames" path="${name}.tres" id="1"]\n\n`
    : `[ext_resource type="Texture2D" path="${name}.png" id="1"]\n\n`;
  const tscn =
    `[gd_scene load_steps=3 format=3]\n\n` +
    sprite +
    `[sub_resource type="RectangleShape2D" id="shape"]\nsize = Vector2(${fl(r2(box.w))}, ${fl(r2(box.h))})\n\n` +
    `[node name=${gdString(nodeName(r.name))} type="CharacterBody2D"]\n\n` +
    (animated
      ? `[node name="AnimatedSprite2D" type="AnimatedSprite2D" parent="."]\n`
      : `[node name="Sprite2D" type="Sprite2D" parent="."]\n`) +
    (sheet.mode === 'pixel' ? 'texture_filter = 1\n' : '') +
    (animated
      ? `sprite_frames = ExtResource("1")\n` + (first ? `animation = &${gdString(first.name)}\nautoplay = ${gdString(first.name)}\n` : '')
      : `texture = ExtResource("1")\n`) +
    placement(sheet) +
    `\n[node name="CollisionShape2D" type="CollisionShape2D" parent="."]\n` +
    `position = Vector2(${fl(pos.x)}, ${fl(pos.y)})\n` +
    `shape = SubResource("shape")\n`;
  return [{ path: `${slug(r.name)}/${name}_body.tscn`, data: tscn }];
}

/** Static sprite (one animation, one frame): `<name>.png` + a Sprite2D `.tscn`, no SpriteFrames. */
function godotStatic(r: SpriteResult): ExportFile[] {
  const name = slug(r.name);
  const dir = `${name}/`;
  const tscn =
    `[gd_scene load_steps=2 format=3]\n\n` +
    `[ext_resource type="Texture2D" path="${name}.png" id="1"]\n\n` +
    `[node name=${gdString(nodeName(r.name))} type="Sprite2D"]\n` +
    (r.sheet.mode === 'pixel' ? 'texture_filter = 1\n' : '') +
    `texture = ExtResource("1")\n` +
    placement(r.sheet);
  return [
    { path: `${dir}${name}.png`, data: sheetPng(r) },
    { path: `${dir}${name}.tscn`, data: tscn },
    ...bodyScene(r, false),
    { path: `${dir}README.txt`, data: readme(name, r.sheet, false) },
  ];
}

/**
 * Godot 4: `<name>/<name>.png`, `.tres` (SpriteFrames, AtlasTexture per frame, relative path, no uid),
 * `.tscn` (AnimatedSprite2D, centered=false, offset=(-floor(w/2), -(h-1-padBottom)) so the origin is at the feet,
 * texture_filter=1 in pixel mode, autoplay first anim; centred sprites use centered=true and no offset),
 * `_body.tscn` (CharacterBody2D + the sprite + a CollisionShape2D with the automatic collision box), README.txt (en + es).
 * A single-frame sheet exports as a static Sprite2D instead (png + tscn, no .tres).
 */
export function godotSpriteFrames(r: SpriteResult): ExportFile[] {
  if (isStatic(r.sheet)) return godotStatic(r);
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

  const first = sheet.anims[0];
  const tscn =
    `[gd_scene load_steps=2 format=3]\n\n` +
    `[ext_resource type="SpriteFrames" path="${name}.tres" id="1"]\n\n` +
    `[node name=${gdString(nodeName(r.name))} type="AnimatedSprite2D"]\n` +
    (sheet.mode === 'pixel' ? 'texture_filter = 1\n' : '') +
    `sprite_frames = ExtResource("1")\n` +
    (first ? `animation = &${gdString(first.name)}\nautoplay = ${gdString(first.name)}\n` : '') +
    placement(sheet);

  return [
    { path: `${dir}${name}.png`, data: sheetPng(r) },
    { path: `${dir}${name}.tres`, data: tres },
    { path: `${dir}${name}.tscn`, data: tscn },
    ...bodyScene(r, true),
    { path: `${dir}README.txt`, data: readme(name, sheet, true) },
  ];
}
