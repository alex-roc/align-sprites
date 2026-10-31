// Pure helpers of the frame editor: animation drafts ↔ frame lists, reordering, nudges, duplicate groups.
import type { FrameOffset } from '../../core/types.ts';
import type { AnimDraft } from '../state/types.ts';
import { parseFrames } from './frames.ts';

/** An animation draft with its frame indices resolved (blank "all" expanded with the detected frame count). */
export interface ResolvedAnim {
  draft: AnimDraft;
  frames: number[];
}

/** Mirrors jobs.ts: drafts with a valid, non-empty range, in order; frames beyond `frameCount` are dropped. */
export function resolveAnims(anims: AnimDraft[], frameCount: number): ResolvedAnim[] {
  const out: ResolvedAnim[] = [];
  for (const draft of anims) {
    const p = parseFrames(draft.frames);
    if (!p.ok) continue;
    const frames = (p.all ? [...Array(frameCount).keys()] : p.indices).filter((i) => i < frameCount);
    if (frames.length) out.push({ draft, frames });
  }
  return out;
}

/** "0-3,5": ascending runs of 3+ become ranges; everything else (repeats, descending) stays listed. */
export function framesToText(list: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < list.length; ) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    if (j - i >= 2) parts.push(`${list[i]}-${list[j]}`);
    else for (let k = i; k <= j; k++) parts.push(String(list[k]));
    i = j + 1;
  }
  return parts.join(',');
}

/** Sorted unique numbers as a short text for messages ("4-6", "1,3"): runs of 2+ become ranges. */
export function rangesText(nums: number[]): string {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(j > i ? `${s[i]}-${s[j]}` : String(s[i]));
    i = j + 1;
  }
  return parts.join(', ');
}

/** Moves the item at `pos` by `delta` places (clamped); returns the new list and where the item ended. */
export function moveItem<T>(list: T[], pos: number, delta: number): { list: T[]; pos: number } {
  const to = Math.max(0, Math.min(list.length - 1, pos + delta));
  if (to === pos || pos < 0 || pos >= list.length) return { list, pos };
  const next = [...list];
  const [it] = next.splice(pos, 1);
  next.splice(to, 0, it);
  return { list: next, pos: to };
}

export function duplicateItem<T>(list: T[], pos: number): T[] {
  if (pos < 0 || pos >= list.length) return list;
  const next = [...list];
  next.splice(pos + 1, 0, list[pos]);
  return next;
}

export function removeItem<T>(list: T[], pos: number): T[] {
  return list.length < 2 || pos < 0 || pos >= list.length ? list : list.filter((_, i) => i !== pos);
}

/** Adds (dx, dy) to a frame's nudge; an all-zero nudge is removed so the signature stays clean. */
export function nudge(offsets: Record<number, FrameOffset>, frame: number, dx: number, dy: number): Record<number, FrameOffset> {
  const cur = offsets[frame] ?? { dx: 0, dy: 0 };
  const next = { dx: cur.dx + dx, dy: cur.dy + dy };
  const { [frame]: _old, ...rest } = offsets;
  return next.dx === 0 && next.dy === 0 ? rest : { ...rest, [frame]: next };
}

export function clearNudge(offsets: Record<number, FrameOffset>, frame: number): Record<number, FrameOffset> {
  const { [frame]: _old, ...rest } = offsets;
  return rest;
}

/**
 * Duplicate groups (indices into `uniques`, as findDuplicateFrames returns them) → frame numbers: the first of each
 * group is the original, the rest repeat it. `uniques[i]` is the detected frame number of group member i.
 */
export function duplicateSummary(groups: number[][], uniques: number[]): { dups: number[]; originals: number[] } {
  const dups: number[] = [];
  const originals: number[] = [];
  for (const g of groups) {
    const [first, ...rest] = g.map((i) => uniques[i]);
    originals.push(first);
    dups.push(...rest);
  }
  return { dups, originals };
}

/** The mirrored copy of an animation draft: same frames, flipX toggled, name "<name>_left" (made unique). */
export function mirrorDraft(d: AnimDraft, id: string, names: string[]): AnimDraft {
  const base = d.flipX ? d.name.replace(/_left$/, '') || d.name : `${d.name}_left`;
  let name = base;
  for (let n = 2; names.includes(name); n++) name = `${base}_${n}`;
  return { ...d, id, name, flipX: !d.flipX };
}
