import { useMemo } from 'react';
import {
  ATLAS_GUTTER,
  EFFECT_KINDS,
  ITEMS_SAFE,
  PARALLAX_ASPECTS,
  PARALLAX_LAYERS,
  buildAtlasPrompt,
  buildDirectionsPrompt,
  buildEffectPrompt,
  buildItemsPrompt,
  buildParallaxPrompt,
  buildVideoPrompt,
  directionRows,
  makeParallaxGuide,
  makeSheetGuide,
  type EffectKind,
  type ParallaxAspect,
  type ParallaxLayer,
  type VideoPromptOptions,
} from '../../../core/prompts/assets.ts';
import { gridRows } from '../../../core/prompts/index.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Check, Field, NumberInput, Segmented } from '../common/Field.tsx';
import { Section } from '../common/Section.tsx';
import { KeyField, LangSection, PromptShell, StyleSection, GUIDE_CELL, tryRun, useAssetForm } from './PromptShell.tsx';

const VIEWS: VideoPromptOptions['view'][] = ['side', 'top-down', 'front', 'three-quarter'];

/** Tile atlas: N × M tiles with gaps of the key colour between them (the Tiles tab "Tile sheet" tool reads it). */
export function AtlasPromptPanel() {
  const { t } = useI18n();
  const { p, patch, promptLang } = useAssetForm('atlas');
  const cols = Math.max(1, p.cols), rows = Math.max(1, p.rows);
  const prompt = useMemo(() => tryRun(() => buildAtlasPrompt({ ...p, lang: promptLang, theme: p.theme.trim() || t('prompt.themeFallback') })), [p, promptLang, t]);
  const guide = useMemo(
    () => tryRun(() => makeSheetGuide({ cols, rows, cell: GUIDE_CELL, gutter: Math.round(GUIDE_CELL * ATLAS_GUTTER), key: p.key })),
    [cols, rows, p.key],
  );
  return (
    <PromptShell
      settings={
        <>
          <Section title={t('prompt.describeAtlas')}>
            <Field label={t('prompt.theme')} hint={t('prompt.themeHint')}>
              <input type="text" value={p.theme} placeholder={t('prompt.themePlaceholder')} onChange={(e) => patch({ theme: e.target.value })} />
            </Field>
            <Field label={t('prompt.view')}>
              <select value={p.view} onChange={(e) => patch({ view: e.target.value as typeof p.view })}>
                <option value="side">{t('prompt.view.side')}</option>
                <option value="top-down">{t('prompt.view.top-down')}</option>
              </select>
            </Field>
          </Section>
          <StyleSection
            name="atlas-mode"
            mode={p.mode}
            onMode={(mode) => patch({ mode })}
            size={{ label: t('prompt.tileSize'), hint: t('prompt.tileSizeHint'), value: p.tileSize, min: 8, max: 256, onChange: (tileSize) => patch({ tileSize }) }}
          />
          <Section title={t('prompt.layout')}>
            <div className="row">
              <Field label={t('prompt.cols')}>
                <NumberInput value={p.cols} min={1} max={16} onChange={(c) => patch({ cols: c })} />
              </Field>
              <Field label={t('prompt.rows')}>
                <NumberInput value={p.rows} min={1} max={16} onChange={(r) => patch({ rows: r })} />
              </Field>
            </div>
            <KeyField value={p.key} onChange={(key) => patch({ key })} />
            <Check checked={p.withReference} onChange={(withReference) => patch({ withReference })} label={t('prompt.withStyleRef')} />
          </Section>
          <LangSection />
        </>
      }
      prompt={prompt}
      guide={{ image: guide, file: `guide-atlas-${cols}x${rows}-${p.key}.png`, hint: t('prompt.guideHintAtlas', { cols, rows }) }}
      chat={p.withReference ? t('prompt.step.chatRef') : t('prompt.step.chatText')}
      next={{ text: t('prompt.nextAtlas'), tab: 'tiles', label: t('prompt.openTilesAtlas') }}
    />
  );
}

