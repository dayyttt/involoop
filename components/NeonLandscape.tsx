"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HERO_PULSE, type HeroPulseDetail } from "@/lib/hero-pulse";

// Decorative WebGL backdrop for the hero.
//
// It opts itself out where it would cost more than it gives: phones (small
// screens run the whole page on one thermal budget) and readers who asked for
// reduced motion. When it does run it pauses as soon as the hero leaves the
// viewport, so scrolling the rest of the page costs nothing.
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
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the gradient shade underneath is a fine fallback.
    }
    el.appendChild(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x0c080e);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c080e, 0.026);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 9.5, 15);
    camera.lookAt(0, 0, -3);

    const SIZE = 40;
    const SEG = 96; // 9.4k vertices instead of 19.9k: same look, half the CPU.
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);

    const pink = new THREE.Color(0xff2f7a);
    const orange = new THREE.Color(0xff8a2b);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getX(i) + SIZE / 2) / SIZE;
      const c = pink.clone().lerp(orange, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Cache the flat grid once; the wave only needs x/z, which never change.
    const baseX = new Float32Array(pos.count);
    const baseZ = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      baseX[i] = pos.getX(i);
      baseZ[i] = pos.getZ(i);
    }

    const material = new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: true });
    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);

    let scroll = 0;
    const onScroll = () => {
      scroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // ---- Ripple ----
    // Fired when the demo card finishes composing an invoice. The backdrop
    // stops being wallpaper for a moment and answers the thing that just
    // happened: a wave leaves the card and crosses the mesh once.
    const RIPPLE_LIFE = 1.6; // seconds
    const RIPPLE_SPEED = 22; // world units per second: crosses the visible mesh (~34 units) within its life
    const RIPPLE_BAND = 2.4; // thickness of the wave front
    const RIPPLE_AMP = 2.2; // just under the resting wave's 2.5, so it lifts the surface without breaking it
    let rippleStart = -Infinity;
    let rippleX = 0;
    let rippleZ = 0;

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
    const clock = new THREE.Clock();

    const tick = () => {
      const t = clock.getElapsedTime();
      const p = geo.attributes.position as THREE.BufferAttribute;
      const array = p.array as Float32Array;
      // Age of the current ripple, if one is still travelling.
      const age = t - rippleStart;
      const rippling = age >= 0 && age < RIPPLE_LIFE;
      const front = age * RIPPLE_SPEED;
      const fade = rippling ? 1 - age / RIPPLE_LIFE : 0;

      for (let i = 0; i < p.count; i++) {
        const x = baseX[i];
        const z = baseZ[i];
        let y =
          Math.sin(x * 0.35 + t * 0.6) * Math.cos(z * 0.4 + t * 0.5) * 1.7 +
          Math.sin((x + z) * 0.25 + t * 0.4) * 0.8;

        if (rippling) {
          // One gaussian ring expanding from the card, fading as it goes.
          const dx = x - rippleX;
          const dz = z - rippleZ;
          const offset = Math.sqrt(dx * dx + dz * dz) - front;
          const falloff = Math.exp(-(offset * offset) / (2 * RIPPLE_BAND * RIPPLE_BAND));
          y += Math.cos(offset * 0.9) * falloff * fade * RIPPLE_AMP;
        }

        array[i * 3 + 1] = y;
      }
      p.needsUpdate = true;

      const depth = Math.min(scroll / (window.innerHeight || 1), 1.5);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, -depth * 0.35, 0.05);
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, -depth * 1.6, 0.05);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      clock.getDelta();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPulse = (event: Event) => {
      const detail = (event as CustomEvent<HeroPulseDetail>).detail;
      // Viewport fractions → world coordinates on the plane. The camera is
      // fixed, so a linear map is close enough for a decorative wave.
      rippleX = ((detail?.x ?? 0.75) - 0.5) * SIZE * 0.9;
      rippleZ = ((detail?.y ?? 0.45) - 0.5) * SIZE * 0.75;
      rippleStart = clock.getElapsedTime();
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
      window.removeEventListener(HERO_PULSE, onPulse);
      geo.dispose();
      material.dispose();
      renderer.dispose();
      if (canvas.parentNode === el) el.removeChild(canvas);
    };
  }, []);

  return <div ref={ref} className="neon-landscape" aria-hidden />;
}
