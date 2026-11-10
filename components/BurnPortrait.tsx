"use client";

// "Burning paper" reveal: a cover image sits over the portrait. Where the cursor hovers, the
// cover scorches brown, chars black, glows and slowly burns away — throwing off sparks, ash and
// smoke — revealing the original photo. When the cursor leaves, the cover slowly closes again.
//
// How it works: a small off-screen "burn map" (ping-pong render targets) stores per pixel
//   G = how much should burn (painted by the cursor brush, decays after you leave)
//   R = how much has burned (creeps toward G slowly → the slow-motion feel)
// The display shader compares R with paper-fibre noise to get a ragged, organic burn line.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cutout } from "@/lib/cutout";

type Props = { src: string; cover: string; play: boolean };

const SIM_W = 320;
const BURN_RATE = 0.36; // burn progress per second (≈3 s for a full burn — slow motion)
const HEAL_RATE = 0.26; // how fast the cover closes again after the cursor leaves
const HEAL_DELAY = 1600; // ms to wait after leaving before the cover starts closing
const BRUSH = 0.2; // brush radius as a fraction of the portrait width

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const simFrag = /* glsl */ `
  uniform sampler2D uPrev;
  uniform vec2 uMouse;     // uv on the portrait
  uniform float uOn;       // brush active
  uniform float uAspect;   // portrait height / width
  uniform float uBrush;
  uniform float uBurn;     // burn step this frame
  uniform float uHeal;     // heal step this frame
  varying vec2 vUv;
  void main() {
    vec4 p = texture2D(uPrev, vUv);
    float R = p.r, G = p.g;
    float d = length((vUv - uMouse) * vec2(1.0, uAspect));
    float brush = smoothstep(uBrush, uBrush * 0.3, d) * uOn;
    G = max(G, brush);
    G = max(0.0, G - uHeal);
    R = R < G ? min(G, R + uBurn) : max(G, R - uHeal * 1.2);
    gl_FragColor = vec4(R, G, 0.0, 1.0);
  }
`;

const displayVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const displayFrag = /* glsl */ `
  uniform sampler2D uOrig;
  uniform sampler2D uCover;
  uniform sampler2D uBurnMap;
  uniform float uHasCover;
  uniform vec2 uCoverFit;
  uniform vec2 uCoverShift;
  uniform float uAspect;
  uniform float uTime;
  uniform float uAlpha;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  vec4 coverAt(vec2 uv, vec4 orig) {
    if (uHasCover > 0.5) {
      vec2 cuv = (uv - 0.5) * uCoverFit + 0.5 + uCoverShift;
      if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) return vec4(0.0);
      return texture2D(uCover, cuv);
    }
    float l = smoothstep(0.08, 0.78, lum(orig.rgb));
    float grain = (hash(floor(uv * vec2(600.0, 600.0 * uAspect))) - 0.5) * 0.08;
    return vec4(vec3(clamp(l + grain, 0.0, 1.0)), orig.a);
  }

  void main() {
    vec2 uv = vUv;
    vec2 pp = uv * vec2(1.0, uAspect);
    float R = texture2D(uBurnMap, uv).r;
    float burning = smoothstep(0.0, 0.03, R);

    // paper-fibre noise decides which pixels catch first → ragged burn line
    float n = fbm(pp * 6.0) * 0.82 + 0.12;
    float e = R - n;                       // > 0 : burnt through

    // heat shimmer: the paper buckles a little just before it burns
    float near = smoothstep(-0.12, -0.01, e) * (1.0 - smoothstep(-0.01, 0.01, e)) * burning;
    vec2 warp = (vec2(noise(pp * 30.0 + uTime * 1.7), noise(pp * 30.0 - uTime * 1.3)) - 0.5) * 0.006 * near;

    vec4 orig = texture2D(uOrig, uv);
    vec4 cov = coverAt(uv + warp, orig);

    // flame tongues: animated noise licking upward along the edge
    float flame = fbm(pp * vec2(9.0, 5.0) + vec2(0.0, -uTime * 1.6)) - 0.5;
    float ef = e + flame * 0.035 * burning;

    float revealed = smoothstep(0.0, 0.016, e);
    float scorch = smoothstep(-0.17, -0.06, ef) * burning;            // brown toasting
    float charZone = smoothstep(-0.07, -0.005, ef) * burning;          // black char
    float edge = smoothstep(-0.03, 0.0, ef) * (1.0 - smoothstep(0.0, 0.03, ef)) * burning;

    // cover: toast → char, with glowing ember specks in the charred band
    vec3 c = cov.rgb;
    c = mix(c, c * vec3(0.72, 0.48, 0.26) + vec3(0.06, 0.02, 0.0), scorch * 0.85);
    c = mix(c, vec3(0.03, 0.02, 0.015), charZone * 0.93);
    float speck = step(0.82, noise(pp * 140.0 + floor(uTime * 6.0) * 3.1)) * charZone * (1.0 - revealed);
    float pulse = 0.55 + 0.45 * sin(uTime * 9.0 + n * 60.0);
    c += vec3(1.0, 0.35, 0.05) * speck * pulse * 1.4;

    // revealed photo, with a sooty rim right at the burn line
    vec3 photo = orig.rgb * (1.0 - (1.0 - smoothstep(0.0, 0.05, e)) * 0.55 * revealed);
    vec3 col = mix(c, photo, revealed);

    // the glowing burn line: white-yellow core → orange → deep red
    float core = smoothstep(-0.012, 0.0, ef) * (1.0 - smoothstep(0.0, 0.012, ef)) * burning;
    float flick = 0.72 + 0.28 * sin(uTime * 17.0 + n * 50.0) * sin(uTime * 6.1 + n * 23.0);
    vec3 fire = mix(vec3(0.85, 0.12, 0.02), vec3(1.0, 0.55, 0.08), edge);
    fire = mix(fire, vec3(1.0, 0.93, 0.62), core);
    col += fire * (edge * 1.6 + core * 1.2) * flick;
    // warm glow spilling onto the revealed side
    col += vec3(1.0, 0.4, 0.08) * (1.0 - smoothstep(0.0, 0.07, e)) * revealed * 0.35 * flick * burning;

    float a = mix(cov.a, orig.a, revealed);
    a = max(a, edge * max(cov.a, orig.a));
    a *= smoothstep(0.0, 0.12, vUv.y) * uAlpha;   // same soft bottom edge as the other designs
    if (a < 0.003) discard;
    gl_FragColor = vec4(col, a);
  }
`;