/** Top-down walk cycle, one row per direction (RPG Maker order, or 3 rows that mirror the side view). */
export function DirectionsPromptPanel() {
  const { t } = useI18n();
  const { p, patch, promptLang } = useAssetForm('directions');
  const frames = Math.max(2, p.frames);
  const dirs = directionRows(p.threeRows);
  const prompt = useMemo(() => tryRun(() => buildDirectionsPrompt({ ...p, lang: promptLang, subject: p.subject.trim() || t('prompt.subjectFallback') })), [p, promptLang, t]);
  const guide = useMemo(
    () => tryRun(() => makeSheetGuide({ cols: frames, rows: dirs.length, cell: GUIDE_CELL, key: p.key, baseline: 0.9, arrows: dirs, numberByRow: true })),
    [frames, dirs, p.key],
  );
  return (
    <PromptShell
      settings={
        <>
          <Section title={t('prompt.describe')}>
            <Field label={t('prompt.subject')} hint={t('prompt.subjectHint')}>
              <input type="text" value={p.subject} placeholder={t('prompt.subjectPlaceholder')} onChange={(e) => patch({ subject: e.target.value })} />
            </Field>
          </Section>
          <StyleSection
            name="directions-mode"
            mode={p.mode}
            onMode={(mode) => patch({ mode })}
            size={{ label: t('prompt.artHeight'), hint: t('prompt.artHeightHint'), value: p.artHeight, min: 8, max: 256, onChange: (artHeight) => patch({ artHeight }) }}
          />
          <Section title={t('prompt.layout')}>
            <Field label={t('prompt.framesPerRow')} hint={t('prompt.framesPerRowHint')}>
              <NumberInput value={p.frames} min={2} max={16} onChange={(n) => patch({ frames: n })} />
            </Field>
            <Check checked={p.threeRows} onChange={(threeRows) => patch({ threeRows })} label={t('prompt.threeRows')} />
            <small className="hint">{t('prompt.threeRowsHint')}</small>
            <KeyField value={p.key} onChange={(key) => patch({ key })} />
            <Check checked={p.withReference} onChange={(withReference) => patch({ withReference })} label={t('prompt.withReference')} />
          </Section>
          <LangSection />
        </>
      }
      prompt={prompt}
      guide={{ image: guide, file: `guide-directions-${frames}x${dirs.length}-${p.key}.png`, hint: t('prompt.guideHintDirections', { cols: frames, rows: dirs.length }) }}
      chat={p.withReference ? t('prompt.step.chatRef') : t('prompt.step.chatText')}
      next={{ text: t('prompt.nextDirections'), tab: 'sprites', label: t('prompt.openSprites') }}
    />
  );
}

