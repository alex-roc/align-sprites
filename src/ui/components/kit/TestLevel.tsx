import { useEffect, useMemo, useRef, useState } from 'react';
import { kaplayAnims } from '../../../core/export/kaplay.ts';
import { isStatic } from '../../../core/export/common.ts';
import { fitScale, pickLevelAnims, type GameResolution, type LevelAnims } from '../../../core/kit/level.ts';
import type { ParallaxResult } from '../../../core/parallax/build.ts';
import type { RGBAImage, SpriteResult } from '../../../core/types.ts';
import { useI18n, type MessageKey } from '../../../i18n/index.ts';
import { cx } from '../../cx.ts';
import { rgbaToCanvas } from '../../lib/image.ts';
import { Check } from '../common/Field.tsx';
import { plainTile, startLevel, type LevelActions, type LevelHandle } from './levelScene.ts';
import './kit.css';

export interface LevelTile {
  key: string;
  image: RGBAImage;
}

const ACTIONS: { id: keyof LevelAnims; label: MessageKey }[] = [
  { id: 'idle', label: 'kit.levelIdle' },
  { id: 'walk', label: 'kit.levelWalk' },
  { id: 'run', label: 'kit.levelRun' },
  { id: 'jump', label: 'kit.levelJump' },
];

function TileThumb({ image }: { image: RGBAImage }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = image.width;
    c.height = image.height;
    c.getContext('2d')?.drawImage(rgbaToCanvas(image), 0, 0);
  }, [image]);
  return <canvas ref={ref} className="pixelated" aria-hidden="true" />;
}

/**
 * Test level: the student's character walks, runs and jumps on their ground in a real Kaplay scene, to check the
 * scale, the feet and the animation speed before exporting. Kaplay is imported only when Play is pressed.
 */
export function TestLevel({ sprites, tiles, background, gameTile, res, pixelated }: {
  sprites: { id: string; name: string; result: SpriteResult }[];
  tiles: LevelTile[];
  /** The parallax background of World, if any: drawn behind the level unless the student turns it off. */
  background: { result: ParallaxResult; name: string } | null;
  gameTile: number;
  res: GameResolution;
  pixelated: boolean;
}) {
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<LevelHandle | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<keyof LevelAnims, string>>>({});
  const [tileKey, setTileKey] = useState<string | null>(null);
  const [boxes, setBoxes] = useState(false);
  const [withBg, setWithBg] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Everything that can play: every animation of every sprite (a sprite with one image per animation counts once).
  const sources = useMemo(
    () =>
      sprites.flatMap((s) => {
        const anims = isStatic(s.result.sheet) ? [] : kaplayAnims(s.result.sheet).map((a) => a.name);
        if (anims.length < 2) return [{ key: `${s.id}|${anims[0] ?? ''}`, sprite: s.result, anim: anims[0] ?? null, label: sprites.length > 1 || !anims.length ? s.name : anims[0]!, match: `${s.name} ${anims[0] ?? ''}` }];
        return anims.map((anim) => ({ key: `${s.id}|${anim}`, sprite: s.result, anim, label: sprites.length > 1 ? `${s.name} · ${anim}` : anim, match: `${s.name} ${anim}` }));
      }),
    [sprites],
  );
  const actions = useMemo<LevelActions | null>(() => {
    const picked = pickLevelAnims(sources.map((x) => x.match));
    if (!picked) return null;
    const out = {} as Record<keyof LevelAnims, (typeof sources)[number]>;
    for (const a of ACTIONS) out[a.id] = sources.find((x) => x.key === overrides[a.id]) ?? sources.find((x) => x.match === picked[a.id]) ?? sources[0]!;
    return out;
  }, [sources, overrides]);
  const tile = tiles.find((x) => x.key === tileKey) ?? tiles[0];
  const ground = useMemo(() => tile?.image ?? plainTile(gameTile), [tile, gameTile]);
  const bg = withBg ? (background?.result ?? null) : null;

  useEffect(() => {
    if (!playing || !actions || !hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const s = fitScale(res, (host.parentElement?.clientWidth ?? host.clientWidth) - 28, Math.round(window.innerHeight * 0.7));
    setScale(s);
    startLevel({ parent: host, res, scale: s, actions, tile: ground, background: bg, pixelated })
      .then((h) => {
        if (cancelled) return h.stop();
        handleRef.current = h;
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(t('kit.levelError', { message: e instanceof Error ? e.message : String(e) }));
        setPlaying(false);
      });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPlaying(false);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // `t` and `boxes` are read once on purpose: the level restarts only when its own inputs change.
  }, [playing, actions, ground, bg, res, pixelated]);

  useEffect(() => {
    handleRef.current?.setBoxes(boxes);
    handleRef.current?.focus();
  }, [boxes, loading]);

  return (
    <section className="stage-card" aria-label={t('kit.levelTitle')}>
      <h2 className="card-title">{t('kit.levelTitle')}</h2>
      <p className="muted">{t('kit.levelHint')}</p>
      {!actions ? (
        <p className="muted">{t('kit.levelNoSprite')}</p>
      ) : (
        <>
          <div className="level-setup">
            {sources.length > 1 && (
              <fieldset className="level-anims">
                <legend className="field-label">{t('kit.levelAnims')}</legend>
                <div className="level-anim-row">
                  {ACTIONS.map((a) => (
                    <label key={a.id} className="field">
                      <span className="field-label">{t(a.label)}</span>
                      <select value={sources.find((x) => x.sprite === actions[a.id].sprite && x.anim === actions[a.id].anim)?.key} disabled={playing} onChange={(e) => setOverrides({ ...overrides, [a.id]: e.target.value })}>
                        {sources.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="field">
              <span className="field-label" id="level-ground">{t('kit.levelGround')}</span>
              {tiles.length ? (
                <div className="level-tiles" role="group" aria-labelledby="level-ground">
                  {tiles.map((x, i) => (
                    <button key={x.key} type="button" className={cx('level-tile', x === tile && 'is-on')} aria-pressed={x === tile} aria-label={t('kit.levelTile', { n: i + 1 })} disabled={playing} onClick={() => setTileKey(x.key)}>
                      <TileThumb image={x.image} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">{t('kit.levelGroundNone', { tile: gameTile })}</p>
              )}
            </div>
            {background && <Check checked={withBg} onChange={setWithBg} disabled={playing} label={t('kit.levelBackground', { name: background.name })} />}
          </div>
          <div className="row wrap">
            <button type="button" className="btn btn-primary" onClick={() => setPlaying(!playing)} aria-pressed={playing}>
              {playing ? t('kit.levelClose') : t('kit.levelPlay')}
            </button>
            {playing && <Check checked={boxes} onChange={setBoxes} label={t('kit.levelBoxes')} />}
            {playing && <span className="muted">{loading ? t('kit.levelLoading') : t('kit.levelScreen', { w: res.w, h: res.h, scale })}</span>}
          </div>
          {error && <p className="notice" role="alert">{error}</p>}
          <div className="level-stage stage-body" hidden={!playing} role="group" aria-label={t('kit.levelCanvas')}>
            <div ref={hostRef} className="level-host" />
          </div>
          {playing && <p className="muted">{t('kit.levelKeys')}</p>}
        </>
      )}
    </section>
  );
}
