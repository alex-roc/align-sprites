// Palette files and lists: parse and write .hex (Lospec), .gpl (GIMP) and .txt (Paint.NET); validate and dedupe.

/** Most colours a custom palette keeps (what an 8-bit indexed PNG can hold). */
export const MAX_PALETTE_COLORS = 256;

/** '#rgb', '#rrggbb' or '#rrggbbaa' (the '#' is optional only for 6 and 8 digits) → '#rrggbb' lower case, or null. */
export function normalizeHex(text: string): string | null {
  const t = text.trim();
  const m = /^(#?)([0-9a-f]+)$/i.exec(t);
  if (!m) return null;
  let h = m[2].toLowerCase();
  if (h.length === 3 && m[1]) h = h.replace(/./g, (c) => c + c);
  else if (h.length === 8) h = h.slice(0, 6);
  else if (h.length !== 6) return null;
  return `#${h}`;
}

/** Valid colours only, in order, without repeats, at most `max`. */
export function dedupeColors(hexes: string[], max = MAX_PALETTE_COLORS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hexes) {
    const n = normalizeHex(h);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

export interface ParsedPalette {
  /** Valid, deduplicated, capped to MAX_PALETTE_COLORS. */
  colors: string[];
  /** Entries that were not colours (comments and headers do not count). */
  skipped: number;
}

const finish = (found: string[], skipped: number): ParsedPalette => {
  const colors = dedupeColors(found);
  return { colors, skipped };
};

/** GIMP palette: header lines, then "R G B  name" per colour; '#' starts a comment. */
function parseGpl(text: string): ParsedPalette {
  const found: string[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/).slice(1)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || /^(name|columns)\s*:/i.test(line)) continue;
    const m = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(\s|$)/.exec(line);
    const rgb = m ? [m[1], m[2], m[3]].map(Number) : null;
    if (!rgb || rgb.some((v) => v > 255)) {
      skipped++;
      continue;
    }
    found.push('#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join(''));
  }
  return finish(found, skipped);
}

/**
 * Colour codes separated by lines, spaces, commas or semicolons ('#' optional): a pasted list, a Lospec .hex file
 * (one `rrggbb` per line) or a Paint.NET .txt (`AARRGGBB`, ';' starts a comment; fully transparent entries are dropped).
 */
function parseTokens(text: string, paintNet: boolean): ParsedPalette {
  const found: string[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = paintNet ? raw.replace(/;.*$/, '') : raw;
    for (const tok of line.split(/[\s,;]+/)) {
      if (!tok) continue;
      if (paintNet && /^[0-9a-f]{8}$/i.test(tok)) {
        if (tok.slice(0, 2) !== '00') found.push('#' + tok.slice(2).toLowerCase());
        continue;
      }
      const n = normalizeHex(tok);
      if (n) found.push(n);
      else skipped++;
    }
  }
  return finish(found, skipped);
}

/** Reads a palette file or pasted text. The format is detected from the content (GIMP header) or the file name (.txt). */
export function parsePalette(text: string, fileName = ''): ParsedPalette {
  const body = text.replace(/^﻿/, '');
  if (/^\s*GIMP Palette/i.test(body)) return parseGpl(body.trimStart());
  return parseTokens(body, /\.txt$/i.test(fileName));
}

/** Lospec .hex: one `rrggbb` per line, no '#'. */
export function serializeHex(hexes: string[]): string {
  return dedupeColors(hexes).map((h) => h.slice(1)).join('\n') + '\n';
}

/** GIMP .gpl palette. */
export function serializeGpl(hexes: string[], name = 'palette'): string {
  const rows = dedupeColors(hexes).map((h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${h}`;
  });
  return ['GIMP Palette', `Name: ${name.replace(/[\r\n]+/g, ' ').trim() || 'palette'}`, 'Columns: 8', '#', ...rows, ''].join('\n');
}
