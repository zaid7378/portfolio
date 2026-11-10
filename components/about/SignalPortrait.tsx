"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePrefs } from "@/lib/prefs";

// Portrait rendered like a photo on an old RGB monitor: subpixel stripes,
// rainbow contour bands, scanlines and a slow scan bar. Hover reveals the
// original photo from the cursor outward (same idea as the home portrait).

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uRes;        // canvas size (device px)
  uniform vec2 uImg;        // image aspect fit (scale of uv)
  uniform float uTime;
  uniform vec2 uMouse;      // uv
  uniform float uReveal;    // 0..1 radius in uv units
  uniform float uIntro;
  uniform float uLight;
  varying vec2 vUv;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }
  float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    // cover-fit the photo, anchored to the bottom (shoulders bleed off)
    // head-and-shoulders crop, anchored near the top of the photo
    // (CanvasTexture is flipY'd, so uv.y = 1 is the top of the photo)
    vec2 uv = (vUv - vec2(0.5, 1.0)) * uImg + vec2(0.5, 0.985);
    // tiny horizontal jitter
    uv.x += (rand(vec2(floor(vUv.y * 140.0), floor(uTime * 12.0))) - 0.5) * 0.002;

    vec4 tex = texture2D(uTex, uv);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) tex = vec4(0.0);
    float l = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
    l = pow(smoothstep(0.02, 0.8, l), 0.7);

    // rainbow contour bands following the brightness
    vec3 rainbow = hsv2rgb(vec3(fract(l * 2.2 - uTime * 0.04 + vUv.y * 0.15), 0.55, 1.0));
    vec3 signal = mix(vec3(l), rainbow * l, 0.55);

    // RGB subpixel stripes
    float col = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(step(col, 1.0), step(1.0, col) * step(col, 2.0), step(2.0, col));
    mask = mix(vec3(0.35), vec3(1.0), mask);
    signal *= mask * 1.55;

    // scanlines + moving scan bar
    signal *= 0.78 + 0.22 * sin(gl_FragCoord.y * 1.3);
    float bar = smoothstep(0.035, 0.0, abs(fract(vUv.y + uTime * 0.07) - 0.5));
    signal += bar * 0.12 * l;

    // hover: original photo spreads out from the cursor
    vec2 d = (vUv - uMouse) * vec2(uRes.x / uRes.y, 1.0);
    float amt = 1.0 - smoothstep(uReveal - 0.12, uReveal, length(d));
    amt *= step(0.001, uReveal);
    vec3 outc = mix(signal, tex.rgb, amt);

    float a = tex.a * smoothstep(0.0, 0.28, vUv.y) * uIntro;
    // intro: scan in from the top
    a *= step(1.0 - uIntro * 1.05, vUv.y);
    gl_FragColor = vec4(outc, a);
  }
`;

export default function SignalPortrait({ src }: { src: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const { theme } = usePrefs();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const el = wrap.current!;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uImg: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uReveal: { value: 0 },
      uIntro: { value: 0 },
      uLight: { value: 0 },
    };
    const scene = new THREE.Scene();
    const cam = new THREE.Camera();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true })
    );
    scene.add(mesh);

    let imgAspect = 1.24;
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px";
      renderer.domElement.style.height = h + "px";
      uniforms.uRes.value.set(w, h);
      // cover: scale uv so the photo fills the card width, slightly zoomed in
      const boxAspect = h / w;
      const zoom = 0.62; // fraction of the photo's height shown → head & shoulders
      if (imgAspect > boxAspect) uniforms.uImg.value.set(zoom, (boxAspect / imgAspect) * zoom);
      else uniforms.uImg.value.set((imgAspect / boxAspect) * zoom, zoom);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgAspect = img.naturalHeight / img.naturalWidth;
      // portrait.webp is already cut out (transparent background) → use it directly
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.NoColorSpace;
      uniforms.uTex.value = tex;
      fit();
      started = performance.now();
    };

    // hover reveal
    const m = { on: false, r: 0, x: 0.5, y: 0.5 };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      m.x = (e.clientX - r.left) / r.width;
      m.y = 1 - (e.clientY - r.top) / r.height;
      m.on = true;
    };
    const leave = () => (m.on = false);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    // only draws while the card is on screen
    let visible = false;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(el);

    let started = -1;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // 30 fps is plenty for a scanline effect and halves the work
      if (now - last < 32) return;
      const dt = Math.min(3, (now - last) / 16.667);
      last = now;
      if (!visible || document.hidden || !uniforms.uTex.value) return;
      uniforms.uTime.value = now / 1000;
      uniforms.uIntro.value = started < 0 ? 0 : Math.min(1, (now - started) / 1600);
      m.r = m.on ? Math.min(1.6, m.r + 0.03 * dt) : Math.max(0, m.r - 0.05 * dt);
      uniforms.uReveal.value = m.r;
      uniforms.uMouse.value.set(m.x, m.y);
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      uniforms.uTex.value?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return <div ref={wrap} className="signal-portrait" />;
}
