"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { site, type Design, type Tier } from "@/lib/site";
import { cutout } from "@/lib/cutout";

type Props = {
  src: string;
  tier: Tier;
  theme: "dark" | "light";
  design: Design;
  /** flips true once the preloader is gone → particles assemble */
  play: boolean;
};

const TIER = {
  HIGH: { cols: 270, dpr: 2, wobble: 1 },
  MED: { cols: 200, dpr: 1.5, wobble: 1 },
  SAVER: { cols: 130, dpr: 1, wobble: 0.4 },
} as const;

/* ─────────────────────────────────────────────────────────────
   Image helpers
   ───────────────────────────────────────────────────────────── */

type Sample = {
  u: Float32Array;
  v: Float32Array;
  b: Float32Array;
  seed: Float32Array;
  /** original photo colour per particle (rgb 0..1) */
  col: Float32Array;
  count: number;
  aspect: number;
  cols: number;
  /** subject mask (1 = background) — used to know when the cursor is "on the image" */
  mask: Uint8Array;
  mw: number;
  mh: number;
};

function sampleImage(img: HTMLImageElement, cols: number): Sample {
  const { data, bg, w, h, aspect } = cutout(img, cols);
  const U: number[] = [], V: number[] = [], B: number[] = [], S: number[] = [], C: number[] = [];
  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lumAt = (i: number) => (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;

  // Normalise to this photo's own range (2nd–98th percentile of the subject),
  // so a shadowed cheek / dark shirt still gets visible particles.
  const subject: number[] = [];
  for (let i = 0; i < w * h; i++) if (!bg[i]) subject.push(lumAt(i));
  subject.sort((p, q) => p - q);
  const lo = subject[Math.floor(subject.length * 0.02)] ?? 0;
  const hi = subject[Math.floor(subject.length * 0.98)] ?? 1;
  const range = Math.max(0.05, hi - lo);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      const n = Math.min(1, Math.max(0, (lumAt(i) - lo) / range));
      // gamma < 1 lifts the shadows while keeping highlights on top
      const b = Math.pow(n, 0.72);
      const bottomFade = Math.min(1, (h - y) / (h * 0.12));
      if (rnd() > (0.42 + 0.5 * b) * bottomFade) continue;
      U.push((x + rnd()) / w);
      V.push((y + rnd()) / h);
      B.push(b);
      S.push(rnd());
      C.push(data[i * 4] / 255, data[i * 4 + 1] / 255, data[i * 4 + 2] / 255);
    }
  }
  return {
    u: Float32Array.from(U),
    v: Float32Array.from(V),
    b: Float32Array.from(B),
    seed: Float32Array.from(S),
    col: Float32Array.from(C),
    count: U.length,
    aspect,
    cols,
    mask: bg,
    mw: w,
    mh: h,
  };
}

/* ─────────────────────────────────────────────────────────────
   Shaders
   ───────────────────────────────────────────────────────────── */

