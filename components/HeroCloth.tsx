"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_PULSE, type HeroPulseDetail } from "@/lib/hero-pulse";

// The hero backdrop: sheets of cloth in mid-air, which for an invoicing product
// is the right subject — documents in motion, not embers or glass blobs.
//
// The image itself is the baseline and always renders, so phones, blocked
// scripts and reduced-motion readers all get the picture. On top of it, where
// it is welcome, a shader adds the depth the photograph does not have:
//
//   * Parallax from luminance. The subject is white against a dark ground, so
//     brightness stands in for distance — bright folds sit near, the backdrop
//     sits far. Sampling is displaced per pixel by that depth against the
//     cursor, which is what makes a flat picture behave like a solid one.
//   * A duotone that pulls the source's cool blue-grey onto the product's
//     palette, and darkens it enough for white type to stay legible.
//   * The invoice ring travelling through the cloth.

const SRC = "/hero-cloth.jpg";
const SRC_MOBILE = "/hero-cloth-mobile.jpg";
const TEX_ASPECT = 2200 / 1467;
const PULSE_LIFE = 1.8;

export default function HeroCloth() {
  const ref = useRef<HTMLDivElement>(null);
  const [shaded, setShaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smallScreen = window.matchMedia("(max-width: 900px)").matches;
    if (reducedMotion || smallScreen) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // three.js only loads once we know the layer is actually wanted.
    import("three")
      .then((THREE) => {
        if (disposed) return;

        const canvas = document.createElement("canvas");
        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
        } catch {
          return; // the plain image underneath is already correct
        }

        const texture = new THREE.TextureLoader().load(SRC, () => {
          if (!disposed) setShaded(true);
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        el.appendChild(canvas);
        canvas.className = "hero-cloth-canvas";
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.setClearColor(0x000000, 0);

        const uniforms = {
          uTex: { value: texture },
          uAspect: { value: 1 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uStrength: { value: 0 },
          uTime: { value: 0 },
          uPulseAge: { value: -1 },
          uPulseOrigin: { value: new THREE.Vector2(0.7, 0.5) },
          uShadow: { value: new THREE.Color(0x0e0b11) },
          uMid: { value: new THREE.Color(0x412a41) },
          uHigh: { value: new THREE.Color(0xb07f9c) },
        };

        const material = new THREE.ShaderMaterial({
          uniforms,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = vec4(position.xy, 0.0, 1.0);
            }
          `,
          fragmentShader: `
            precision highp float;
            uniform sampler2D uTex;
            uniform float uAspect;
            uniform vec2 uMouse;
            uniform float uStrength;
            uniform float uTime;
            uniform float uPulseAge;
            uniform vec2 uPulseOrigin;
            uniform vec3 uShadow;
            uniform vec3 uMid;
            uniform vec3 uHigh;
            varying vec2 vUv;

            float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

            void main() {
              // Cover-fit the texture to the canvas, biased right so the folds
              // sit beside the headline rather than behind it.
              vec2 uv = vUv;
              float texAspect = ${TEX_ASPECT.toFixed(4)};
              if (uAspect > texAspect) {
                uv.y = (uv.y - 0.5) * (texAspect / uAspect) + 0.5;
              } else {
                uv.x = (uv.x - 0.5) * (uAspect / texAspect) + 0.5;
              }
              uv.x += 0.10;
              uv.y -= 0.06;

              // Depth from brightness, then displace the sample by it. Near
              // folds travel further than the far backdrop: parallax.
              float depth = luma(texture2D(uTex, uv).rgb);
              vec2 shifted = uv + uMouse * uStrength * (depth - 0.30) * 0.05;

              // A slow breath, so the cloth is never completely still.
              shifted.y += sin(uTime * 0.22 + uv.x * 2.0) * 0.0016;

              float ring = 0.0;
              if (uPulseAge > 0.0 && uPulseAge < ${PULSE_LIFE.toFixed(1)}) {
                vec2 d = vec2((shifted.x - uPulseOrigin.x) * uAspect, shifted.y - uPulseOrigin.y);
                float band = length(d) - uPulseAge * 0.75;
                ring = exp(-band * band / 0.0022) * (1.0 - uPulseAge / ${PULSE_LIFE.toFixed(1)});
                shifted += normalize(d + vec2(0.0001)) * ring * 0.012;
              }

              float lum = luma(texture2D(uTex, clamp(shifted, 0.001, 0.999)).rgb);

              // Duotone: the source is cool blue-grey, the product is not.
              vec3 color = mix(uShadow, uMid, smoothstep(0.08, 0.55, lum));
              color = mix(color, uHigh, smoothstep(0.66, 1.02, lum) * 0.85);
              color += ring * 0.22;

              // Clear of the headline, and dissolved at the edges so the
              // section below meets no seam.
              float alpha = smoothstep(0.28, 0.72, vUv.x) * smoothstep(0.0, 0.16, vUv.y);
              gl_FragColor = vec4(color, alpha);
            }
          `,
        });

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        quad.frustumCulled = false;
        const scene = new THREE.Scene();
        scene.add(quad);
        const camera = new THREE.Camera();

        let targetX = 0;
        let targetY = 0;
        let targetStrength = 0;
        const onPointerMove = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          targetX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
          targetY = 1 - ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2;
          targetStrength = 1;
        };
        const onPointerLeave = () => {
          targetStrength = 0;
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerleave", onPointerLeave);

        const resize = () => {
          const w = el.clientWidth || 1;
          const h = el.clientHeight || 1;
          renderer.setSize(w, h, false);
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
          uniforms.uMouse.value.x += (targetX - uniforms.uMouse.value.x) * 0.05;
          uniforms.uMouse.value.y += (targetY - uniforms.uMouse.value.y) * 0.05;
          uniforms.uStrength.value += (targetStrength - uniforms.uStrength.value) * 0.05;

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
          start();
        };
        window.addEventListener(HERO_PULSE, onPulse);

        const io = new IntersectionObserver(
          ([entry]) => (entry.isIntersecting ? start() : stop()),
          { threshold: 0 }
        );
        io.observe(el);

        cleanup = () => {
          stop();
          io.disconnect();
          ro.disconnect();
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerleave", onPointerLeave);
          window.removeEventListener(HERO_PULSE, onPulse);
          texture.dispose();
          quad.geometry.dispose();
          material.dispose();
          renderer.dispose();
          if (canvas.parentNode === el) el.removeChild(canvas);
        };
      })
      .catch(() => {
        // three failed to load: the image below is the whole backdrop, which is fine
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={ref} className={`hero-cloth${shaded ? " hero-cloth-shaded" : ""}`} aria-hidden>
      <picture>
        <source media="(max-width: 900px)" srcSet={SRC_MOBILE} />
        <img src={SRC} alt="" className="hero-cloth-img" decoding="async" fetchPriority="high" />
      </picture>
    </div>
  );
}
