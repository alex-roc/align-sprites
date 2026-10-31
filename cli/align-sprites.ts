#!/usr/bin/env node
// align-sprites CLI (internal use): the processing core of the web app, from the command line.
// Thin layer over src/core (same code the browser worker runs); each command lives in its own module.
// Node >= 24 runs this .ts directly: `node cli/align-sprites.ts --help`.
import { CliError, UsageError } from './common.ts';
import { promptCommand } from './prompt.ts';
import { inspectCommand, spriteCommand } from './sprite.ts';
import { itemsCommand, parallaxCommand, terrainCommand, tilesCommand } from './tiles.ts';

const USAGE = `align-sprites: AI sprites, tiles, items and parallax layers -> game-ready assets for Godot, GDevelop and Kaplay

Usage: align-sprites <command> [options]   (each command has --help)

  prompt <kind>       the prompt for an image model + the guide image to attach (sprite, directions, effects,
                      tile, atlas, items, parallax, video)
  inspect <img...>    type (sheet/single), background, frames, source height
  sprite <img...>     normalize sheets/sprites to one shared height; Godot, GDevelop, Kaplay, generic export
  tiles <atlas>       tile sheet -> atlas of exact tiles (+ Godot TileSet / Tiled .tsx)
  terrain <A> [B]     transition tiles between two seamless textures (blob47 / dual16)
  items <img>         many objects in one image -> atlas of square cells + one file per item
  parallax <layers..> background layers far->near -> looping layers + scroll factors

Flow: prompt -> generate the image with the guide attached -> inspect -> sprite/tiles/items/parallax -> copy the
output into the game project. Visual check in the web app: https://alex-roc.github.io/align-sprites/
Only PNG input. Exit code: 0 ok, 1 processing error, 2 wrong command line.`;

const COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  prompt: promptCommand,
  inspect: inspectCommand,
  sprite: spriteCommand,
  tiles: tilesCommand,
  terrain: terrainCommand,
  items: itemsCommand,
  parallax: parallaxCommand,
};

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    console.log(USAGE);
    return cmd ? 0 : 2;
  }
  const run = COMMANDS[cmd];
  if (!run) {
    console.error(`align-sprites: unknown command "${cmd}"\n\n${USAGE}`);
    return 2;
  }
  try {
    await run(rest);
    return 0;
  } catch (e) {
    if (e instanceof UsageError) {
      console.error(`align-sprites: ${e.message}`);
      return 2;
    }
    console.error(`align-sprites: ${e instanceof CliError ? e.message : e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