const pointsVert = /* glsl */ `
  attribute float aSize;
  attribute float aBright;
  attribute float aSeed;
  attribute vec3 aScatter;
  attribute vec2 aDyn;          // x: cursor heat 0..1, y: globe depth 0..1
  attribute vec3 aColor;        // original photo colour
  uniform vec2 uMouse;          // colour reveal centre (px)
  uniform float uReveal;        // colour reveal radius (px), 0 = black & white
  uniform float uTime;
  uniform float uIntro;
  uniform float uDpr;
  uniform float uWobble;
  uniform float uHeight;
  uniform float uInvert;
  uniform float uGlobe;
  uniform float uSpacing;
  uniform float uAlpha;
  varying float vAlpha;
  varying float vHot;
  varying float vAmt;
  varying vec3 vNatural;

  void main() {
    vec3 p = position;

    // idle drift — a few loose particles float around the top of the head
    float drift = step(0.955, aSeed) * smoothstep(0.12, 0.36, p.y / uHeight) * (1.0 - uGlobe);
    float amp = uWobble * (0.6 + aSeed * 0.8 + drift * 14.0);
    p.x += sin(uTime * (0.4 + aSeed) + aSeed * 61.0) * amp;
    p.y += cos(uTime * (0.35 + aSeed * 0.7) + aSeed * 43.0) * amp;

    // intro: fly in from scatter, staggered per particle
    float t = clamp(uIntro * 1.7 - aSeed * 0.7, 0.0, 1.0);
    t = 1.0 - pow(1.0 - t, 3.0);
    p = mix(aScatter, p, t);

    // particles knocked away by the cursor swell up and brighten
    float hot = clamp(aDyn.x, 0.0, 1.0);
    vHot = hot;

    float tone = mix(aBright, 1.0 - aBright * 0.85, uInvert);
    float portraitA = 0.48 + 0.5 * tone;
    float globeA = 0.18 + 0.75 * aDyn.y;
    vAlpha = mix(portraitA, globeA, uGlobe) * (1.0 + hot * 0.6) * smoothstep(0.0, 0.35, t) * uAlpha;

    // colour reveal: an "ink" circle that spreads from the cursor
    float dm = distance(p.xy, uMouse);
    vAmt = (1.0 - smoothstep(uReveal - 160.0, uReveal, dm)) * step(0.5, uReveal);
    // keep the B&W brightness but restore the photo's hue, so dark areas (shirt, hair)
    // still read on the dark background; light theme uses the plain photo colour
    float l = dot(aColor, vec3(0.2126, 0.7152, 0.0722));
    vec3 lifted = clamp(aColor / max(l, 0.04) * (0.3 + 0.7 * aBright), 0.0, 1.0);
    // lift only the dark tones; mid/bright areas (skin) keep the photo's real colour
    vec3 real = clamp(aColor * 1.18, 0.0, 1.0);
    vec3 dark = mix(lifted, real, smoothstep(0.3, 0.75, aBright));
    vNatural = mix(dark, aColor, uInvert);

    float size = mix(aSize, uSpacing * (0.9 + aSeed * 1.1), uGlobe);
    size *= mix(1.0, 0.45 + aDyn.y * 1.0, uGlobe);
    size *= 1.0 + hot * 1.4;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * uDpr * mix(2.2, 1.0, t);
  }
`;

const pointsFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPhotoMode;
  varying float vAlpha;
  varying float vHot;
  varying float vAmt;
  varying vec3 vNatural;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.3, d) * min(vAlpha, 1.0);
    // photo mode: particles dissolve where the real photo is revealed
    a *= 1.0 - uPhotoMode * smoothstep(0.35, 0.9, vAmt);
    if (a < 0.01) discard;
    vec3 gray = uColor * (0.72 + 0.28 * min(vAlpha, 1.0) + vHot * 0.2);
    vec3 colour = vNatural * (1.05 + vHot * 0.3);
    gl_FragColor = vec4(mix(gray, colour, vAmt), a);
  }
