"use client";

import { useEffect, useRef, useState } from "react";

// The "why" section's visual: a photograph of the old way — a paper invoice, a
// calculator, a clipboard — with a line of light sweeping across it. Behind the
// line the paper turns into the product's own colours and picks up a fine grid.
// The picture argues the section's point instead of decorating it: this is the
// thing you already do every week, and this is it becoming a link.
//
// Two problems with the source photograph, both solved in the shader rather
// than in an image editor, so the original stays untouched:
//
//   * It is bright, blue-accented stock, and the page is dark. A duotone maps
//     it onto the palette on both sides of the line.
//   * Its own luminance cannot stand in for depth the way the hero's cloth can,
//     because every surface in it is bright. Depth comes mostly from height
//     instead — it is a flat-lay, so the bottom of the frame is nearer.

const SRC = "/paper-invoice.jpg";
const SRC_SMALL = "/paper-invoice-sm.jpg";
const TEX_ASPECT = 1500 / 1125;

export default function PaperScan({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shaded, setShaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 700px)").matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    import("three")
      .then((THREE) => {
        if (disposed) return;

        const canvas = document.createElement("canvas");
        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
        } catch {
          return; // the photograph underneath is already the fallback
        }

        const texture = new THREE.TextureLoader().load(SRC, () => {
          if (!disposed) setShaded(true);
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        canvas.className = "paper-scan-canvas";
        el.appendChild(canvas);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.setClearColor(0x000000, 0);

        const uniforms = {
          uTex: { value: texture },
          uAspect: { value: 1 },
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uStrength: { value: 0 },
          uPaper: { value: new THREE.Color(0xb1a7ba) },
          uPaperDark: { value: new THREE.Color(0x14101a) },
          uInk: { value: new THREE.Color(0x8e3a6d) },
          uHigh: { value: new THREE.Color(0xe4a06a) },
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
            uniform float uTime;
            uniform vec2 uMouse;
            uniform float uStrength;
            uniform vec3 uPaper;
            uniform vec3 uPaperDark;
            uniform vec3 uInk;
            uniform vec3 uHigh;
            varying vec2 vUv;

            float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

            void main() {
              vec2 uv = vUv;
              float texAspect = ${TEX_ASPECT.toFixed(4)};
              if (uAspect > texAspect) {
                uv.y = (uv.y - 0.5) * (texAspect / uAspect) + 0.5;
              } else {
                uv.x = (uv.x - 0.5) * (uAspect / texAspect) + 0.5;
              }

              float lum0 = luma(texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb);

              // A flat-lay has no luminance depth to read, so height carries it:
              // the near edge of a desk shot is the bottom of the frame.
              float depth = mix(1.0 - uv.y, lum0, 0.3);
              vec2 shifted = uv + uMouse * uStrength * (depth - 0.5) * 0.028;
              float lum = luma(texture2D(uTex, clamp(shifted, 0.001, 0.999)).rgb);

              // The scan head travels and wraps; the converted state trails it
              // and decays back to paper, so the loop has no seam to snap over.
              float head = fract(uTime * 0.115);
              float d = vUv.x - head;
              if (d > 0.5) d -= 1.0;
              if (d < -0.5) d += 1.0;
              float edge = smoothstep(0.016, 0.0, abs(d));
              float digital = smoothstep(-0.40, -0.015, d) * step(d, 0.0);

              // Before the line: the old way, cooled down and dimmed to sit on
              // a dark page.
              vec3 paper = mix(uPaperDark, uPaper, smoothstep(0.24, 0.96, lum)) * 0.8;

              // After it: the same pixels in the product's colours, with a fine
              // rule over them.
              vec3 digi = mix(uPaperDark, uInk, smoothstep(0.22, 0.80, lum));
              digi = mix(digi, uHigh, smoothstep(0.80, 1.0, lum) * 0.7);
              vec2 g = abs(fract(vec2(vUv.x * 34.0, vUv.y * 26.0)) - 0.5);
              digi += smoothstep(0.47, 0.5, max(g.x, g.y)) * 0.05;

              vec3 color = mix(paper, digi, digital);
              color += edge * vec3(1.0, 0.62, 0.42) * 0.55;

              gl_FragColor = vec4(color, 1.0);
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
          // Only respond while the pointer is actually over the picture.
          targetStrength =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
              ? 1
              : 0;
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });

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
        const clock = new THREE.Clock();

        const tick = () => {
          uniforms.uTime.value = clock.getElapsedTime();
          uniforms.uMouse.value.x += (targetX - uniforms.uMouse.value.x) * 0.05;
          uniforms.uMouse.value.y += (targetY - uniforms.uMouse.value.y) * 0.05;
          uniforms.uStrength.value += (targetStrength - uniforms.uStrength.value) * 0.05;
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

        // A section this far down the page must not run while nobody is looking.
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
          texture.dispose();
          quad.geometry.dispose();
          material.dispose();
          renderer.dispose();
          if (canvas.parentNode === el) el.removeChild(canvas);
        };
      })
      .catch(() => {
        // three unavailable: the photograph is the whole visual, which is fine
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={ref} className={`paper-scan ${className}${shaded ? " paper-scan-shaded" : ""}`}>
      <picture>
        <source media="(max-width: 700px)" srcSet={SRC_SMALL} />
        <img
          src={SRC}
          alt="A paper invoice, a calculator and a clipboard on a desk"
          className="paper-scan-img"
          loading="lazy"
          decoding="async"
        />
      </picture>
    </div>
  );
}
