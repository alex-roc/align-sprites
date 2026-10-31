// Shared plumbing of the CLI: argument parsing, image/palette/target readers, translated warnings, output writer.
// The commands stay thin: everything that processes pixels is src/core, the same code the web app runs in its worker.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';
import { slug, zipFiles } from '../src/core/export/index.ts';
import { decodePng } from '../src/core/export/png.ts';
import { PALETTES, hexToRgba, parsePalette } from '../src/core/palette/index.ts';
import { unfakeFromBytes, type UnfakeCore } from '../src/core/pixel/unfake.ts';
import type { ArtMode, ExportFile, ExportTarget, RGBA8, RGBAImage, Warning } from '../src/core/types.ts';
import { en } from '../src/i18n/en.ts';

/** A runtime failure (bad file, nothing found): message on stderr, exit code 1. */
export class CliError extends Error {}
/** A wrong command line: message + usage on stderr, exit code 2. */
export class UsageError extends Error {}

export type Values = Record<string, string | boolean | (string | boolean)[] | undefined>;

/** Parses `argv` against `options` (+ `--help`); returns null after printing the usage when help was asked. */
export function parse(argv: string[], options: ParseArgsOptionsConfig, usage: string): { v: Values; pos: string[] } | null {
  let r;
  try {
    r = parseArgs({ args: argv, options: { ...options, help: { type: 'boolean', short: 'h' } }, allowPositionals: true });
  } catch (e) {
    throw new UsageError(`${e instanceof Error ? e.message : String(e)}\n\n${usage}`);
  }
  if (r.values.help) {
    console.log(usage);
    return null;
  }
  return { v: r.values as Values, pos: r.positionals };
}

export const str = (v: Values, k: string): string | undefined => {
  const x = v[k];
  return typeof x === 'string' ? x : undefined;
};
export const flag = (v: Values, k: string): boolean => v[k] === true;
export const strs = (v: Values, k: string): string[] => {
  const x = v[k];
  return Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : typeof x === 'string' ? [x] : [];
};
export function num(v: Values, k: string): number | undefined {
  const s = str(v, k);
  if (s === undefined) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new UsageError(`--${k}: "${s}" is not a number`);
  return n;
}
/** Positive integer option. */
export function int(v: Values, k: string): number | undefined {
  const n = num(v, k);
  if (n !== undefined && (!Number.isInteger(n) || n < 0)) throw new UsageError(`--${k}: "${n}" is not a whole number >= 0`);
  return n;
}
export function oneOf<T extends string>(v: Values, k: string, allowed: readonly T[], fallback: T): T {
  const s = str(v, k);
  if (s === undefined) return fallback;
  if (!(allowed as readonly string[]).includes(s)) throw new UsageError(`--${k}: "${s}" is not one of ${allowed.join(', ')}`);
  return s as T;
}

export const mode = (v: Values): ArtMode => oneOf(v, 'mode', ['pixel', 'cartoon'], 'pixel');

/** "RxC" (rows x columns, as everywhere in the app) → numbers. */
export function parseGrid(text: string, opt = 'grid'): { rows: number; cols: number } {
  const m = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(text.trim());
  if (!m || +m[1] < 1 || +m[2] < 1) throw new UsageError(`--${opt}: expected ROWSxCOLS, e.g. 2x4 (got "${text}")`);
  return { rows: +m[1], cols: +m[2] };
}

export const ALL_TARGETS: ExportTarget[] = ['godot', 'gdevelop', 'kaplay', 'generic'];

/** "godot,kaplay" or "all". */
export function parseTargets(text: string | undefined): ExportTarget[] {
  if (!text || text === 'all') return [...ALL_TARGETS];
  const out = text.split(',').map((s) => s.trim()).filter(Boolean);
  for (const t of out) if (!(ALL_TARGETS as string[]).includes(t)) throw new UsageError(`--target: "${t}" is not one of ${ALL_TARGETS.join(', ')}, all`);
  return [...new Set(out)] as ExportTarget[];
}

// ---------------------------------------------------------------- files

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

export function loadImage(file: string): RGBAImage {
  if (!existsSync(file)) throw new CliError(`${file}: file not found`);
  const bytes = new Uint8Array(readFileSync(file));
  if (!PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    throw new CliError(`${file}: only PNG is supported (convert with: sips -s format png "${file}" --out out.png)`);
  }
  try {
    return decodePng(bytes);
  } catch (e) {
    throw new CliError(`${file}: cannot decode the PNG (${e instanceof Error ? e.message : String(e)})`);
  }
}

const wasmPath = new URL('../src/vendor/unfake/unfake_wasm_bg.wasm', import.meta.url);

let core: UnfakeCore | null = null;
/** The unfake WASM core (pixel grid detection, downscale, quantize), loaded once. */
export function loadCore(): UnfakeCore {
  core ??= unfakeFromBytes(new Uint8Array(readFileSync(wasmPath)));
  return core;
}

/** File name without folder and extension. */
export const baseName = (file: string): string => basename(file, extname(file)) || 'sprite';

/** Unique export names for a list of files (`hero`, `hero_2`…), as the app does. */
export function uniqueNames(files: string[]): string[] {
  const used = new Set<string>();
  return files.map((f) => {
    const base = slug(baseName(f));
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
    used.add(name);
    return name;
  });
}

// ---------------------------------------------------------------- palette

const normId = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Preset id/name ("pico-8", "sweetie16") or a .hex / .gpl / .txt palette file. Undefined when not given. */
export function resolvePalette(spec: string | undefined): RGBA8[] | undefined {
  if (!spec) return undefined;
  const preset = PALETTES.find((p) => normId(p.id) === normId(spec) || normId(p.name) === normId(spec));
  if (preset) return preset.colors;
  if (existsSync(spec) && statSync(spec).isFile()) {
    const parsed = parsePalette(readFileSync(spec, 'utf8'), spec);
    if (!parsed.colors.length) throw new CliError(`${spec}: no colours found (use a .hex, .gpl or .txt palette)`);
    return parsed.colors.map(hexToRgba);
  }
  throw new UsageError(`--palette: "${spec}" is neither a preset (${PALETTES.map((p) => p.id).join(', ')}) nor an existing file`);
}

// ---------------------------------------------------------------- output

/** Core warnings are `{key, params}`: translate them with the English strings of the app. */
export function tw(w: Warning): string {
  const text = (en as Record<string, string>)[w.key];
  if (!text) return w.key;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (w.params && k in w.params ? String(w.params[k]) : m));
}

export function printWarnings(warnings: Warning[], indent = '  '): void {
  for (const w of warnings) console.log(`${indent}! ${tw(w)}`);
}

/** `dir` = the files unzipped under it; `*.zip` = one zip. Returns where it wrote. */
export function writeOutput(files: ExportFile[], out: string): string {
  const target = resolve(out);
  if (target.toLowerCase().endsWith('.zip')) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, zipFiles(files));
    return target;
  }
  for (const f of files) {
    const p = join(target, f.path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.data);
  }
  return target;
}

/** Writes and says where. With --json stdout stays machine-readable: the line goes to stderr. */
export function reportOutput(files: ExportFile[], out: string, json = false): void {
  const line = `Wrote ${files.length} files to ${writeOutput(files, out)}`;
  if (json) console.error(line);
  else console.log(line);
}

export function printJson(x: unknown): void {
  console.log(JSON.stringify(x, null, 2));
}
