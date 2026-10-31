import { describe, expect, it } from 'vitest';
import { clearNudge, duplicateItem, duplicateSummary, framesToText, mirrorDraft, moveItem, nudge, rangesText, removeItem, resolveAnims } from '../src/ui/lib/frameOps.ts';
import { parseFrames } from '../src/ui/lib/frames.ts';
import type { AnimDraft } from '../src/ui/state/types.ts';

const draft = (p: Partial<AnimDraft> = {}): AnimDraft => ({ id: 'a1', name: 'walk', frames: '', fps: 8, loop: true, flipX: false, ...p });

describe('frame editor helpers', () => {
  it('writes frame lists the range parser reads back', () => {
    for (const list of [[0, 1, 2, 3, 5], [0, 1], [3, 2, 1], [0, 1, 1, 2, 3, 4], [7]]) {
      expect(parseFrames(framesToText(list)).indices).toEqual(list);
    }
    expect(framesToText([0, 1, 2, 3, 5])).toBe('0-3,5');
  });

  it('resolves blank ranges with the frame count and drops invalid or out-of-range drafts', () => {
    const r = resolveAnims([draft({ id: 'a' }), draft({ id: 'b', frames: '2-9' }), draft({ id: 'c', frames: 'x' }), draft({ id: 'd', frames: '8,9' })], 4);
    expect(r.map((a) => [a.draft.id, a.frames])).toEqual([['a', [0, 1, 2, 3]], ['b', [2, 3]]]);
  });

  it('moves, duplicates and removes within the list', () => {
    expect(moveItem([0, 1, 2], 1, -1)).toEqual({ list: [1, 0, 2], pos: 0 });
    expect(moveItem([0, 1, 2], 0, -1)).toEqual({ list: [0, 1, 2], pos: 0 });
    expect(moveItem([0, 1, 2], 2, 5).pos).toBe(2);
    expect(duplicateItem([0, 1, 2], 1)).toEqual([0, 1, 1, 2]);
    expect(removeItem([0, 1, 2], 1)).toEqual([0, 2]);
    expect(removeItem([4], 0)).toEqual([4]);
  });

  it('accumulates nudges and forgets an all-zero one', () => {
    let o = nudge({}, 3, 1, 0);
    o = nudge(o, 3, 0, -2);
    expect(o).toEqual({ 3: { dx: 1, dy: -2 } });
    expect(nudge(o, 3, -1, 2)).toEqual({});
    expect(clearNudge(o, 3)).toEqual({});
  });

  it('summarises duplicate groups as "frames 4-6 repeat 1-3"', () => {
    const { dups, originals } = duplicateSummary([[0, 3], [1, 4], [2, 5]], [1, 2, 3, 4, 5, 6]);
    expect(rangesText(dups)).toBe('4-6');
    expect(rangesText(originals)).toBe('1-3');
    expect(rangesText([5, 1, 3, 2])).toBe('1-3, 5');
  });

  it('names the mirrored copy and keeps names unique', () => {
    expect(mirrorDraft(draft(), 'x', ['walk'])).toMatchObject({ id: 'x', name: 'walk_left', flipX: true });
    expect(mirrorDraft(draft(), 'x', ['walk', 'walk_left']).name).toBe('walk_left_2');
    expect(mirrorDraft(draft({ name: 'walk_left', flipX: true }), 'x', ['walk_left']).name).toBe('walk');
  });
});
