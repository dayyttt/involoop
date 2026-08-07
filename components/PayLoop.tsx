"use client";

import { useEffect, useRef, useState } from "react";

// The closing visual: a wallet turning, at the end of the page, where the
// argument finishes — you send an invoice, and money arrives.
//
// The source is a 3D render on a blue gradient, which is the wrong palette and
// the wrong background for this page, so the shader rebuilds both. Blue is
// pulled toward the product's magenta and amber, and the backdrop is dissolved
// into the page's own black by how blue and how flat it is, leaving the wallet
// floating rather than sitting in a rectangle of someone else's brand colour.
//
// Cost was the deciding constraint. The original is 7.5 MB for six seconds —
// more than the rest of the page put together. Re-encoded it is 182 KB, and it
// is only fetched at all on a screen wide enough to show it: phones get the
// 16 KB poster frame and never download the video.

const POSTER = "/wallet-poster.jpg";
const MP4 = "/wallet.mp4";
const WEBM = "/wallet.webm";
const TEX_ASPECT = 900 / 675;

export default function PayLoop() {
  const ref = useRef<HTMLDivElement>(null);
  const [shaded, setShaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 700px)").matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    const canPlayWebm = video.canPlayType("video/webm; codecs=vp9");
    video.src = canPlayWebm ? WEBM : MP4;

    import("three")
      .then((THREE) => {
        if (disposed) return;

        const canvas = document.createElement("canvas");
        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
        } catch {
          return; // poster frame underneath is the fallback
        }

        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        canvas.className = "payloop-canvas";
        el.appendChild(canvas);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.setClearColor(0x000000, 0);

        const uniforms = {
          uTex: { value: texture },
          uAspect: { value: 1 },
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uStrength: { value: 0 },
          uWarm: { value: new THREE.Color(0xf7a13d) },
          uPink: { value: new THREE.Color(0xf14a94) },
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
            uniform vec3 uWarm;
            uniform vec3 uPink;
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

              // A small counter-shift so the object sits behind its own frame
              // rather than moving with it when the panel turns.
              uv += uMouse * uStrength * -0.012;

              vec3 src = texture2D(uTex, clamp(uv, 0.002, 0.998)).rgb;
              float lum = luma(src);

              // How much of this pixel is the blue backdrop rather than the
              // object: blue-dominant and flat.
              float blueness = clamp((src.b - (src.r + src.g) * 0.5) * 2.6, 0.0, 1.0);

              // The object keeps its own neutral body; its blue rim light and
              // the coins are pulled onto the palette instead.
              vec3 body = vec3(lum * 1.06);
              vec3 accent = mix(uPink, uWarm, clamp(lum * 1.5, 0.0, 1.0));
              vec3 color = mix(body, accent, blueness * 0.85);

              // Key on saturation, not on blue-and-bright. The backdrop is a
              // gradient that runs from bright blue to near-black navy, and
              // gating on brightness left the dark half of it opaque — which
              // painted the whole panel a solid magenta slab. The wallet body is
              // very nearly greyscale, so saturation separates the two cleanly.
              float mx = max(max(src.r, src.g), src.b);
              float mn = min(min(src.r, src.g), src.b);
              float sat = (mx - mn) / max(mx, 0.001);
              // Weight the key toward the edges. The coins glow in the same blue
              // as the backdrop, so keying on saturation alone deleted them
              // along with it — and the coins are the part that says "paid".
              // The backdrop surrounds the object; the coins sit inside it.
              vec2 d = abs(vUv - 0.5) * 2.0;
              float edgeBias = mix(0.3, 1.0, smoothstep(0.2, 0.8, max(d.x, d.y)));
              float alpha = 1.0 - smoothstep(0.22, 0.55, sat) * edgeBias;

              float vignette = 1.0 - smoothstep(0.72, 1.0, max(d.x, d.y));
              alpha *= vignette;

              // A brand-coloured sheen that follows the pointer across the body.
              vec2 lightPos = uMouse * 0.5 + 0.5;
              float sheen = smoothstep(0.55, 0.0, distance(vUv, lightPos)) * uStrength;
              color += accent * sheen * 0.30 * alpha;

              if (alpha < 0.01) discard;
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
        let tiltX = 0;
        let tiltY = 0;
        const clock = new THREE.Clock();

        const tick = () => {
          const t = clock.getElapsedTime();
          uniforms.uTime.value = t;
          uniforms.uStrength.value += (targetStrength - uniforms.uStrength.value) * 0.05;

          // Pointer blended with a slow drift, so it keeps moving for a reader.
          const s = uniforms.uStrength.value;
          const wantX = targetX * s + Math.cos(t * 0.24) * 0.55 * (1 - s);
          const wantY = targetY * s + Math.sin(t * 0.19) * 0.4 * (1 - s);
          uniforms.uMouse.value.x += (wantX - uniforms.uMouse.value.x) * 0.05;
          uniforms.uMouse.value.y += (wantY - uniforms.uMouse.value.y) * 0.05;

          tiltX += (uniforms.uMouse.value.y * 7.0 - tiltX) * 0.06;
          tiltY += (uniforms.uMouse.value.x * 9.0 - tiltY) * 0.06;
          el.style.transform = `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

          renderer.render(scene, camera);
          raf = requestAnimationFrame(tick);
        };
        const start = () => {
          if (running) return;
          running = true;
          video.play().catch(() => {});
          raf = requestAnimationFrame(tick);
        };
        const stop = () => {
          if (!running) return;
          running = false;
          video.pause();
          cancelAnimationFrame(raf);
        };

        video.addEventListener("playing", () => {
          if (!disposed) setShaded(true);
        });

        // Nothing decodes while the band is off screen.
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
          video.removeAttribute("src");
          video.load();
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
    <div ref={ref} className={`payloop${shaded ? " payloop-shaded" : ""}`} aria-hidden>
      <img src={POSTER} alt="" className="payloop-poster" loading="lazy" decoding="async" />
    </div>
  );
}