`;

const crtVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const crtFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uAlpha;
  uniform float uGlitch;
  uniform vec2 uMouse;
  uniform float uInvert;
  uniform vec2 uRevealUv;   // colour reveal centre (uv)
  uniform float uReveal;    // colour reveal radius (px)
  uniform vec2 uSize;       // plane size (px)
  varying vec2 vUv;

  float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    vec2 uv = vUv;

    // random horizontal tear bands
    float row = floor(uv.y * 48.0);
    float tick = floor(uTime * 9.0);
    float band = step(0.955 - uGlitch * 0.12, rand(vec2(row, tick)));
    uv.x += band * (rand(vec2(tick, row)) - 0.5) * (0.05 + uGlitch * 0.12);

    // cursor ripple
    vec2 dm = uv - uMouse;
    float near = smoothstep(0.22, 0.0, length(dm * vec2(1.0, 1.3)));
    uv.x += sin(uv.y * 120.0 + uTime * 18.0) * 0.012 * near;

    // chromatic separation
    float ca = 0.003 + 0.012 * uGlitch + near * 0.01;
    vec4 cg = texture2D(uTex, uv);
    float r = lum(texture2D(uTex, uv + vec2(ca, 0.0)).rgb);
    float g = lum(cg.rgb);
    float b = lum(texture2D(uTex, uv - vec2(ca, 0.0)).rgb);
    float a = max(cg.a, max(texture2D(uTex, uv + vec2(ca, 0.0)).a, texture2D(uTex, uv - vec2(ca, 0.0)).a));
    vec3 col = vec3(r, g, b);
    col = smoothstep(0.02, 0.85, col);
    // light theme: keep a normal (non-negative) B&W photo, just a touch more contrast
    col = mix(col, smoothstep(0.0, 0.95, col), uInvert);

    // colour reveal (same ink-spread as the particles), keeps the RGB split
    vec3 rgb = vec3(texture2D(uTex, uv + vec2(ca, 0.0)).r, cg.g, texture2D(uTex, uv - vec2(ca, 0.0)).b);
    rgb = smoothstep(0.0, 0.9, rgb);
    float rd = length((vUv - uRevealUv) * uSize);
    float amt = (1.0 - smoothstep(uReveal - 160.0, uReveal, rd)) * step(0.5, uReveal);
    col = mix(col, rgb, amt);

    // scanlines + grain + flicker + rolling bar
    // softer scanlines on the light background so the face stays readable
    float scan = mix(0.62, 0.8, uInvert) + mix(0.38, 0.2, uInvert) * sin(gl_FragCoord.y * 1.7);
    float grain = rand(uv * (uTime + 1.0)) * 0.12;
    float flicker = 0.94 + 0.06 * sin(uTime * 55.0);
    float roll = smoothstep(0.0, 0.06, abs(fract(uv.y - uTime * 0.12) - 0.5)) * 0.15 + 0.85;
    col = (col * scan * flicker * roll) + grain * (1.0 - uInvert);

    a *= smoothstep(0.0, 0.12, vUv.y);         // fade the bottom edge
    gl_FragColor = vec4(col, a * uAlpha);
  }
`;

/** The original photo, revealed in an "ink" circle that spreads from the cursor. */
const photoFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uAlpha;
  uniform vec2 uRevealUv;
  uniform float uReveal;
  uniform vec2 uSize;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    float rd = length((vUv - uRevealUv) * uSize);
    float amt = (1.0 - smoothstep(uReveal - 160.0, uReveal, rd)) * step(0.5, uReveal);
    float a = c.a * smoothstep(0.35, 0.9, amt) * uAlpha;
    a *= smoothstep(0.0, 0.12, vUv.y);       // same soft bottom edge as the particles
    if (a < 0.003) discard;
    gl_FragColor = vec4(c.rgb, a);
  }
