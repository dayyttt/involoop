"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HERO_PULSE, type HeroPulseDetail } from "@/lib/hero-pulse";

// The hero backdrop: a field of ~26,000 points drifting left to right — from
// you, toward your client — that parts around the cursor and takes a shockwave
// when the demo composes an invoice.
//
// Every particle's motion is computed in the vertex shader from its own seed
// and the clock, so the CPU does nothing per frame but update six uniforms.
// That is why this is both far denser and cheaper than the wireframe plane it
// replaces, which rewrote 9,409 vertex positions in JavaScript every frame.
//
// The glow comes from additive blending on soft round points rather than a
// post-processing pass: same look, no EffectComposer, one draw call.
//
// It keeps every guard the old scene had — desktop only, skipped under
// prefers-reduced-motion, paused once the hero leaves the viewport.

const COUNT = 15000;
const SPAN_X = 62;
const SPAN_Y = 21;
const SPAN_Z = 34;
const PULSE_LIFE = 1.8;

const vertexShader = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aSpeed;
  attribute float aScale;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uMouse;
  uniform float uMouseStrength;
  uniform float uPulseAge;
  uniform vec3 uPulseOrigin;

  varying float vTone;
  varying float vGlow;
  varying float vFade;
  varying float vTint;
  varying float vSpark;

  void main() {
    vec3 p = position;

    // Constant drift with a per-particle speed, wrapped so the field never
    // empties. The direction is the product's direction: sender to recipient.
    p.x = mod(p.x + uTime * aSpeed + ${(SPAN_X / 2).toFixed(1)}, ${SPAN_X.toFixed(1)}) - ${(SPAN_X / 2).toFixed(1)};

    // Layered sines standing in for curl noise: cheap, and smooth enough that
    // the field breathes instead of shimmering.
    float a = uTime * 0.22 + aSeed.x * 6.2831;
    float b = uTime * 0.17 + aSeed.y * 6.2831;
    p.y += sin(p.x * 0.075 + a) * 1.9 + cos(p.z * 0.09 + b) * 1.1;
    p.z += sin(p.x * 0.045 + aSeed.z * 6.2831) * 2.2;

    // The cursor pushes particles aside in the horizontal plane only, so the
    // field opens around the pointer instead of exploding.
    vec3 away = vec3(p.x - uMouse.x, 0.0, p.z - uMouse.z);
    float mouseDist = length(away);
    float influence = smoothstep(11.0, 0.0, mouseDist) * uMouseStrength;
    p += normalize(away + vec3(0.0001)) * influence * 3.4;

    float glow = influence * 0.55;

    // One expanding shell when an invoice is composed.
    if (uPulseAge > 0.0 && uPulseAge < ${PULSE_LIFE.toFixed(1)}) {
      vec3 fromOrigin = p - uPulseOrigin;
      float dist = length(fromOrigin);
      float band = dist - uPulseAge * 30.0;
      float ring = exp(-band * band / 26.0) * (1.0 - uPulseAge / ${PULSE_LIFE.toFixed(1)});
      p += normalize(fromOrigin + vec3(0.0001)) * ring * 4.5;
      glow += ring;
    }

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Colour runs along the drift, so the field reads as a gradient in motion.
    vTone = clamp((p.x + ${(SPAN_X / 2).toFixed(1)}) / ${SPAN_X.toFixed(1)}, 0.0, 1.0);
    vGlow = glow;
    vTint = smoothstep(0.12, 0.85, aSeed.z);
    vSpark = 0.75 + smoothstep(0.82, 1.0, aSeed.x) * 1.6;

    // Distance haze, replacing the old scene's fog: the far edge of the field
    // dissolves instead of ending in a bright wall of points.
    float depth = -mvPosition.z;
    // Thin the field out across the left of the frame, where the headline
    // sits. Type gets clean ground; the field gathers on the open right.
    float side = smoothstep(-14.0, 6.0, p.x);
    vFade = smoothstep(58.0, 16.0, depth) * mix(0.12, 1.0, side);

    // Clamped, or a particle drifting near the camera becomes a 60px blob.
    gl_PointSize = clamp(aScale * uPixelRatio * (150.0 / max(depth, 1.0)), 1.0, 13.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorBase;
  uniform float uOpacity;

  varying float vTone;
  varying float vGlow;
  varying float vFade;
  varying float vTint;
  varying float vSpark;

  void main() {
    // Soft round point, drawn from the fragment's distance to the sprite
    // centre — no texture to load.
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, d);

    float alpha = falloff * uOpacity * vFade * vSpark * (0.5 + vGlow);
    if (alpha < 0.01) discard;

    // Most points are near-neutral; only the tinted minority carries brand
    // colour, so overlapping particles build light instead of solid orange.
    vec3 accent = mix(uColorA, uColorB, vTone);
    vec3 color = mix(uColorBase, accent, vTint) + vGlow * 1.1;
    gl_FragColor = vec4(color, alpha);
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
    const pixelRatio = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
    camera.position.set(0, 3.2, 26);
    camera.lookAt(0, 0, -4);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const scales = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // Squaring the vertical spread keeps the field a band around the horizon
      // rather than static filling the frame.
      const v = Math.pow(Math.random(), 1.15) * (Math.random() < 0.5 ? -1 : 1);
      positions[i * 3] = (Math.random() - 0.5) * SPAN_X;
      positions[i * 3 + 1] = v * (SPAN_Y / 2);
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPAN_Z - 6;
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
      speeds[i] = 0.55 + Math.random() * 1.5;
      scales[i] = 0.7 + Math.random() * 1.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uMouse: { value: new THREE.Vector3(0, 0, -999) },
      uMouseStrength: { value: 0 },
      uPulseAge: { value: -1 },
      uPulseOrigin: { value: new THREE.Vector3() },
      uColorA: { value: new THREE.Color(0xf14a94) },
      uColorB: { value: new THREE.Color(0xf39a3f) },
      uColorBase: { value: new THREE.Color(0x7c6f8c) },
      uOpacity: { value: 0.8 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let scroll = 0;
    const onScroll = () => {
      scroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Pointer mapped onto the field. The strength eases in and out so the field
    // does not snap open the moment the cursor enters the hero.
    let mouseTargetStrength = 0;
    const onPointerMove = (event: PointerEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      uniforms.uMouse.value.set(nx * SPAN_X * 0.55, 0, ny * SPAN_Z * 0.5 - 4);
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
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
      uniforms.uMouseStrength.value +=
        (mouseTargetStrength - uniforms.uMouseStrength.value) * 0.06;

      const age = t - pulseStart;
      uniforms.uPulseAge.value = age >= 0 && age < PULSE_LIFE ? age : -1;

      // Scrolling drifts the camera rather than the field, so leaving the hero
      // reads as moving past the field instead of the field collapsing.
      const depth = Math.min(scroll / (window.innerHeight || 1), 1.5);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3.2 + depth * 5.5, 0.05);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 26 - depth * 6, 0.05);
      camera.lookAt(0, 0, -4);

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
      uniforms.uPulseOrigin.value.set(
        ((detail?.x ?? 0.75) - 0.5) * SPAN_X * 0.55,
        0,
        ((detail?.y ?? 0.45) - 0.5) * SPAN_Z * 0.5 - 4
      );
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener(HERO_PULSE, onPulse);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (canvas.parentNode === el) el.removeChild(canvas);
    };
  }, []);

  return <div ref={ref} className="neon-landscape" aria-hidden />;
}