// ── particles: sparks (additive) + ash/smoke (normal blending) ──
const sparkVert = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  varying float vLife;
  varying float vFlick;
  void main() {
    vLife = aLife;
    vFlick = 0.6 + 0.4 * sin(uTime * 30.0 + aSeed * 50.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.35 + aLife * 0.9);
  }
`;
const sparkFrag = /* glsl */ `
  varying float vLife;
  varying float vFlick;
  void main() {
    if (vLife <= 0.0) discard;
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vLife * vFlick;
    vec3 c = mix(vec3(0.75, 0.12, 0.02), vec3(1.0, 0.85, 0.45), smoothstep(0.3, 1.0, vLife));
    gl_FragColor = vec4(c * a * 1.4, a);
  }
`;
const ashVert = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  attribute float aKind;   // 0 = ash flake, 1 = smoke puff
  attribute float aSeed;
  uniform float uTime;
  varying float vLife;
  varying float vKind;
  varying float vSeed;
  void main() {
    vLife = aLife; vKind = aKind; vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // flakes tumble (size wobbles), smoke grows as it rises
    float s = aKind > 0.5 ? aSize * (1.0 + (1.0 - aLife) * 2.5)
                          : aSize * (0.55 + 0.45 * abs(sin(uTime * 3.0 + aSeed * 20.0)));
    gl_PointSize = s;
  }
`;
const ashFrag = /* glsl */ `
  varying float vLife;
  varying float vKind;
  varying float vSeed;
  void main() {
    if (vLife <= 0.0) discard;
    vec2 p = gl_PointCoord - 0.5;
    if (vKind > 0.5) {
      float a = smoothstep(0.5, 0.0, length(p)) * vLife * 0.16;
      gl_FragColor = vec4(vec3(0.45), a);
    } else {
      // irregular flake: squashed square with a faint ember rim while young
      vec2 q = abs(p * vec2(1.0, 1.0 + fract(vSeed * 7.0)));
      float m = 1.0 - smoothstep(0.32, 0.4, max(q.x, q.y));
      vec3 col = mix(vec3(0.05), vec3(0.9, 0.3, 0.05), smoothstep(0.75, 1.0, vLife) * 0.8);
      gl_FragColor = vec4(col, m * min(1.0, vLife * 1.5) * 0.9);
    }
  }
`;

