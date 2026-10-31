// Frame range syntax for animations: "0-5", "0,2,4-6", "" (= every frame).

export interface ParsedFrames {
  ok: boolean;
  /** Indices in the order written; empty when the text is blank or invalid. */
  indices: number[];
  /** True for blank text (= all frames, resolved once the frame count is known). */
  all: boolean;
}

export function parseFrames(text: string): ParsedFrames {
  const s = text.trim();
  if (!s) return { ok: true, indices: [], all: true };
  const out: number[] = [];
  for (const part of s.split(/[,\s;]+/)) {
    if (!part) continue;
    const m = /^(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?$/.exec(part);
    if (!m) return { ok: false, indices: [], all: false };
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    const step = a <= b ? 1 : -1;
    for (let i = a; i !== b + step; i += step) out.push(i);
  }
  return { ok: out.length > 0, indices: out, all: false };
}
