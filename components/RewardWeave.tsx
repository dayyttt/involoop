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
          uLight: { value: new THREE.Vector2(0.5, 0.6) },
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
            uniform vec2 uLight;
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

              vec2 shifted = uv + uMouse * (lum - 0.4) * 0.05;
              src = texture2D(uTex, clamp(shifted, 0.001, 0.999)).rgb;
              lum = luma(src);

              // +1 where the sheet is blue, -1 where it is amber.
              // Magenta and amber are neighbours on the wheel, so a linear blend
              // turned both sheets into the same maroon. The mix is steepened
              // until each pixel commits to one party: the separation is the
              // whole point of using this picture.
              float side = clamp((src.b - src.r) * 5.0, -1.0, 1.0);
              vec3 party = mix(uClient, uYou, smoothstep(-0.32, 0.32, side));

              // A normal map straight out of the picture: the slope of its own
              // brightness is the slope of the surface. Lighting that from the
              // cursor is what makes the sheets read as solid rather than as a
              // flat image being nudged around.
              float e = 0.0038;
              float lx = luma(texture2D(uTex, clamp(shifted + vec2(e, 0.0), 0.001, 0.999)).rgb)
                       - luma(texture2D(uTex, clamp(shifted - vec2(e, 0.0), 0.001, 0.999)).rgb);
              float ly = luma(texture2D(uTex, clamp(shifted + vec2(0.0, e), 0.001, 0.999)).rgb)
                       - luma(texture2D(uTex, clamp(shifted - vec2(0.0, e), 0.001, 0.999)).rgb);
              // 16, not 26: the normal comes from the picture's own brightness, so a steep
              // slope amplifies its compression noise into a crust of false texture.
              vec3 normal = normalize(vec3(-lx * 16.0, -ly * 16.0, 1.0));

              vec3 toLight = normalize(vec3(uLight - vUv, 0.42));
              float diffuse = max(dot(normal, toLight), 0.0);
              vec3 halfway = normalize(toLight + vec3(0.0, 0.0, 1.0));
              float specular = pow(max(dot(normal, halfway), 0.0), 34.0);

              vec3 color = party * (0.20 + lum * 1.25);
              color += party * diffuse * 0.38;
              color += vec3(1.0, 0.92, 0.96) * specular * 0.34;

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
          if (!inside) return; // keep the last position; strength eases it out
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

        let tiltX = 0;
        let tiltY = 0;

        const tick = () => {
          const t = clock.getElapsedTime();
          uniforms.uTime.value = t;
          uniforms.uStrength.value += (targetStrength - uniforms.uStrength.value) * 0.05;

          // Blend the pointer with a slow orbit, so the light keeps moving over
          // the folds for someone who is only reading.
          const s = uniforms.uStrength.value;
          const orbitX = 0.5 + Math.cos(t * 0.28) * 0.42;
          const orbitY = 0.55 + Math.sin(t * 0.21) * 0.34;
          const wantLightX = (targetX * 0.5 + 0.5) * s + orbitX * (1 - s);
          const wantLightY = (targetY * 0.5 + 0.5) * s + orbitY * (1 - s);
          uniforms.uLight.value.x += (wantLightX - uniforms.uLight.value.x) * 0.05;
          uniforms.uLight.value.y += (wantLightY - uniforms.uLight.value.y) * 0.05;

          const wantMx = targetX * s + Math.cos(t * 0.19) * 0.5 * (1 - s);
          const wantMy = targetY * s + Math.sin(t * 0.16) * 0.5 * (1 - s);
          uniforms.uMouse.value.x += (wantMx - uniforms.uMouse.value.x) * 0.04;
          uniforms.uMouse.value.y += (wantMy - uniforms.uMouse.value.y) * 0.04;

          // The panel itself turns in perspective. A flat picture that lights
          // correctly still reads as flat until its own plane moves.
          tiltX += (uniforms.uMouse.value.y * 6.5 - tiltX) * 0.06;
          tiltY += (uniforms.uMouse.value.x * 8.0 - tiltY) * 0.06;
          el.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

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
