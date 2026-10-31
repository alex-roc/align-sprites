// `prompt <kind>`: the app's prompt (en/es) and the guide image to attach, so an agent can generate with an image
// model and then normalize the result with `sprite`, `tiles`, `items`, `parallax`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { encodePng } from '../src/core/export/index.ts';
import {
  ASSET_PROMPT_DEFAULTS, ATLAS_GUTTER, EFFECT_KINDS, ITEMS_SAFE, PARALLAX_ASPECTS, PARALLAX_LAYERS, buildAtlasPrompt, buildDirectionsPrompt,
  buildEffectPrompt, buildItemsPrompt, buildParallaxPrompt, buildVideoPrompt, directionRows, makeParallaxGuide, makeSheetGuide,
  type EffectKind, type ParallaxAspect, type ParallaxLayer,
} from '../src/core/prompts/assets.ts';
import { buildSpritePrompt, buildTilePrompt, gridRows, makeGuideImage, suggestKey, type KeyColor, type Lang } from '../src/core/prompts/index.ts';
import type { RGBAImage } from '../src/core/types.ts';
import { UsageError, flag, int, mode as modeOpt, oneOf, parse, printJson, str, type Values } from './common.ts';

const KINDS = ['sprite', 'tile', 'atlas', 'directions', 'effects', 'items', 'parallax', 'video'] as const;
type Kind = (typeof KINDS)[number];

/** Same cell size as the app's guide images. */
const GUIDE_CELL = 256;

const USAGE = `Usage: align-sprites prompt <kind> [options]

Prints the prompt to give an image model (stdout) and, with --guide, writes the guide image to attach to it.
Kinds and what they need (the generated image goes to the command in brackets):
  sprite       --subject --action [--frames 8 --cols 4 --height 32 --view side]        [sprite]
  directions   --subject [--frames 4 --three-rows --height 32]  top-down walk, 4 rows  [sprite --rows-as-anims]
  effects      --effect explosion|hit|magic|smoke|projectile --description [--frames 8 --cols 4 --size 32] [sprite --anchor center]
  tile         --material [--size 32 --view top-down|side]  ONE seamless texture, no guide  [terrain / tiles]
  atlas        --theme [--cols 6 --rows 4 --size 32 --view side|top-down]               [tiles]
  items        --items "gold coin, red potion" [--cols 4 --rows 2 --size 32]            [items]
  parallax     --layer far|mid|near --theme [--aspect 16:9|2:1|3:1 --height 180]        [parallax]
  video        --subject [--action run --seconds 3 --view side --no-first-frame]  video model, no guide  [sprite --mode cartoon]
Common
  --lang en|es          language of the prompt (default en)
  --mode pixel|cartoon  art style (default pixel; cartoon for video)
  --key magenta|green   chroma key background (default: green for pink/purple subjects, else magenta; green for video)
  --ref                 the prompt assumes a reference image of the character/style is attached (consistency)
  --guide out.png       write the guide image (sprite, directions, effects, atlas, items, parallax)
  --json                print {kind, prompt, guide, key, ...} as JSON`;

const OPTS = {
  lang: { type: 'string' }, mode: { type: 'string' }, key: { type: 'string' }, ref: { type: 'boolean' }, guide: { type: 'string' }, json: { type: 'boolean' },
  subject: { type: 'string' }, action: { type: 'string' }, view: { type: 'string' }, frames: { type: 'string' }, cols: { type: 'string' },
  rows: { type: 'string' }, height: { type: 'string' }, size: { type: 'string' }, 'three-rows': { type: 'boolean' }, effect: { type: 'string' },
  description: { type: 'string' }, material: { type: 'string' }, theme: { type: 'string' }, items: { type: 'string' }, layer: { type: 'string' },
  aspect: { type: 'string' }, seconds: { type: 'string' }, 'no-first-frame': { type: 'boolean' },
} as const;

