"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HERO_PULSE, type HeroPulseDetail } from "@/lib/hero-pulse";

// The hero backdrop, built from the product's own subject matter rather than
// from a graphics demo.
//
// Three layers, all in one fragment shader:
//   1. A slow flowing gradient — the visual language of payments, and the only
//      register that reads as calm rather than energetic. Sparks and embers
//      belong to gaming; money does not flicker.
//   2. A faint ruled grid fading toward the horizon: a ledger, which is what an
//      invoicing product actually is.
//   3. Light sweeping left to right, the direction value travels — from you to
//      your client — with a ring when the demo composes an invoice.
//
// No geometry: a single full-screen quad, so cost is per pixel rather than per
// vertex, and the buffer renders at 65% scale because a soft gradient loses
// nothing to it. That makes this cheaper than both the particle field and the
// wireframe plane before it.

const RESOLUTION_SCALE = 0.65;
const PULSE_LIFE = 2.0;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uPulseAge;
  uniform vec2 uPulseOrigin;
  uniform vec3 uBase;
  uniform vec3 uInk;
  uniform vec3 uWarm;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * uAspect, uv.y);

    // Domain-warped noise: the difference between a gradient that flows and one
    // that merely scrolls.
    vec2 q = p * 1.5 + vec2(uTime * 0.030, uTime * -0.010);
    vec2 warp = vec2(fbm(q), fbm(q + vec2(5.2, 1.3)));
    float field = fbm(q + warp * 1.7);

    // The cursor lifts the field rather than pushing objects around: this layer
    // is a surface, so it should behave like one.
    vec2 m = vec2(uMouse.x * uAspect, uMouse.y);
    float lift = smoothstep(0.42, 0.0, distance(p, m)) * uMouseStrength;
    field += lift * 0.22;

    // One ring when an invoice is composed.
    float ring = 0.0;
    if (uPulseAge > 0.0 && uPulseAge < 2.0) {
      vec2 o = vec2(uPulseOrigin.x * uAspect, uPulseOrigin.y);
      float band = distance(p, o) - uPulseAge * 0.85;
      ring = exp(-band * band / 0.0035) * (1.0 - uPulseAge / 2.0);
      field += ring * 0.45;
    }

    // A soft source in the open right: without one the field is an even
    // wash with nothing to look at.
    float core = smoothstep(0.8, 0.0, distance(p, vec2(0.86 * uAspect, 0.72)));
    field += core * 0.15;

    // Value moving left to right.
    float sweep = smoothstep(0.78, 1.0, sin((p.x * 0.8 - uTime * 0.14) * 3.14159));
    field += sweep * 0.05;

    // The ledger: ruled lines, fading in toward the top so they read as a
    // surface receding rather than as wallpaper.
    vec2 g = vec2(p.x * 13.0 - uTime * 0.12, p.y * 9.0);
    vec2 gf = abs(fract(g) - 0.5);
    float lines = smoothstep(0.47, 0.5, max(gf.x, gf.y));
    float grid = lines * 0.045 * smoothstep(0.05, 0.7, uv.y);

    // These constants were solved for, not guessed: the curve puts the dim
    // majority of the frame near 6% luminance, mid tones around 16%, and only
    // the brightest plumes at 25–30%, which is bright enough to see on a dark
    // page and dim enough that white type still owns the screen.
    float t = clamp((field - 0.42) * 2.6, 0.0, 1.0);
    vec3 color = uBase;
    color = mix(color, uInk, smoothstep(0.05, 0.85, t) * 0.90);
    color = mix(color, uWarm, smoothstep(0.80, 1.05, t) * 0.50);
    color += ring * 0.30 + grid;

    // The headline needs clean ground, and the band below needs no seam: the
    // field clears to the left and dissolves at the bottom.
    float alpha = smoothstep(0.04, 0.52, uv.x) * smoothstep(0.0, 0.28, uv.y);

    gl_FragColor = vec4(color, alpha * 0.9);
  }
`;

export default function NeonLandscape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = window.matchMedia("(max-width: 900px)").matches;
    if (reducedMotion || smallScreen) return;

    const canvas = document.createElement("canvas");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // No WebGL: the gradient shade underneath is a fine fallback.
    }
    el.appendChild(canvas);
    renderer.setPixelRatio(1); // the buffer is scaled explicitly below
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera(); // the quad is drawn straight in clip space

    const uniforms = {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseStrength: { value: 0 },
      uPulseAge: { value: -1 },
      uPulseOrigin: { value: new THREE.Vector2(0.75, 0.55) },
      uBase: { value: new THREE.Color(0x120d16) },
      uInk: { value: new THREE.Color(0xbc2f74) },
      uWarm: { value: new THREE.Color(0xffa257) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);

    let mouseTargetStrength = 0;
    const onPointerMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      uniforms.uMouse.value.set(
        (event.clientX - rect.left) / Math.max(rect.width, 1),
        1 - (event.clientY - rect.top) / Math.max(rect.height, 1)
      );
      mouseTargetStrength = 1;
    };
    const onPointerLeave = () => {
      mouseTargetStrength = 0;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(Math.round(w * RESOLUTION_SCALE), Math.round(h * RESOLUTION_SCALE), false);
      uniforms.uAspect.value = w / h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    let running = false;
    let pulseStart = -Infinity;
    const clock = new THREE.Clock();

    const tick = () => {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      uniforms.uMouseStrength.value += (mouseTargetStrength - uniforms.uMouseStrength.value) * 0.05;

      const age = t - pulseStart;
      uniforms.uPulseAge.value = age >= 0 && age < PULSE_LIFE ? age : -1;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPulse = (event: Event) => {
      const detail = (event as CustomEvent<HeroPulseDetail>).detail;
      const rect = el.getBoundingClientRect();
      if (detail) {
        uniforms.uPulseOrigin.value.set(
          (detail.x * window.innerWidth - rect.left) / Math.max(rect.width, 1),
          1 - (detail.y * window.innerHeight - rect.top) / Math.max(rect.height, 1)
        );
      }
      pulseStart = clock.getElapsedTime();
      start(); // in case the hero had scrolled out and the loop was paused
    };
    window.addEventListener(HERO_PULSE, onPulse);

    // Only animate while the hero is actually on screen.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 }
    );
    io.observe(el);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener(HERO_PULSE, onPulse);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (canvas.parentNode === el) el.removeChild(canvas);
    };
  }, []);

  return <div ref={ref} className="neon-landscape" aria-hidden />;
}
