// Pure-CSS starfield: three layers of tiny stars (box-shadows) that drift upward and twinkle.
// Everything animates with transform/opacity on the compositor — zero JavaScript per frame.
// Positions come from a seeded random generator, so server and client render the same stars.

function stars(count: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (rnd() * 100).toFixed(2);
    const y = (rnd() * 100).toFixed(2);
    const a = (0.35 + rnd() * 0.65).toFixed(2);
    const c = `rgb(var(--star-rgb) / ${a})`;
    // each star twice (y and y + 100vh) so the upward drift loops seamlessly
    out.push(`${x}vw ${y}vh 0 0 ${c}`, `${x}vw ${(+y + 100).toFixed(2)}vh 0 0 ${c}`);
  }
  return out.join(",");
}

const LAYERS = [
  { cls: "s1", shadow: stars(140, 11) },
  { cls: "s2", shadow: stars(70, 23) },
  { cls: "s3", shadow: stars(22, 37) },
];

export default function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      {LAYERS.map((l) => (
        <i key={l.cls} className={`star-layer ${l.cls}`} style={{ boxShadow: l.shadow }} />
      ))}
    </div>
  );
}