function need(v: Values, k: string, kind: Kind): string {
  const s = str(v, k)?.trim();
  if (!s) throw new UsageError(`prompt ${kind}: --${k} is required (e.g. --${k} "...")\n\n${USAGE}`);
  return s;
}

interface Built {
  prompt: string;
  guide: RGBAImage | null;
  guideName: string;
  grid?: { cols: number; rows: number };
}

function build(kind: Kind, v: Values, lang: Lang, mode: 'pixel' | 'cartoon', key: KeyColor): Built {
  const withReference = flag(v, 'ref');
  const D = ASSET_PROMPT_DEFAULTS;
  switch (kind) {
    case 'sprite': {
      const frames = int(v, 'frames') ?? 8;
      const cols = int(v, 'cols') ?? 4;
      const rows = gridRows(frames, cols);
      const prompt = buildSpritePrompt({
        lang, mode, subject: need(v, 'subject', kind), action: str(v, 'action') ?? 'walk', frames, cols, artHeight: int(v, 'height') ?? 32,
        view: oneOf(v, 'view', ['side', 'top-down', 'front', 'three-quarter'], 'side'), key, withReference,
      });
      return { prompt, guide: makeGuideImage({ cols, rows, cell: GUIDE_CELL, key, baseline: 0.9 }), guideName: `guide-${cols}x${rows}-${key}.png`, grid: { cols, rows } };
    }
    case 'tile': {
      const prompt = buildTilePrompt({ lang, mode, material: need(v, 'material', kind), tileSize: int(v, 'size') ?? 32, view: oneOf(v, 'view', ['top-down', 'side'], 'top-down') });
      return { prompt, guide: null, guideName: '' };
    }
    case 'atlas': {
      const cols = Math.max(1, int(v, 'cols') ?? D.atlas.cols), rows = Math.max(1, int(v, 'rows') ?? D.atlas.rows);
      const prompt = buildAtlasPrompt({
        lang, mode, theme: need(v, 'theme', kind), cols, rows, tileSize: int(v, 'size') ?? D.atlas.tileSize, view: oneOf(v, 'view', ['side', 'top-down'], 'side'), key, withReference,
      });
      const guide = makeSheetGuide({ cols, rows, cell: GUIDE_CELL, gutter: Math.round(GUIDE_CELL * ATLAS_GUTTER), key });
      return { prompt, guide, guideName: `guide-atlas-${cols}x${rows}-${key}.png`, grid: { cols, rows } };
    }
    case 'directions': {
      const frames = Math.max(2, int(v, 'frames') ?? D.directions.frames);
      const threeRows = flag(v, 'three-rows');
      const dirs = directionRows(threeRows);
      const prompt = buildDirectionsPrompt({ lang, mode, subject: need(v, 'subject', kind), frames, threeRows, artHeight: int(v, 'height') ?? D.directions.artHeight, key, withReference });
      const guide = makeSheetGuide({ cols: frames, rows: dirs.length, cell: GUIDE_CELL, key, baseline: 0.9, arrows: dirs, numberByRow: true });
      return { prompt, guide, guideName: `guide-directions-${frames}x${dirs.length}-${key}.png`, grid: { cols: frames, rows: dirs.length } };
    }
    case 'effects': {
      const frames = int(v, 'frames') ?? D.effects.frames;
      const cols = Math.max(1, int(v, 'cols') ?? D.effects.cols);
      const rows = gridRows(frames, cols);
      const prompt = buildEffectPrompt({
        lang, mode, kind: oneOf<EffectKind>(v, 'effect', EFFECT_KINDS, 'explosion'), description: need(v, 'description', kind), frames, cols, artSize: int(v, 'size') ?? D.effects.artSize, key,
      });
      return { prompt, guide: makeSheetGuide({ cols, rows, cell: GUIDE_CELL, key, cross: true }), guideName: `guide-effects-${cols}x${rows}-${key}.png`, grid: { cols, rows } };
    }
    case 'items': {
      const cols = Math.max(1, int(v, 'cols') ?? D.items.cols), rows = Math.max(1, int(v, 'rows') ?? D.items.rows);
      const prompt = buildItemsPrompt({ lang, mode, items: need(v, 'items', kind), cols, rows, artSize: int(v, 'size') ?? D.items.artSize, key, withReference });
      return { prompt, guide: makeSheetGuide({ cols, rows, cell: GUIDE_CELL, key, safe: ITEMS_SAFE }), guideName: `guide-items-${cols}x${rows}-${key}.png`, grid: { cols, rows } };
    }
    case 'parallax': {
      const layer = oneOf<ParallaxLayer>(v, 'layer', PARALLAX_LAYERS, 'far');
      const aspect = oneOf<ParallaxAspect>(v, 'aspect', PARALLAX_ASPECTS, '16:9');
      const prompt = buildParallaxPrompt({ lang, mode, layer, theme: need(v, 'theme', kind), aspect, artHeight: int(v, 'height') ?? D.parallax.artHeight, key, withReference });
      return { prompt, guide: makeParallaxGuide({ aspect, layer, key }), guideName: `guide-parallax-${layer}-${aspect.replace(':', 'x')}-${key}.png` };
    }
    case 'video': {
      const prompt = buildVideoPrompt({
        lang, mode, subject: need(v, 'subject', kind), action: str(v, 'action') ?? D.video.action, seconds: int(v, 'seconds') ?? D.video.seconds,
        view: oneOf(v, 'view', ['side', 'top-down', 'front', 'three-quarter'], 'side'), key, withFirstFrame: !flag(v, 'no-first-frame'),
      });
      return { prompt, guide: null, guideName: '' };
    }
  }
}

