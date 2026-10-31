// State glue of the frame editor: maps the frame under the cursor of an animation to its animation draft and detected
// frame number, applies reorder / duplicate / remove / nudge to the asset, and finds repeated frames in the worker.
import { useEffect, useMemo, useState } from 'react';
import type { FrameOffset, SpriteResult } from '../../../core/types.ts';
import { findDuplicates } from '../../../worker/client.ts';
import { clearNudge, duplicateItem, duplicateSummary, framesToText, moveItem, nudge, removeItem, resolveAnims } from '../../lib/frameOps.ts';
import { useApp } from '../../state/context.ts';
import type { Asset } from '../../state/types.ts';

const ZERO: FrameOffset = { dx: 0, dy: 0 };

export interface FrameEditor {
  /** The animation shown matches a draft, so edits know where to write. */
  canEdit: boolean;
  /** Detected frame numbers of the animation, in order (empty when !canEdit). */
  list: number[];
  /** Detected frame number under the cursor. */
  frame: number | undefined;
  offset: FrameOffset;
  /** Each returns where the cursor goes afterwards (null = nothing changed). */
  move: (delta: number) => number | null;
  duplicate: () => number | null;
  remove: () => number | null;
  push: (dx: number, dy: number) => void;
  resetPush: () => void;
}

export function useFrameEditor(asset: Asset, result: SpriteResult, animI: number, pos: number): FrameEditor {
  const { state, dispatch } = useApp();
  const frameCount = state.run.frameCounts[asset.id] ?? result.diag.regions.length;
  const resolved = useMemo(() => resolveAnims(asset.anims, frameCount), [asset.anims, frameCount]);
  const ra = resolved[animI];
  const anim = result.sheet.anims[animI];
  const canEdit = asset.kind === 'sheet' && !!ra && !!anim && (ra.draft.name.trim() || 'anim') === anim.name;
  const list = canEdit ? ra.frames : [];
  const frame = canEdit ? list[pos] : undefined;

  const writeList = (next: number[]) =>
    dispatch({ type: 'asset/patch', id: asset.id, patch: { anims: asset.anims.map((d) => (d.id === ra.draft.id ? { ...d, frames: framesToText(next) } : d)) } });
  const writeOffsets = (frameOffsets: Record<number, FrameOffset>) => dispatch({ type: 'asset/patch', id: asset.id, patch: { frameOffsets } });

  return {
    canEdit,
    list,
    frame,
    offset: frame !== undefined ? (asset.frameOffsets[frame] ?? ZERO) : ZERO,
    move: (delta) => {
      if (!canEdit) return null;
      const m = moveItem(list, pos, delta);
      if (m.list === list) return null;
      writeList(m.list);
      return m.pos;
    },
    duplicate: () => {
      if (!canEdit || frame === undefined) return null;
      writeList(duplicateItem(list, pos));
      return pos + 1;
    },
    remove: () => {
      if (!canEdit) return null;
      const next = removeItem(list, pos);
      if (next === list) return null;
      writeList(next);
      return Math.min(pos, next.length - 1);
    },
    push: (dx, dy) => {
      if (frame !== undefined) writeOffsets(nudge(asset.frameOffsets, frame, dx, dy));
    },
    resetPush: () => {
      if (frame !== undefined) writeOffsets(clearNudge(asset.frameOffsets, frame));
    },
  };
}

export interface DuplicateNote {
  draftId: string;
  animName: string;
  /** Detected frame numbers that repeat an earlier one / the ones they repeat. */
  dups: number[];
  originals: number[];
}

/** Repeated frames per animation (the worker compares the packed cells). Shown stale-free: tied to the result it checked. */
export function useDuplicates(asset: Asset, result: SpriteResult): { notes: DuplicateNote[]; removeAll: () => void } {
  const { state, dispatch } = useApp();
  const frameCount = state.run.frameCounts[asset.id] ?? result.diag.regions.length;
  const [found, setFound] = useState<{ result: SpriteResult; notes: DuplicateNote[] } | null>(null);

  useEffect(() => {
    if (asset.kind !== 'sheet') return;
    const resolved = resolveAnims(asset.anims, frameCount);
    let alive = true;
    let start = 0;
    const jobs = result.sheet.anims.map((anim, i) => {
      const first = start;
      start += anim.count;
      const ra = resolved[i];
      if (!ra || ra.frames.length !== anim.count || (ra.draft.name.trim() || 'anim') !== anim.name) return Promise.resolve(null);
      // One cell per distinct detected frame: a frame used twice on purpose (ping-pong) is not a duplicate.
      const uniques = [...new Set(ra.frames)];
      if (uniques.length < 2) return Promise.resolve(null);
      const cells = uniques.map((f) => result.frames[first + ra.frames.indexOf(f)]);
      return findDuplicates(cells).then((groups): DuplicateNote | null => {
        if (!groups.length) return null;
        return { draftId: ra.draft.id, animName: anim.name, ...duplicateSummary(groups, uniques) };
      });
    });
    Promise.all(jobs).then(
      (all) => alive && setFound({ result, notes: all.filter((n): n is DuplicateNote => n !== null) }),
      () => alive && setFound({ result, notes: [] }),
    );
    return () => {
      alive = false;
    };
    // The editor reads the drafts that produced this result: re-check only when a new result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const notes = found?.result === result ? found.notes : [];
  const removeAll = () => {
    const anims = asset.anims.map((d) => {
      const note = notes.find((n) => n.draftId === d.id);
      if (!note) return d;
      const resolved = resolveAnims([d], frameCount)[0];
      const drop = new Set(note.dups);
      return resolved ? { ...d, frames: framesToText(resolved.frames.filter((f) => !drop.has(f))) } : d;
    });
    dispatch({ type: 'asset/patch', id: asset.id, patch: { anims } });
  };
  return { notes, removeAll };
}
