// Before/after slider. A native range input drives it, so it works with keyboard, touch and screen readers.
import { useId, useState } from 'react';
import { COMPARE_ASSETS, IMAGE_SIZES } from './assets.ts';
import { assetUrl } from './url.ts';

export interface CompareProps {
  asset: keyof typeof COMPARE_ASSETS;
  label: string;
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  caption: string;
}

export function Compare(p: CompareProps) {
  const [pos, setPos] = useState(50); // % of the width that still shows "before"
  const id = useId();
  const a = COMPARE_ASSETS[p.asset];
  const [bw, bh] = IMAGE_SIZES[a.before]!;
  const [aw, ah] = IMAGE_SIZES[a.after]!;

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -5 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 5 : 0;
    if (step) {
      e.preventDefault();
      setPos((v) => Math.min(100, Math.max(0, v + step)));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setPos(e.key === 'Home' ? 0 : 100);
    }
  };

  return (
    <figure className="g-compare">
      <div className="g-compare-box" style={{ ['--pos' as string]: `${pos}%` }}>
        <img src={assetUrl(a.before)} alt={p.beforeAlt} width={bw} height={bh} />
        <div className="g-compare-after">
          <img src={assetUrl(a.after)} alt={p.afterAlt} width={aw} height={ah} />
        </div>
        <span className="g-compare-tag g-compare-tag-before">{p.before}</span>
        <span className="g-compare-tag g-compare-tag-after">{p.after}</span>
        <span className="g-compare-handle" aria-hidden="true" />
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={pos}
          aria-label={p.label}
          aria-valuetext={`${p.before} ${pos}%, ${p.after} ${100 - pos}%`}
          onChange={(e) => setPos(Number(e.target.value))}
          onKeyDown={onKey}
        />
      </div>
      <figcaption>{p.caption}</figcaption>
    </figure>
  );
}