export async function promptCommand(argv: string[]): Promise<void> {
  const parsed = parse(argv, OPTS, USAGE);
  if (!parsed) return;
  const { v, pos } = parsed;
  if (pos.length !== 1 || !(KINDS as readonly string[]).includes(pos[0])) throw new UsageError(`prompt: expected one kind of ${KINDS.join(', ')}\n\n${USAGE}`);
  const kind = pos[0] as Kind;
  const lang = oneOf<Lang>(v, 'lang', ['en', 'es'], 'en');
  const mode = str(v, 'mode') ? modeOpt(v) : kind === 'video' ? ASSET_PROMPT_DEFAULTS.video.mode : 'pixel';
  const subject = str(v, 'subject') ?? str(v, 'theme') ?? str(v, 'items') ?? str(v, 'material') ?? str(v, 'description') ?? '';
  const suggested: KeyColor = kind === 'video' ? ASSET_PROMPT_DEFAULTS.video.key : suggestKey(subject);
  const key = oneOf<KeyColor>(v, 'key', ['magenta', 'green'], suggested);
  if (str(v, 'key') && key !== suggested && kind !== 'video') {
    console.error(`note: "${suggested}" would collide less with the colours of the subject; using "${key}" as asked`);
  }

  const b = build(kind, v, lang, mode, key);
  let guidePath: string | null = null;
  const wanted = str(v, 'guide');
  if (wanted) {
    if (!b.guide) console.error(`note: the ${kind} prompt has no guide image (nothing written)`);
    else {
      // A directory (or no .png) gets the app's file name inside it.
      guidePath = resolve(/\.png$/i.test(wanted) ? wanted : `${wanted}/${b.guideName}`);
      mkdirSync(dirname(guidePath), { recursive: true });
      writeFileSync(guidePath, encodePng(b.guide));
      console.error(`Guide written to ${guidePath}`);
    }
  }
  if (flag(v, 'json')) printJson({ kind, lang, mode, key, grid: b.grid ?? null, guide: guidePath, prompt: b.prompt });
  else console.log(b.prompt);
}
