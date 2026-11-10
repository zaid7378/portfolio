// Generated placeholder thumbnails (inline SVG, ~0 KB) — one motif per project slot.
// Replace with real screenshots via `image` in lib/site.ts → projects.

const W = 176, H = 176;
// round generated numbers so server and browser render identical markup (no hydration mismatch)
const q = (n: number) => Math.round(n * 10) / 10;

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function Bars({ seed }: { seed: number }) {
  const r = seeded(seed);
  return (
    <>
      <rect x="10" y="12" width="70" height="6" fill="currentColor" opacity=".5" />
      <rect x="10" y="22" width="40" height="3" fill="currentColor" opacity=".25" />
      <path
        d={`M10 90 ${Array.from({ length: 12 }, (_, i) => `L${10 + i * 6} ${q(90 - Math.pow(0.82, i) * 55)}`).join(" ")}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".8"
      />
      {Array.from({ length: 14 }, (_, i) => {
        const h = q(10 + r() * 50 * (i > 4 && i < 9 ? 1.4 : 1));
        return <rect key={i} x={96 + i * 5} y={90 - h} width="3" height={h} fill="currentColor" opacity=".75" />;
      })}
      <line x1="10" y1="104" x2="166" y2="104" stroke="currentColor" opacity=".2" />
      <path
        d={`M10 150 ${Array.from({ length: 26 }, (_, i) => `L${10 + i * 6} ${q(140 + Math.sin(i * 0.9 + seed) * 10 + r() * 6)}`).join(" ")}`}
        fill="none"
        stroke="currentColor"
        opacity=".6"
      />
    </>
  );
}

function Wave({ seed }: { seed: number }) {
  const r = seeded(seed);
  return (
    <>
      <circle cx="120" cy="70" r="42" fill="none" stroke="currentColor" strokeWidth="10" opacity=".85" />
      <circle cx="120" cy="70" r="20" fill="currentColor" opacity=".2" />
      {Array.from({ length: 34 }, (_, i) => {
        const h = q(4 + Math.abs(Math.sin(i * 0.5)) * 30 * (0.5 + r()));
        return <rect key={i} x={8 + i * 4.8} y={145 - h / 2} width="2.4" height={h} fill="currentColor" opacity=".8" />;
      })}
    </>
  );
}

function Object3D() {
  return (
    <>
      <ellipse cx="88" cy="150" rx="44" ry="6" fill="currentColor" opacity=".15" />
      <path d="M58 70 Q60 40 88 38 Q116 40 118 70 L112 100 L64 100 Z" fill="currentColor" opacity=".85" />
      <path d="M60 100 L116 100 L110 112 L66 112 Z" fill="currentColor" opacity=".6" />
      <path d="M70 112 L60 150 M106 112 L116 150 M80 112 L78 146 M96 112 L98 146" stroke="currentColor" strokeWidth="3" opacity=".7" />
    </>
  );
}

function Grid({ seed }: { seed: number }) {
  const r = seeded(seed);
  return (
    <>
      {Array.from({ length: 16 }, (_, i) => {
        const x = 12 + (i % 4) * 39, y = 12 + Math.floor(i / 4) * 39;
        const k = r();
        return k > 0.66 ? (
          <circle key={i} cx={x + 16} cy={y + 16} r="13" fill="currentColor" opacity={q(0.3 + k * 0.5)} />
        ) : (
          <rect key={i} x={x} y={y} width="32" height="32" rx={k > 0.33 ? 6 : 0} fill="none" stroke="currentColor" opacity={q(0.3 + k * 0.6)} />
        );
      })}
    </>
  );
}

function Site({ seed }: { seed: number }) {
  const r = seeded(seed);
  return (
    <>
      <rect x="10" y="12" width="156" height="152" fill="none" stroke="currentColor" opacity=".3" />
      <rect x="10" y="12" width="156" height="10" fill="currentColor" opacity=".25" />
      <text x="18" y="70" fill="currentColor" fontFamily="var(--f-display)" fontWeight="800" fontSize="30" opacity=".9">
        STUDIO
      </text>
      {Array.from({ length: 3 }, (_, i) => (
        <rect key={i} x={18 + i * 50} y="96" width="42" height={q(40 + r() * 20)} fill="currentColor" opacity={q(0.2 + r() * 0.4)} />
      ))}
    </>
  );
}

function Shop({ seed }: { seed: number }) {
  const r = seeded(seed);
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const x = 12 + (i % 3) * 52, y = 14 + Math.floor(i / 3) * 80;
        return (
          <g key={i}>
            <rect x={x} y={y} width="46" height="50" fill="currentColor" opacity={q(0.15 + r() * 0.35)} />
            <rect x={x} y={y + 56} width="30" height="4" fill="currentColor" opacity=".6" />
            <rect x={x} y={y + 64} width="18" height="3" fill="currentColor" opacity=".3" />
          </g>
        );
      })}
    </>
  );
}

const MOTIFS = [Site, Shop, Bars, Wave, Object3D, Grid];

export default function Thumb({ index }: { index: number }) {
  const M = MOTIFS[index % MOTIFS.length];
  return (
    <svg className={`pj-gen g${index % 3}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Project preview placeholder">
      <M seed={index * 97 + 13} />
    </svg>
  );
}