/** Effects: frames centred in their cells, no feet line, hard edges (no glows). */
export function EffectsPromptPanel() {
  const { t } = useI18n();
  const { p, patch, promptLang } = useAssetForm('effects');
  const cols = Math.max(1, p.cols);
  const rows = gridRows(p.frames, cols);
  const prompt = useMemo(() => tryRun(() => buildEffectPrompt({ ...p, lang: promptLang })), [p, promptLang]);
  const guide = useMemo(() => tryRun(() => makeSheetGuide({ cols, rows, cell: GUIDE_CELL, key: p.key, cross: true })), [cols, rows, p.key]);
  return (
    <PromptShell
      settings={
        <>
          <Section title={t('prompt.describeEffect')}>
            <Field label={t('prompt.effectKind')}>
              <select value={p.kind} onChange={(e) => patch({ kind: e.target.value as EffectKind })}>
                {EFFECT_KINDS.map((k) => (
                  <option key={k} value={k}>{t(`prompt.effect.${k}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('prompt.effectLook')} hint={t('prompt.effectLookHint')}>
              <input type="text" value={p.description} placeholder={t('prompt.effectLookPlaceholder')} onChange={(e) => patch({ description: e.target.value })} />
            </Field>
          </Section>
          <StyleSection
            name="effects-mode"
            mode={p.mode}
            onMode={(mode) => patch({ mode })}
            size={{ label: t('prompt.effectSize'), hint: t('prompt.effectSizeHint'), value: p.artSize, min: 8, max: 256, onChange: (artSize) => patch({ artSize }) }}
          />
          <Section title={t('prompt.layout')}>
            <div className="row">
              <Field label={t('prompt.frames')}>
                <NumberInput value={p.frames} min={1} max={64} onChange={(frames) => patch({ frames })} />
              </Field>
              <Field label={t('prompt.cols')}>
                <NumberInput value={p.cols} min={1} max={16} onChange={(c) => patch({ cols: c })} />
              </Field>
            </div>
            <KeyField value={p.key} onChange={(key) => patch({ key })} />
          </Section>
          <LangSection />
        </>
      }
      prompt={prompt}
      guide={{ image: guide, file: `guide-effect-${cols}x${rows}-${p.key}.png`, hint: t('prompt.guideHintEffects', { cols, rows }) }}
      chat={t('prompt.step.chatText')}
      next={{ text: t('prompt.nextEffects'), tab: 'sprites', label: t('prompt.openSprites') }}
    />
  );
}

/** Items and icons: K separate objects, each centred in its cell, same scale. */
export function ItemsPromptPanel() {
  const { t } = useI18n();
  const { p, patch, promptLang } = useAssetForm('items');
  const cols = Math.max(1, p.cols), rows = Math.max(1, p.rows);
  const prompt = useMemo(() => tryRun(() => buildItemsPrompt({ ...p, lang: promptLang, items: p.items.trim() || t('prompt.itemsFallback') })), [p, promptLang, t]);
  const guide = useMemo(() => tryRun(() => makeSheetGuide({ cols, rows, cell: GUIDE_CELL, key: p.key, safe: ITEMS_SAFE })), [cols, rows, p.key]);
  return (
    <PromptShell
      settings={
        <>
          <Section title={t('prompt.describeItems')}>
            <Field label={t('prompt.items')} hint={t('prompt.itemsHint')}>
              <textarea rows={3} value={p.items} placeholder={t('prompt.itemsPlaceholder')} onChange={(e) => patch({ items: e.target.value })} />
            </Field>
          </Section>
          <StyleSection
            name="items-mode"
            mode={p.mode}
            onMode={(mode) => patch({ mode })}
            size={{ label: t('prompt.itemSize'), hint: t('prompt.itemSizeHint'), value: p.artSize, min: 8, max: 256, onChange: (artSize) => patch({ artSize }) }}
          />
          <Section title={t('prompt.layout')}>
            <div className="row">
              <Field label={t('prompt.cols')}>
                <NumberInput value={p.cols} min={1} max={16} onChange={(c) => patch({ cols: c })} />
              </Field>
              <Field label={t('prompt.rows')}>
                <NumberInput value={p.rows} min={1} max={16} onChange={(r) => patch({ rows: r })} />
              </Field>
            </div>
            <KeyField value={p.key} onChange={(key) => patch({ key })} />
            <Check checked={p.withReference} onChange={(withReference) => patch({ withReference })} label={t('prompt.withStyleRef')} />
          </Section>
          <LangSection />
        </>
      }
      prompt={prompt}
      guide={{ image: guide, file: `guide-items-${cols}x${rows}-${p.key}.png`, hint: t('prompt.guideHintItems', { cols, rows }) }}
      chat={p.withReference ? t('prompt.step.chatRef') : t('prompt.step.chatText')}
      next={{ text: t('prompt.nextItems'), tab: 'tiles', label: t('prompt.openTilesItems') }}
    />
  );
}

/** Parallax: one prompt per layer. Far is opaque; mid and near sit on the key colour. */
export function ParallaxPromptPanel() {
  const { t } = useI18n();
  const { p, patch, promptLang } = useAssetForm('parallax');
  const prompt = useMemo(() => tryRun(() => buildParallaxPrompt({ ...p, lang: promptLang, theme: p.theme.trim() || t('prompt.themeFallbackParallax') })), [p, promptLang, t]);
  const guide = useMemo(() => tryRun(() => makeParallaxGuide({ aspect: p.aspect, layer: p.layer, key: p.key })), [p.aspect, p.layer, p.key]);
  return (
    <PromptShell
      settings={
        <>
          <Section title={t('prompt.describeParallax')}>
            <div className="field">
              <span className="field-label">{t('prompt.layer')}</span>
              <Segmented<ParallaxLayer>
                name="parallax-layer"
                label={t('prompt.layer')}
                value={p.layer}
                onChange={(layer) => patch({ layer })}
                options={PARALLAX_LAYERS.map((l) => ({ value: l, label: t(`prompt.layer.${l}`) }))}
              />
              <small className="hint">{t('prompt.layerHint')}</small>
            </div>
            <Field label={t('prompt.theme')} hint={t('prompt.themeHintParallax')}>
              <input type="text" value={p.theme} placeholder={t('prompt.themePlaceholderParallax')} onChange={(e) => patch({ theme: e.target.value })} />
            </Field>
            <Field label={t('prompt.aspect')}>
              <select value={p.aspect} onChange={(e) => patch({ aspect: e.target.value as ParallaxAspect })}>
                {PARALLAX_ASPECTS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </Field>
          </Section>
          <StyleSection
            name="parallax-mode"
            mode={p.mode}
            onMode={(mode) => patch({ mode })}
            size={{ label: t('prompt.imageHeight'), hint: t('prompt.imageHeightHint'), value: p.artHeight, min: 32, max: 1024, onChange: (artHeight) => patch({ artHeight }) }}
          />
          <Section title={t('prompt.options')}>
            {p.layer !== 'far' && <KeyField value={p.key} onChange={(key) => patch({ key })} />}
            {p.layer !== 'far' && <Check checked={p.withReference} onChange={(withReference) => patch({ withReference })} label={t('prompt.withLayerRef')} />}
            {p.layer === 'far' && <small className="hint">{t('prompt.farOpaque')}</small>}
          </Section>
          <LangSection />
        </>
      }
      prompt={prompt}
      guide={{ image: guide, file: `guide-parallax-${p.layer}-${p.aspect.replace(':', 'x')}-${p.key}.png`, hint: t(p.layer === 'far' ? 'prompt.guideHintParallaxFar' : 'prompt.guideHintParallax') }}
      chat={p.layer !== 'far' && p.withReference ? t('prompt.step.chatRef') : t('prompt.step.chatText')}
      next={{ text: t('prompt.nextParallax'), tab: 'tiles', label: t('prompt.openTilesParallax') }}
    />
  );
}

/** Video models: a text prompt for a short looping clip on a flat key background (no guide image). */
export function VideoPromptPanel() {
  const { t } = useI18n();
  const { p, patch, promptLang } = useAssetForm('video');
  const prompt = useMemo(
    () => tryRun(() => buildVideoPrompt({ ...p, lang: promptLang, subject: p.subject.trim() || t('prompt.subjectFallback'), action: p.action.trim() || 'run' })),
    [p, promptLang, t],
  );
  return (
    <PromptShell
      settings={
        <>
          <Section title={t('prompt.describe')}>
            <Field label={t('prompt.subject')} hint={t('prompt.subjectHint')}>
              <input type="text" value={p.subject} placeholder={t('prompt.subjectPlaceholder')} onChange={(e) => patch({ subject: e.target.value })} />
            </Field>
            <Field label={t('prompt.videoAction')} hint={t('prompt.videoActionHint')}>
              <input type="text" value={p.action} onChange={(e) => patch({ action: e.target.value })} />
            </Field>
            <Field label={t('prompt.view')}>
              <select value={p.view} onChange={(e) => patch({ view: e.target.value as typeof p.view })}>
                {VIEWS.map((v) => (
                  <option key={v} value={v}>{t(`prompt.view.${v}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('prompt.seconds')} hint={t('prompt.secondsHint')}>
              <NumberInput value={p.seconds} min={2} max={4} onChange={(seconds) => patch({ seconds })} />
            </Field>
          </Section>
          <StyleSection name="video-mode" mode={p.mode} onMode={(mode) => patch({ mode })} />
          {p.mode === 'pixel' && <p className="hint">{t('prompt.videoPixelHint')}</p>}
          <Section title={t('prompt.options')}>
            <KeyField value={p.key} onChange={(key) => patch({ key })} />
            <Check checked={p.withFirstFrame} onChange={(withFirstFrame) => patch({ withFirstFrame })} label={t('prompt.withFirstFrame')} />
          </Section>
          <LangSection />
        </>
      }
      prompt={prompt}
      chatTitle={t('prompt.step.chatVideo')}
      chat={p.withFirstFrame ? t('prompt.step.chatVideoImage') : t('prompt.step.chatVideoText')}
      next={{ text: t('prompt.nextVideo'), tab: 'sprites', label: t('prompt.openSpritesVideo') }}
    />
  );
}
