import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_FRAME_COUNT, MAX_FRAME_COUNT, MAX_FRAME_SIDE, composeSheet, frameTimes } from '../../../core/video/index.ts';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import type { RGBAImage } from '../../../core/types.ts';
import { closeVideo, cloneVideo, findLoopEnd, grabFrames, openVideo, releaseVideo, VideoDecodeError, type OpenedVideo } from '../../lib/video.ts';
import type { IncomingImage } from '../../state/useAddAssets.ts';
import { Field, NumberInput } from '../common/Field.tsx';
import { RgbaCanvas } from '../common/RgbaCanvas.tsx';

/** Longest side of the preview thumbnails. */
const THUMB_SIDE = 120;
/** Shortest range, in seconds. */
const MIN_SPAN = 0.05;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** A message kept as key + params so it follows the language. */
interface Msg {
  key: MessageKey;
  params?: Record<string, string | number>;
}
const SEEK_ERROR: Msg = { key: 'video.seekError' };

/**
 * "Video to frames": a dialog to pick a looping range of a clip. It extracts evenly spaced frames, lays them out as
 * a sheet and hands it to the Sprites flow as one more image (grid segmentation already set).
 */
export function VideoDialog({ file, onDone, onCancel }: { file: File; onDone: (item: IncomingImage) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<OpenedVideo | null>(null);
  const [error, setError] = useState<Msg | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(1);
  const [count, setCount] = useState(DEFAULT_FRAME_COUNT);
  const [thumbs, setThumbs] = useState<RGBAImage[]>([]);
  const [thumbsBusy, setThumbsBusy] = useState(false);
  const [loop, setLoop] = useState<{ progress: number } | null>(null);
  const [loopNote, setLoopNote] = useState<Msg | null>(null);
  const [making, setMaking] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  // Open the clip once per file.
  useEffect(() => {
    let cancelled = false;
    let opened: OpenedVideo | null = null;
    openVideo(file).then(
      (v) => {
        if (cancelled) return closeVideo(v);
        opened = v;
        setVideo(v);
        setEnd(round2(Math.min(v.duration, 1)));
      },
      (e) => !cancelled && setError(e instanceof VideoDecodeError ? { key: 'video.decodeError', params: { name: file.name } } : SEEK_ERROR),
    );
    return () => {
      cancelled = true;
      if (opened) closeVideo(opened);
    };
  }, [file]);

  useEffect(() => {
    const el = player.current;
    if (!video || !el) return;
    const onTime = () => {
      if (!el.paused && el.currentTime >= end) el.currentTime = start;
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [video, start, end]);

  // Thumbnails of the frames that would be extracted, a moment after the last change.
  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setThumbsBusy(true);
      try {
        const el = await cloneVideo(video);
        const frames = await grabFrames(el, frameTimes(start, end, count), THUMB_SIDE, { cancelled: () => cancelled });
        if (!cancelled) setThumbs(frames);
        releaseVideo(el);
      } catch {
        if (!cancelled) setError(SEEK_ERROR);
      } finally {
        if (!cancelled) setThumbsBusy(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [video, start, end, count]);

  const span = Math.min(MIN_SPAN, video ? video.duration / 2 : MIN_SPAN);
  const setStartClamped = (v: number) => video && setStart(round2(Math.max(0, Math.min(v, end - span))));
  const setEndClamped = (v: number) => video && setEnd(round2(Math.min(video.duration, Math.max(v, start + span))));
  const current = () => round2(player.current?.currentTime ?? 0);

  const findLoop = useCallback(async () => {
    if (!video || busyRef.current) return;
    busyRef.current = true;
    setLoopNote(null);
    setLoop({ progress: 0 });
    try {
      const el = await cloneVideo(video);
      const found = await findLoopEnd(el, start, { onProgress: (p) => setLoop({ progress: p }) });
      releaseVideo(el);
      if (found === null) setLoopNote({ key: 'video.noLoop' });
      else {
        setEnd(round2(found));
        setLoopNote({ key: 'video.loopFound', params: { seconds: round2(found) } });
      }
    } catch {
      setError(SEEK_ERROR);
    } finally {
      busyRef.current = false;
      setLoop(null);
    }
  }, [video, start]);

  const confirm = async () => {
    if (!video || busyRef.current) return;
    busyRef.current = true;
    setMaking(true);
    try {
      const el = await cloneVideo(video);
      const frames = await grabFrames(el, frameTimes(start, end, count), MAX_FRAME_SIDE);
      releaseVideo(el);
      const { image, layout } = composeSheet(frames);
      const fps = Math.min(60, Math.max(1, Math.round(count / (end - start))));
      onDone({ name: file.name, image, grid: { rows: layout.rows, cols: layout.cols, frames: frames.length, fps } });
    } catch {
      setError(SEEK_ERROR);
      setMaking(false);
    } finally {
      busyRef.current = false;
    }
  };

  const duration = video?.duration ?? 1;
  const fps = Math.min(60, Math.max(1, Math.round(count / Math.max(end - start, span))));
  const working = loop !== null || making;

  return (
    <dialog ref={dialog} className="video-dialog" aria-labelledby="video-dialog-title" onCancel={(e) => { e.preventDefault(); if (!making) onCancel(); }}>
      <h2 id="video-dialog-title">{t('video.title')}</h2>
      <p className="muted">{t('video.intro')}</p>
      {error && <p className="alert" role="alert">{t(error.key, error.params)}</p>}
      {!video && !error && <p className="muted">{t('video.loading')}</p>}
      <div className="video-body" hidden={!video}>
        <div className="video-player-host">
          <video ref={player} className="video-player" src={video?.url} controls muted playsInline aria-label={t('video.previewLabel')} />
        </div>
        <div className="video-controls">
          <div className="video-time">
            <Field label={t('video.start')}>
              <span className="row">
                <input type="range" min={0} max={duration} step={0.01} value={start} aria-label={t('video.start')} onChange={(e) => setStartClamped(parseFloat(e.target.value))} />
                <NumberInput className="num-sm" value={start} min={0} max={duration} step={0.01} aria-label={t('video.start')} onChange={setStartClamped} />
              </span>
            </Field>
            <button type="button" className="btn btn-sm" onClick={() => setStartClamped(current())}>{t('video.useCurrent')}</button>
          </div>
          <div className="video-time">
            <Field label={t('video.end')}>
              <span className="row">
                <input type="range" min={0} max={duration} step={0.01} value={end} aria-label={t('video.end')} onChange={(e) => setEndClamped(parseFloat(e.target.value))} />
                <NumberInput className="num-sm" value={end} min={0} max={duration} step={0.01} aria-label={t('video.end')} onChange={setEndClamped} />
              </span>
            </Field>
            <button type="button" className="btn btn-sm" onClick={() => setEndClamped(current())}>{t('video.useCurrent')}</button>
          </div>
          <div className="row wrap">
            <Field label={t('video.frames')} className="field-narrow">
              <NumberInput className="num-sm" value={count} min={1} max={MAX_FRAME_COUNT} aria-label={t('video.frames')} onChange={(n) => setCount(Math.round(n))} />
            </Field>
            <button type="button" className="btn" disabled={working} onClick={() => void findLoop()} title={t('video.findLoopHint')}>
              {loop ? t('video.finding', { percent: Math.round(loop.progress * 100) }) : t('video.findLoop')}
            </button>
          </div>
          <small className="hint">{t('video.framesHint')} {t('video.rate', { count, seconds: round2(end - start), fps })}</small>
          {loopNote && <small className="hint" role="status">{t(loopNote.key, loopNote.params)}</small>}
        </div>
      </div>
      {video && (
        <section aria-label={t('video.thumbs')}>
          <h3 className="video-thumbs-title">{t('video.thumbs')}{thumbsBusy && <span className="muted"> · {t('video.extracting')}</span>}</h3>
          <ol className="video-thumbs">
            {thumbs.map((f, i) => (
              <li key={i}><RgbaCanvas image={f} label={t('video.thumb', { n: i })} /><span>{i}</span></li>
            ))}
          </ol>
        </section>
      )}
      <p className="hint">{t('video.tip')}</p>
      <div className="video-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={making}>{t('video.cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={() => void confirm()} disabled={!video || working || thumbsBusy}>
          {making ? t('video.extracting') : t('video.add', { count })}
        </button>
      </div>
    </dialog>
  );
}
