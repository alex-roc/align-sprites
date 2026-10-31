// How-it-works flow: seven small inline SVG scenes. Magenta = what is detected or removed, yellow = feet line.
import type { ReactNode } from 'react';
import type { DiagramStep, Legend } from '../../../i18n/guide/types.ts';

const PERSON = [
  '...XX...',
  '..XXXX..',
  '..XXXX..',
  '...XX...',
  '.XXXXXX.',
  'XX.XX.XX',
  'XX.XX.XX',
  '...XX...',
  '..X..X..',
  '..X..X..',
  '.XX..XX.',
];
const BULKY = [
  '..XXXX..',
  '.XXXXXX.',
  '.XXXXXX.',
  '..XXXX..',
  'XXXXXXXX',
  'XXXXXXXX',
  'X.XXXX.X',
  '..XXXX..',
  '..XXXX..',
  '.XX..XX.',
  '.XX..XX.',
];

/** Path of the filled squares of a pixel glyph at scale s, merging horizontal runs. */
function glyph(rows: string[], s: number): string {
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== 'X') continue;
      let n = 1;
      while (row[x + n] === 'X') n++;
      d += `M${x * s} ${y * s}h${n * s}v${s}h${-n * s}z`;
      x += n - 1;
    }
  });
  return d;
}

const W = 120, H = 80;
const KEY = 'var(--key, #E01BD6)';
const GROUND = 'var(--ground, #FFC531)';

function Person(p: { x: number; bottom: number; s: number; rows?: string[]; fill?: string; filter?: string }) {
  const rows = p.rows ?? PERSON;
  return (
    <path
      transform={`translate(${p.x} ${p.bottom - rows.length * p.s})`}
      d={glyph(rows, p.s)}
      fill={p.fill ?? 'var(--ink, #1E1A33)'}
      shapeRendering="crispEdges"
      filter={p.filter}
    />
  );
}

function Scene({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="g-checker" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="var(--panel-2, #F7F6FB)" />
          <rect width="6" height="6" fill="var(--line, #DCD9E8)" />
          <rect x="6" y="6" width="6" height="6" fill="var(--line, #DCD9E8)" />
        </pattern>
        <filter id="g-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

const frame = <rect width={W} height={H} rx="8" fill="var(--panel-2, #F7F6FB)" />;

const SCENES: ReactNode[] = [
  // 1. AI image: magenta key, blurry figure
  <Scene key="ai">
    <rect width={W} height={H} rx="8" fill={KEY} />
    <Person x={40} bottom={68} s={5} filter="url(#g-soft)" />
  </Scene>,
  // 2. Background: key on the left half, transparency (checker) on the right
  <Scene key="bg">
    <rect width={W} height={H} rx="8" fill="url(#g-checker)" />
    <path d={`M8 0H58V${H}H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z`} fill={KEY} />
    <Person x={40} bottom={68} s={5} />
  </Scene>,
  // 3. Frames: three figures, each in a detected box
  <Scene key="frames">
    <rect width={W} height={H} rx="8" fill="url(#g-checker)" />
    {[10, 48, 86].map((x) => (
      <g key={x}>
        <rect x={x - 3} y={31} width={30} height={40} fill="none" stroke={KEY} strokeWidth="2" strokeDasharray="4 3" />
        <Person x={x + 3} bottom={68} s={2.5} />
      </g>
    ))}
  </Scene>,
  // 4. Pixel grid: big blocks with the detected grid lines
  <Scene key="grid">
    {frame}
    <Person x={36} bottom={70} s={6} />
    <g stroke={KEY} strokeWidth="0.6" opacity="0.7">
      {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={36 + i * 6} y1={4} x2={36 + i * 6} y2={70} />)}
      {Array.from({ length: 12 }, (_, i) => <line key={`h${i}`} x1={36} y1={4 + i * 6} x2={84} y2={4 + i * 6} />)}
    </g>
  </Scene>,
  // 5. Same height: two characters, same top, same feet line
  <Scene key="height">
    {frame}
    <line x1="8" y1="21" x2="112" y2="21" stroke="var(--ink-soft, #5F5A78)" strokeWidth="1" strokeDasharray="3 3" />
    <Person x={26} bottom={66} s={4.1} />
    <Person x={66} bottom={66} s={4.1} rows={BULKY} />
    <line x1="8" y1="66.5" x2="112" y2="66.5" stroke={GROUND} strokeWidth="3" />
  </Scene>,
  // 6. Cells: equal boxes, feet on the line, origin at the feet
  <Scene key="cells">
    {frame}
    {[5, 43, 81].map((x) => (
      <g key={x}>
        <rect x={x} y={20} width={34} height={42} fill="var(--panel, #fff)" stroke="var(--line, #DCD9E8)" strokeWidth="1" />
        <Person x={x + 9} bottom={54} s={2} />
        <line x1={x} y1="54.5" x2={x + 34} y2="54.5" stroke={GROUND} strokeWidth="2" />
        <path d={`M${x + 17} 51.5v6M${x + 14} 54.5h6`} stroke={GROUND} strokeWidth="1" />
      </g>
    ))}
  </Scene>,
  // 7. Engine: the character on its ground inside the dark stage
  <Scene key="engine">
    <rect width={W} height={H} rx="8" fill="var(--stage, #2A2640)" />
    <Person x={46} bottom={62} s={4} fill="#ECEAF6" />
    <line x1="10" y1="62.5" x2="110" y2="62.5" stroke={GROUND} strokeWidth="2.5" />
  </Scene>,
];

export function Diagram({ steps, legend }: { steps: DiagramStep[]; legend: Legend[] }) {
  return (
    <div className="g-diagram">
      <ol>
        {steps.map((s, i) => (
          <li key={s.title}>
            {SCENES[i]}
            <div>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <ul className="g-legend">
        {legend.map((l) => (
          <li key={l.tone}>
            <span className={`g-swatch g-swatch-${l.tone}`} aria-hidden="true" />
            {l.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