`;

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */

type Api = { setTheme: (t: "dark" | "light") => void; intro: () => void; setDesign: (d: Design) => void };

export default function ParticlePortrait({ src, tier, theme, design, play }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const playRef = useRef(play);
  const themeRef = useRef(theme);
  const designRef = useRef(design);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const cfg = TIER[tier];
    let disposed = false;
    let raf = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);

    const dark = () => themeRef.current === "dark";
    const uniforms = {
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uDpr: { value: dpr },
      uWobble: { value: cfg.wobble },
      uHeight: { value: 1 },
      uInvert: { value: dark() ? 0 : 1 },
      uGlobe: { value: 0 },
      uSpacing: { value: 3 },
      uAlpha: { value: 1 },
      uColor: { value: new THREE.Color(dark() ? 0xffffff : 0x111111) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uReveal: { value: 0 },
      uPhotoMode: { value: 1 },
    };
    const crtUniforms = {
      uTex: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uGlitch: { value: 0 },
      uMouse: { value: new THREE.Vector2(-1, -1) },
      uInvert: uniforms.uInvert,
      uRevealUv: { value: new THREE.Vector2(0.5, 0.5) },
      uReveal: uniforms.uReveal,
      uSize: { value: new THREE.Vector2(1, 1) },
    };

    // colour reveal state: radius grows from the cursor while it's on the portrait
    const reveal = { r: 0, x: 0, y: 0 };

    // the real photo layer (PARTICLES design): particles dissolve into it on hover
    const photoUniforms = {
      uTex: crtUniforms.uTex,
      uAlpha: { value: 0 },
      uRevealUv: crtUniforms.uRevealUv,
      uReveal: uniforms.uReveal,
      uSize: crtUniforms.uSize,
    };
    let photo: THREE.Mesh | null = null;

    let geo: THREE.BufferGeometry | null = null;
    let points: THREE.Points | null = null;
    let crt: THREE.Mesh | null = null;
    let S: Sample | null = null;
    let home = new Float32Array(0);   // portrait layout
    let tgt = new Float32Array(0);    // where each particle wants to be right now
    let pos = new Float32Array(0);
    let vel = new Float32Array(0);
    let dyn = new Float32Array(0);    // per particle: displacement, depth
    let sphere = new Float32Array(0); // unit sphere coords for the globe
    let W = 1, H = 1, spacing = 3, pw = 1, ph = 1, top = 0;

    // animated mix values (eased in the loop)
    // start already in the chosen design (no particles→CRT cross-fade on first load)
    const startCrt = designRef.current === "CRT" ? 1 : 0;
    const mix = { globe: designRef.current === "GLOBE" ? 1 : 0, points: 1 - startCrt, crt: startCrt, photo: 1 };

    const mouse = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, vx: 0, vy: 0, inside: false, speed: 0 };
    const shocks: { x: number; y: number; r: number; s: number }[] = [];
    // frames left before the CPU physics goes to sleep (it wakes on clicks, design changes, resizes)
    let awake = 60;

    function layout() {
      awake = 60;
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      renderer.setSize(W, H, false);
      renderer.domElement.style.width = W + "px";
      renderer.domElement.style.height = H + "px";
      camera.left = -W / 2;
      camera.right = W / 2;
      camera.top = H / 2;
      camera.bottom = -H / 2;
      camera.updateProjectionMatrix();
      if (!S || !geo) return;

      // phones + portrait tablets use the stacked layout (portrait on top, text below)
      const mobile = W < 760 || (H > W && W <= 1100);
      ph = H * (mobile ? 1.0 : 1.38);
      pw = ph / S.aspect;
      if (pw > W * (mobile ? 1.2 : 0.95)) {
        pw = W * (mobile ? 1.2 : 0.95);
        ph = pw * S.aspect;
      }
      top = H / 2 + H * (mobile ? -0.04 : 0.02);
      spacing = pw / S.cols;
      uniforms.uHeight.value = ph;
      uniforms.uSpacing.value = spacing;

      const sizes = geo.getAttribute("aSize") as THREE.BufferAttribute;
      for (let i = 0; i < S.count; i++) {
        home[i * 3] = (S.u[i] - 0.5) * pw;
        home[i * 3 + 1] = top - S.v[i] * ph;
        sizes.array[i] = spacing * (1.0 + 0.8 * S.b[i]) * (0.75 + S.seed[i] * 0.5);
      }
      sizes.needsUpdate = true;
      for (const m of [crt, photo]) {
        if (!m) continue;
        m.scale.set(pw, ph, 1);
        m.position.set(0, top - ph / 2, 0);
      }
      crtUniforms.uSize.value.set(pw, ph);
      updateTargets(performance.now());
    }

    /** Is the cursor over the person (not the empty background around them)? */
    function onSubject(x: number, y: number) {
      if (!S) return false;
      if (designRef.current === "GLOBE") return Math.hypot(x, y) < Math.min(H * 0.36, W * 0.3);
      const u = x / pw + 0.5;
      const v = (top - y) / ph;
      if (u < 0 || u > 1 || v < 0 || v > 1) return false;
      const cx = Math.floor(u * S.mw), cy = Math.floor(v * S.mh);
      // small dilation so the edge of the silhouette / hair still counts
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const xx = cx + ox, yy = cy + oy;
          if (xx < 0 || yy < 0 || xx >= S.mw || yy >= S.mh) continue;
          if (!S.mask[yy * S.mw + xx]) return true;
        }
      }
      return false;
    }

    function build(img: HTMLImageElement) {
      S = sampleImage(img, cfg.cols);
      const n = S.count;
      home = new Float32Array(n * 3);
      tgt = new Float32Array(n * 3);
      pos = new Float32Array(n * 3);
      vel = new Float32Array(n * 2);
      dyn = new Float32Array(n * 2);
      sphere = new Float32Array(n * 3);
      const scatter = new Float32Array(n * 3);
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 400 + Math.random() * 900;
        scatter[i * 3] = Math.cos(a) * r;
        scatter[i * 3 + 1] = Math.sin(a) * r * 0.7;
        // fibonacci sphere, shuffled by seed so the morph looks organic
        const k = Math.floor(S.seed[i] * n);
        const y = 1 - (k / (n - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        sphere[i * 3] = Math.cos(golden * k) * rad;
        sphere[i * 3 + 1] = y;
        sphere[i * 3 + 2] = Math.sin(golden * k) * rad;
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n), 1));
      geo.setAttribute("aBright", new THREE.BufferAttribute(S.b, 1));
      geo.setAttribute("aSeed", new THREE.BufferAttribute(S.seed, 1));
      geo.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
      geo.setAttribute("aColor", new THREE.BufferAttribute(S.col, 3));
      geo.setAttribute("aDyn", new THREE.BufferAttribute(dyn, 2).setUsage(THREE.DynamicDrawUsage));
      points = new THREE.Points(
        geo,
        new THREE.ShaderMaterial({ uniforms, vertexShader: pointsVert, fragmentShader: pointsFrag, transparent: true, depthWrite: false, depthTest: false })
      );
      points.frustumCulled = false;
      scene.add(points);

      // CRT plane uses a high-res cut-out of the same photo
      // portrait.webp is already cut out → use it directly (no extra pixel pass on load)
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      // raw pass-through: custom shaders output exactly the photo's pixel values
      tex.colorSpace = THREE.NoColorSpace;
      crtUniforms.uTex.value = tex;
      crt = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({ uniforms: crtUniforms, vertexShader: crtVert, fragmentShader: crtFrag, transparent: true, depthWrite: false, depthTest: false })
      );
      crt.frustumCulled = false;
      crt.visible = false;
      scene.add(crt);

      photo = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({ uniforms: photoUniforms, vertexShader: crtVert, fragmentShader: photoFrag, transparent: true, depthWrite: false, depthTest: false })
      );
      photo.frustumCulled = false;
      photo.visible = false;
      photo.renderOrder = -1; // underneath the fading particles
      scene.add(photo);

      layout();
      for (let i = 0; i < n * 3; i++) pos[i] = tgt[i];
    }

    /* ── per-design targets ── */
    function updateTargets(now: number) {
      if (!S) return;
      const n = S.count;
      const d = designRef.current;
      const t = now / 1000;

      if (d === "GLOBE") {
        const R = Math.min(H * 0.36, W * 0.3);
        const th = t * 0.25;
        const tilt = 0.35;
        const ct = Math.cos(th), st = Math.sin(th), cx = Math.cos(tilt), sx = Math.sin(tilt);
        for (let i = 0; i < n; i++) {
          const x = sphere[i * 3], y = sphere[i * 3 + 1], z = sphere[i * 3 + 2];
          const x1 = x * ct + z * st;
          const z1 = -x * st + z * ct;
          const y2 = y * cx - z1 * sx;
          const z2 = y * sx + z1 * cx;
          tgt[i * 3] = x1 * R;
          tgt[i * 3 + 1] = y2 * R;
          dyn[i * 2 + 1] = (z2 + 1) / 2;
        }
        return;
      }

      if (d === "ORBIT") {
        // hold portrait → burst into orbit rings → orbit → reform, on a 10s loop
        const c = t % 10;
        const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
        let amt = 0;
        if (c > 2 && c < 3.6) amt = ease((c - 2) / 1.6);
        else if (c >= 3.6 && c < 7) amt = 1;
        else if (c >= 7 && c < 8.6) amt = 1 - ease((c - 7) / 1.6);
        const R = Math.min(H * 0.42, W * 0.36);
        const cy = top - ph * 0.27;
        for (let i = 0; i < n; i++) {
          const s = S.seed[i];
          const ring = Math.floor(s * 3);
          const r = R * (0.45 + ring * 0.28 + (s * 37 % 1) * 0.08);
          const dir = ring % 2 ? -1 : 1;
          const a = s * 628.3 + t * (0.5 - ring * 0.12) * dir;
          const rot = ring * 1.05 - 0.5;
          const ex = Math.cos(a) * r, ey = Math.sin(a) * r * 0.3;
          const ox = ex * Math.cos(rot) - ey * Math.sin(rot);
          const oy = ex * Math.sin(rot) + ey * Math.cos(rot) + cy;
          // stagger so particles peel off one after another
          const k = Math.min(1, Math.max(0, amt * 1.5 - s * 0.5));
          tgt[i * 3] = home[i * 3] + (ox - home[i * 3]) * k;
          tgt[i * 3 + 1] = home[i * 3 + 1] + (oy - home[i * 3 + 1]) * k;
          dyn[i * 2 + 1] = 1;
        }
        return;
      }

      // PARTICLES / CRT → portrait
      for (let i = 0; i < n; i++) {
        tgt[i * 3] = home[i * 3];
        tgt[i * 3 + 1] = home[i * 3 + 1];
        dyn[i * 2 + 1] = 1;
      }
    }

    /* ── physics ── */
    function simulate(dt: number, t: number) {
      if (!S) return;
      const n = S.count;
      const R = Math.max(80, spacing * 26);
      const R2 = R * R;
      const force = 2.4 * dt;
      const k = 0.028 * dt;
      const damp = Math.pow(0.885, dt);
      const heatDecay = Math.pow(0.965, dt);
      let energy = 0;
      const mvx = mouse.vx, mvy = mouse.vy;
      const scatterOn = site.particles.scatterOnHover;
      const mx = mouse.inside && scatterOn ? mouse.x : -1e5;
      const my = mouse.inside && scatterOn ? mouse.y : -1e5;

      for (let i = 0; i < n; i++) {
        const ix = i * 3, iv = i * 2;
        let px = pos[ix], py = pos[ix + 1];
        let vx = vel[iv], vy = vel[iv + 1];
        const s = S.seed[i];

        const dx = px - mx, dy = py - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = 1 - d / R;
          const ff = f * f * force * (5 + s * 9);
          // outward push + turbulence + get blown along with the cursor
          const ang = Math.sin(px * 0.021 + t * 1.7) * 3.1 + Math.cos(py * 0.017 - t * 1.3) * 3.1 + s * 6.28;
          vx += (dx / d) * ff + Math.cos(ang) * ff * 0.9 + mvx * f * 0.14;
          vy += (dy / d) * ff + Math.sin(ang) * ff * 0.9 + mvy * f * 0.14;
          // "heat" from the cursor → particle swells & brightens (shader)
          dyn[iv] = Math.min(1, dyn[iv] + f * 0.35 * dt);
        }
        for (let q = 0; q < shocks.length; q++) {
          const sh = shocks[q];
          const sx = px - sh.x, sy = py - sh.y;
          const sd = Math.sqrt(sx * sx + sy * sy) + 0.001;
          const band = 1 - Math.min(1, Math.abs(sd - sh.r) / 60);
          if (band > 0) {
            vx += (sx / sd) * band * sh.s * dt;
            vy += (sy / sd) * band * sh.s * dt;
          }
        }

        const hx = tgt[ix] - px, hy = tgt[ix + 1] - py;
        // slower particles (by seed) give a soft, trailing return
        const kk = k * (0.6 + s * 0.8);
        vx += hx * kk;
        vy += hy * kk;
        vx *= damp;
        vy *= damp;
        px += vx * dt;
        py += vy * dt;
        pos[ix] = px;
        pos[ix + 1] = py;
        vel[iv] = vx;
        vel[iv + 1] = vy;
        // heat cools off as the particle drifts home
        dyn[iv] *= heatDecay;
        const e = Math.abs(vx) + Math.abs(vy) + Math.abs(hx) + Math.abs(hy) + dyn[iv] * 10;
        if (e > energy) energy = e;
      }
      for (let q = shocks.length - 1; q >= 0; q--) {
        shocks[q].r += 18 * dt;
        shocks[q].s *= Math.pow(0.93, dt);
        if (shocks[q].s < 0.05) shocks.splice(q, 1);
      }
      (geo!.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (geo!.getAttribute("aDyn") as THREE.BufferAttribute).needsUpdate = true;
      // still moving? (lets the loop put the physics to sleep once everything is settled)
      return energy > 0.05 || shocks.length > 0;
    }

    /* ── input ── */
    const toLocal = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      return { x: e.clientX - r.left - W / 2, y: H / 2 - (e.clientY - r.top), inView: e.clientY >= r.top && e.clientY <= r.bottom };
    };
    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      mouse.x = p.x;
      mouse.y = p.y;
      // ignore the cursor while it's over the open menu / UI panels
      const over = e.target instanceof Element && e.target.closest(".navbox.open");
      mouse.inside = p.inView && !over;
    };
    const onLeave = () => (mouse.inside = false);
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      if (!p.inView) return;
      if (e.target instanceof Element && e.target.closest("a,button,input,textarea,.navbox")) return;
      shocks.push({ x: p.x, y: p.y, r: 0, s: 2.4 });
      awake = 60;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(wrap);
    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);

    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      if (disposed) return;
      build(img);
      if (playRef.current) apiRef.current?.intro();
    };

    let last = performance.now();
    let introStart = -1;
    const approach = (cur: number, to: number, rate: number, dt: number) => cur + (to - cur) * (1 - Math.pow(1 - rate, dt));

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(3, (now - last) / 16.667);
      last = now;
      if (!visible || document.hidden || !points) return;

      if (mouse.px > -1e4) {
        mouse.vx += (mouse.x - mouse.px - mouse.vx) * 0.3;
        mouse.vy += (mouse.y - mouse.py - mouse.vy) * 0.3;
      }
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.speed = approach(mouse.speed, mouse.inside ? Math.min(1, Math.hypot(mouse.vx, mouse.vy) / 25) : 0, 0.1, dt);

      if (introStart >= 0) uniforms.uIntro.value = Math.min(1, (now - introStart) / 2600);

      const d = designRef.current;
      mix.globe = approach(mix.globe, d === "GLOBE" ? 1 : 0, 0.05, dt);
      mix.points = approach(mix.points, d === "CRT" ? 0 : 1, 0.06, dt);
      mix.crt = approach(mix.crt, d === "CRT" ? 1 : 0, 0.06, dt);
      uniforms.uGlobe.value = mix.globe;
      uniforms.uAlpha.value = mix.points;
      points.visible = mix.points > 0.01;
      if (crt) {
        crt.visible = mix.crt > 0.01;
        crtUniforms.uAlpha.value = mix.crt * Math.min(1, uniforms.uIntro.value * 2);
        crtUniforms.uTime.value = now / 1000;
        crtUniforms.uGlitch.value = mouse.speed;
        crtUniforms.uMouse.value.set(
          mouse.inside ? (mouse.x - crt.position.x) / pw + 0.5 : -1,
          mouse.inside ? (mouse.y - crt.position.y) / ph + 0.5 : -1
        );
      }

      // ── colour reveal: B&W by default, original colours spread from the cursor on hover
      if (site.particles.colorOnHover) {
        const introDone = uniforms.uIntro.value >= 1;
        const on = introDone && mouse.inside && onSubject(mouse.x, mouse.y);
        if (on) {
          // follow the cursor gently while colour spreads
          reveal.x += (mouse.x - reveal.x) * Math.min(1, 0.15 * dt);
          reveal.y += (mouse.y - reveal.y) * Math.min(1, 0.15 * dt);
          if (reveal.r < 1) {
            reveal.x = mouse.x;
            reveal.y = mouse.y;
          }
        }
        // just enough radius to cover the whole portrait from the reveal point (+ soft edge)
        const maxR = Math.hypot(Math.abs(reveal.x) + pw / 2, Math.max(Math.abs(top - reveal.y), Math.abs(top - ph - reveal.y))) + 170;
        reveal.r = on ? Math.min(maxR, reveal.r + 24 * dt) : Math.max(0, Math.min(reveal.r, maxR) - 40 * dt);
        uniforms.uReveal.value = reveal.r;
        uniforms.uMouse.value.set(reveal.x, reveal.y);
        if (crt) crtUniforms.uRevealUv.value.set((reveal.x - crt.position.x) / pw + 0.5, (reveal.y - crt.position.y) / ph + 0.5);
      }

      // PARTICLES design: inside the reveal circle the particles fade out and the real photo shows
      mix.photo = approach(mix.photo, d === "PARTICLES" && site.particles.colorOnHover ? 1 : 0, 0.08, dt);
      uniforms.uPhotoMode.value = mix.photo;
      if (photo) {
        photoUniforms.uAlpha.value = mix.photo * mix.points;
        photo.visible = mix.photo > 0.01 && reveal.r > 0.5;
      }

      uniforms.uTime.value = now / 1000;
      if (d === "GLOBE" || d === "ORBIT") updateTargets(now);
      // physics only runs while something is actually moving — idle portraits cost ~nothing on the CPU
      const needsSim =
        d === "GLOBE" || d === "ORBIT" || awake > 0 || shocks.length > 0 || (mouse.inside && site.particles.scatterOnHover);
      if (points.visible && needsSim) awake = simulate(dt, now / 1000) ? 30 : awake - 1;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    apiRef.current = {
      setTheme(t) {
        uniforms.uColor.value.set(t === "dark" ? 0xffffff : 0x111111);
        uniforms.uInvert.value = t === "dark" ? 0 : 1;
      },
      intro() {
        introStart = performance.now();
      },
      setDesign() {
        awake = 120;
        updateTargets(performance.now());
        // a little kick so the morph feels alive
        for (let i = 0; i < vel.length; i++) vel[i] += (Math.random() - 0.5) * 14;
      },
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      geo?.dispose();
      (points?.material as THREE.Material | undefined)?.dispose();
      crt?.geometry.dispose();
      (crt?.material as THREE.Material | undefined)?.dispose();
      photo?.geometry.dispose();
      (photo?.material as THREE.Material | undefined)?.dispose();
      crtUniforms.uTex.value?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, [src, tier]);

  useEffect(() => {
    themeRef.current = theme;
    apiRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (designRef.current === design) return;
    designRef.current = design;
    apiRef.current?.setDesign(design);
  }, [design]);

  useEffect(() => {
    if (play && !playRef.current) {
      playRef.current = true;
      apiRef.current?.intro();
    }
  }, [play]);

  return <div ref={wrapRef} className="particles" aria-hidden="true" />;
}
