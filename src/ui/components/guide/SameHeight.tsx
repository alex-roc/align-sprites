// "Same height" demo: two characters of different size, toggled between "as the AI gave them" and "same height".
import { useState } from 'react';
import { HEIGHT_DEMO } from './assets.ts';
import { assetUrl } from './url.ts';

const ZOOM = 3;
type Mode = 'raw' | 'same';

export interface SameHeightProps {
  label: string;
  raw: string;
  same: string;
  knight: string;
  wizard: string;
  ground: string;
  caption: string;
}

export function SameHeight(p: SameHeightProps) {
  const [mode, setMode] = useState<Mode>('raw');
  const who = [
    { key: 'knight', name: p.knight },
    { key: 'wizard', name: p.wizard },
  ] as const;
  return (
    <figure className="g-height">
      <div className="g-seg" role="group" aria-label={p.label}>
        {(['raw', 'same'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === 'raw' ? p.raw : p.same}
          </button>
        ))}
      </div>
      <div className="g-stage" role="group" aria-label={mode === 'raw' ? p.raw : p.same}>
        <div className="g-stage-ground">
          {who.map(({ key, name }) => {
            const s = HEIGHT_DEMO[mode][key];
            return (
              <img
                key={key}
                src={assetUrl(s.src)}
                alt={name}
                width={s.w * ZOOM}
                height={s.h * ZOOM}
                className="g-stage-char"
              />
            );
          })}
        </div>
        <div className="g-stage-names" aria-live="polite">
          {who.map(({ key, name }) => (
            <span key={key}>
              {name} <b>{HEIGHT_DEMO[mode][key].h} px</b>
            </span>
          ))}
        </div>
        <p className="g-stage-key">
          <span className="g-swatch g-swatch-ground" aria-hidden="true" />
          {p.ground}
        </p>
      </div>
      <figcaption>{p.caption}</figcaption>
    </figure>
  );
}