function makePool(n: number, extra: string[]) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const attrs: Record<string, Float32Array> = {};
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  for (const k of extra) {
    attrs[k] = new Float32Array(n);
    geo.setAttribute(k, new THREE.BufferAttribute(attrs[k], 1).setUsage(THREE.DynamicDrawUsage));
  }
  return { geo, pos, vel: new Float32Array(n * 2), attrs, n, next: 0 };
}

export default function BurnPortrait({ src, cover, play }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playRef = useRef(play);
  const introRef = useRef<() => void>(() => {});

  useEffect(() => {
    const wrap = wrapRef.current!;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

    // ── burn map (ping-pong) ──
    let simH = SIM_W;
    const makeRT = () =>
      new THREE.WebGLRenderTarget(SIM_W, simH, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    let rtA = makeRT(), rtB = makeRT();
    const simUniforms = {
      uPrev: { value: rtA.texture },
      uMouse: { value: new THREE.Vector2(-9, -9) },
      uOn: { value: 0 },
      uAspect: { value: 1 },
      uBrush: { value: BRUSH },
      uBurn: { value: 0 },
      uHeal: { value: 0 },
    };
    const simScene = new THREE.Scene();
    const simCam = new THREE.Camera();
    const simMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: simUniforms, vertexShader: quadVert, fragmentShader: simFrag }));
    simScene.add(simMesh);
    const clearRT = (rt: THREE.WebGLRenderTarget) => {
      renderer.setRenderTarget(rt);
      renderer.clear();
    };

    // ── display plane ──
    const uniforms = {
      uOrig: { value: null as THREE.Texture | null },
      uCover: { value: null as THREE.Texture | null },
      uBurnMap: { value: rtB.texture },
      uHasCover: { value: 0 },
      uCoverFit: { value: new THREE.Vector2(1, 1) },
      uCoverShift: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uTime: { value: 0 },
      uAlpha: { value: 0 },
    };
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ uniforms, vertexShader: displayVert, fragmentShader: displayFrag, transparent: true, depthTest: false, depthWrite: false })
    );
    plane.visible = false;
    scene.add(plane);

    // ── particle pools ──
    const timeU = { value: 0 };
    const sp = makePool(260, ["aLife", "aSize", "aSeed"]);
    const sparks = new THREE.Points(
      sp.geo,
      new THREE.ShaderMaterial({ uniforms: { uTime: timeU }, vertexShader: sparkVert, fragmentShader: sparkFrag, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    const ash = makePool(180, ["aLife", "aSize", "aKind", "aSeed"]);
    const ashPts = new THREE.Points(
      ash.geo,
      new THREE.ShaderMaterial({ uniforms: { uTime: timeU }, vertexShader: ashVert, fragmentShader: ashFrag, transparent: true, depthTest: false, depthWrite: false })
    );
    sparks.frustumCulled = ashPts.frustumCulled = false;
    ashPts.renderOrder = 1;
    sparks.renderOrder = 2;
    scene.add(ashPts, sparks);

    // places that are burning (cursor trail); particles keep coming from them while the burn spreads
    const fires: { x: number; y: number; t: number }[] = [];

    // ── layout (same framing as the particle portrait) ──
    let W = 1, H = 1, pw = 1, ph = 1, top = 0, aspect = 1.24;
    let mask: { bg: Uint8Array; w: number; h: number } | null = null;
    function layout() {
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
      const mobile = W < 760 || (H > W && W <= 1100);
      ph = H * (mobile ? 1.0 : 1.38);
      pw = ph / aspect;
      if (pw > W * (mobile ? 1.2 : 0.95)) {
        pw = W * (mobile ? 1.2 : 0.95);
        ph = pw * aspect;
      }
      top = H / 2 + H * (mobile ? -0.04 : 0.02);
      plane.scale.set(pw, ph, 1);
      plane.position.set(0, top - ph / 2, 0);
      uniforms.uAspect.value = aspect;
      simUniforms.uAspect.value = aspect;
    }
    const ro = new ResizeObserver(layout);
    ro.observe(wrap);

    // ── load images ──
    const loadImg = (url: string) =>
      new Promise<HTMLImageElement | null>((res) => {
        const im = new Image();
        im.decoding = "async";
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = url;
      });
    const tex = (im: HTMLImageElement) => {
      const t = new THREE.Texture(im);
      t.colorSpace = THREE.NoColorSpace;
      t.needsUpdate = true;
      return t;
    };
    let startAt = -1;
    Promise.all([loadImg(src), cover ? loadImg(cover) : Promise.resolve(null)]).then(([img, cov]) => {
      if (disposed || !img) return;
      aspect = img.naturalHeight / img.naturalWidth;
      uniforms.uOrig.value = tex(img);
      const m = cutout(img, 160);
      mask = { bg: m.bg, w: m.w, h: m.h };
      if (cov) {
        uniforms.uCover.value = tex(cov);
        uniforms.uHasCover.value = 1;
        // cover-fit the costume image into the portrait frame, anchored near the top (heads line up)
        const ca = cov.naturalHeight / cov.naturalWidth;
        if (ca > aspect) {
          const sy = aspect / ca;
          uniforms.uCoverFit.value.set(1, sy);
          uniforms.uCoverShift.value.set(0, (1 - sy) / 2 - 0.02);
        } else {
          uniforms.uCoverFit.value.set(ca / aspect, 1);
        }
      }
      simH = Math.round(SIM_W * aspect);
      rtA.dispose();
      rtB.dispose();
      rtA = makeRT();
      rtB = makeRT();
      clearRT(rtA);
      clearRT(rtB);
      renderer.setRenderTarget(null);
      layout();
      plane.visible = true;
      if (playRef.current) startAt = performance.now();
    });
    introRef.current = () => {
      if (startAt < 0 && uniforms.uOrig.value) startAt = performance.now();
    };

    // ── input ──
    const mouse = { x: 0, y: 0, u: -9, v: -9, inside: false, lastOn: 0 };
    const onSubject = (u: number, v: number) => {
      if (!mask || u < 0 || u > 1 || v < 0 || v > 1) return false;
      const cx = Math.floor(u * mask.w), cy = Math.floor((1 - v) * mask.h);
      for (let oy = -3; oy <= 3; oy++)
        for (let ox = -3; ox <= 3; ox++) {
          const x = cx + ox, y = cy + oy;
          if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && !mask.bg[y * mask.w + x]) return true;
        }
      return false;
    };
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left - W / 2;
      mouse.y = H / 2 - (e.clientY - r.top);
      mouse.u = mouse.x / pw + 0.5;
      mouse.v = (mouse.y - (top - ph)) / ph;
      const over = e.target instanceof Element && e.target.closest(".navbox.open");
      mouse.inside = !over && e.clientY >= r.top && e.clientY <= r.bottom && onSubject(mouse.u, mouse.v);
    };
    const onLeave = () => (mouse.inside = false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(wrap);

    // ── particle emitters ──
    const emitSpark = (x: number, y: number) => {
      const i = sp.next++ % sp.n;
      sp.pos[i * 3] = x;
      sp.pos[i * 3 + 1] = y;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const s = 40 + Math.random() * 140;
      sp.vel[i * 2] = Math.cos(a) * s * 0.6;
      sp.vel[i * 2 + 1] = -Math.sin(a) * s;
      sp.attrs.aLife[i] = 0.7 + Math.random() * 0.3;
      sp.attrs.aSize[i] = (1.4 + Math.random() * 2.6) * dpr;
      sp.attrs.aSeed[i] = Math.random();
    };
    const emitAsh = (x: number, y: number, smoke: boolean) => {
      const i = ash.next++ % ash.n;
      ash.pos[i * 3] = x;
      ash.pos[i * 3 + 1] = y;
      ash.vel[i * 2] = (Math.random() - 0.5) * 24;
      ash.vel[i * 2 + 1] = smoke ? 18 + Math.random() * 20 : 10 + Math.random() * 30;
      ash.attrs.aLife[i] = 1;
      ash.attrs.aKind[i] = smoke ? 1 : 0;
      ash.attrs.aSize[i] = (smoke ? 30 + Math.random() * 40 : 3 + Math.random() * 5) * dpr;
      ash.attrs.aSeed[i] = Math.random();
    };

    // ── loop ──
    let raf = 0;
    let last = performance.now();
    let lastFire = { x: -1e5, y: -1e5 };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden || !plane.visible) return;

      const intro = startAt < 0 ? 0 : Math.min(1, (now - startAt) / 1400);
      uniforms.uAlpha.value = intro * intro * (3 - 2 * intro);
      uniforms.uTime.value = timeU.value = now / 1000;

      const on = intro >= 1 && mouse.inside;
      if (on) mouse.lastOn = now;
      // 8-bit burn map: keep every step at least ~1.5/255 so progress never stalls
      const step = (rate: number) => Math.max(1.5 / 255, rate * dt);
      simUniforms.uMouse.value.set(mouse.u, mouse.v);
      simUniforms.uOn.value = on ? 1 : 0;
      simUniforms.uBurn.value = step(BURN_RATE);
      simUniforms.uHeal.value = !on && now - mouse.lastOn > HEAL_DELAY ? step(HEAL_RATE) : 0;
      simUniforms.uPrev.value = rtA.texture;
      renderer.setRenderTarget(rtB);
      renderer.render(simScene, simCam);
      renderer.setRenderTarget(null);
      uniforms.uBurnMap.value = rtB.texture;
      [rtA, rtB] = [rtB, rtA];

      // remember burning spots along the cursor trail
      if (on && Math.hypot(mouse.x - lastFire.x, mouse.y - lastFire.y) > BRUSH * pw * 0.35) {
        fires.push({ x: mouse.x, y: mouse.y, t: now });
        lastFire = { x: mouse.x, y: mouse.y };
        if (fires.length > 24) fires.shift();
      }
      // each spot throws sparks/ash from its spreading ring for ~3 s
      const R0 = BRUSH * pw;
      for (let f = fires.length - 1; f >= 0; f--) {
        const age = (now - fires[f].t) / 1000;
        if (age > 3.2) {
          fires.splice(f, 1);
          continue;
        }
        const ring = R0 * Math.min(1, 0.25 + age / 2.6);
        const intensity = (1 - age / 3.2) * 60 * dt;
        for (let k = 0; k < intensity; k++) {
          if (Math.random() > intensity - k) break;
          const a = Math.random() * Math.PI * 2;
          const r = ring * (0.75 + Math.random() * 0.35);
          const x = fires[f].x + Math.cos(a) * r, y = fires[f].y + Math.sin(a) * r * 0.9;
          const roll = Math.random();
          if (roll < 0.62) emitSpark(x, y);
          else if (roll < 0.9) emitAsh(x, y, false);
          else emitAsh(x, y, true);
        }
      }

      // sparks: buoyant, turbulent, quickly dying
      for (let i = 0; i < sp.n; i++) {
        const L = sp.attrs.aLife;
        if (L[i] <= 0) continue;
        const s = sp.attrs.aSeed[i];
        sp.vel[i * 2] += (Math.sin(now / 180 + s * 40) * 90 - sp.vel[i * 2] * 0.8) * dt;
        sp.vel[i * 2 + 1] += (40 - sp.vel[i * 2 + 1] * 0.6) * dt;
        sp.pos[i * 3] += sp.vel[i * 2] * dt;
        sp.pos[i * 3 + 1] += sp.vel[i * 2 + 1] * dt;
        L[i] -= dt * (0.6 + s * 0.6);
      }
      // ash flakes drift and sway; smoke rises and spreads
      for (let i = 0; i < ash.n; i++) {
        const L = ash.attrs.aLife;
        if (L[i] <= 0) continue;
        const s = ash.attrs.aSeed[i];
        const smoke = ash.attrs.aKind[i] > 0.5;
        ash.pos[i * 3] += (ash.vel[i * 2] + Math.sin(now / 400 + s * 30) * (smoke ? 10 : 26)) * dt;
        ash.pos[i * 3 + 1] += ash.vel[i * 2 + 1] * dt;
        L[i] -= dt * (smoke ? 0.35 : 0.3 + s * 0.2);
      }
      for (const pool of [sp, ash]) {
        (pool.geo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
        for (const k of Object.keys(pool.attrs)) (pool.geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      rtA.dispose();
      rtB.dispose();
      simMesh.geometry.dispose();
      (simMesh.material as THREE.Material).dispose();
      plane.geometry.dispose();
      (plane.material as THREE.Material).dispose();
      sp.geo.dispose();
      ash.geo.dispose();
      (sparks.material as THREE.Material).dispose();
      (ashPts.material as THREE.Material).dispose();
      uniforms.uOrig.value?.dispose();
      uniforms.uCover.value?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, cover]);

  useEffect(() => {
    if (play && !playRef.current) {
      playRef.current = true;
      introRef.current();
    }
  }, [play]);

  return <div ref={wrapRef} className="particles" aria-hidden="true" />;
}
