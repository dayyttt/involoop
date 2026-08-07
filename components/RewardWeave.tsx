"use client";

import { useEffect, useRef, useState } from "react";

// The reward section's visual: two surfaces locked through each other.
//
// The picture was chosen for its structure, not its looks. It already contains
// exactly two colours, and this section is about exactly two parties — so one
// becomes the freelancer and the other the client, and the shader recolours
// them into the product's palette rather than leaving them blue and gold.
//
// The two sides then take turns glowing, slowly, which is the section's whole
// claim made visible: both sides win, and it keeps going round. A layperson
// reads that before they read the paragraph.
//
// Recolouring is done by axis, not by hue rotation: the blue–amber difference
// in the source separates the two sheets cleanly, and the near-grey background
// falls away to the page's own black by saturation.

const SRC = "/reward-weave.jpg";
const SRC_SMALL = "/reward-weave-sm.jpg";
const TEX_ASPECT = 900 / 1183;

export default function RewardWeave() {
  const ref = useRef<HTMLDivElement>(null);
  const [shaded, setShaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
          return;
        }

        const texture = new THREE.TextureLoader().load(SRC, () => {
          if (!disposed) setShaded(true);
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        canvas.className = "weave-canvas";
        el.appendChild(canvas);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.setClearColor(0x000000, 0);

        const uniforms = {
          uTex: { value: texture },
          uAspect: { value: 1 },
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uStrength: { value: 0 },
          uBase: { value: new THREE.Color(0x120e16) },
          uYou: { value: new THREE.Color(0xf23f9c) },
          uClient: { value: new THREE.Color(0xf7a83a) },
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
            uniform vec3 uBase;
            uniform vec3 uYou;
            uniform vec3 uClient;
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

              vec3 src = texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb;
              float lum = luma(src);

              vec2 shifted = uv + uMouse * uStrength * (lum - 0.4) * 0.022;
              src = texture2D(uTex, clamp(shifted, 0.001, 0.999)).rgb;
              lum = luma(src);

              // +1 where the sheet is blue, -1 where it is amber.
              // Magenta and amber are neighbours on the wheel, so a linear blend
              // turned both sheets into the same maroon. The mix is steepened
              // until each pixel commits to one party: the separation is the
              // whole point of using this picture.
              float side = clamp((src.b - src.r) * 5.0, -1.0, 1.0);
              vec3 party = mix(uClient, uYou, smoothstep(-0.32, 0.32, side));

              // Keep the render's own shading: the folds are the form.
              vec3 color = party * (0.26 + lum * 1.5);

              // The background is near-grey; drop it to the page's black so the
              // sheets float rather than sitting in a box of blue.
              float mx = max(max(src.r, src.g), src.b);
              float mn = min(min(src.r, src.g), src.b);
              float sat = (mx - mn) / max(mx, 0.001);
              color = mix(uBase, color, smoothstep(0.09, 0.26, sat));

              // The two sides take turns: whichever party the phase favours
              // brightens, then hands it back. This is the loop.
              float phase = sin(uTime * 0.5);
              float turn = max(0.0, -side * phase);
              color += party * turn * (0.25 + lum) * 0.4;

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
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          targetStrength = inside ? 1 : 0;
          if (!inside) return;
          targetX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
          targetY = 1 - ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2;
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
      .catch(() => {});

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={ref} className={`weave${shaded ? " weave-shaded" : ""}`}>
      <picture>
        <source media="(max-width: 700px)" srcSet={SRC_SMALL} />
        <img src={SRC} alt="" className="weave-img" loading="lazy" decoding="async" />
      </picture>
    </div>
  );
}
