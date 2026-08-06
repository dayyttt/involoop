"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function NeonLandscape() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    el.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(0x0c080e);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c080e, 0.055);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 0, -2);

    const SIZE = 44;
    const SEG = 110;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);

    const pink = new THREE.Color(0xf14a94);
    const orange = new THREE.Color(0xf39a3f);
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

    const material = new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: true });
    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);

    let scroll = 0;
    const onScroll = () => {
      scroll = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

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
    const clock = new THREE.Clock();
    const tick = () => {
      const t = clock.getElapsedTime();
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const y =
          Math.sin(x * 0.35 + t * 0.6) * Math.cos(z * 0.4 + t * 0.5) * 1.1 +
          Math.sin((x + z) * 0.25 + t * 0.4) * 0.55;
        p.setY(i, y);
      }
      p.needsUpdate = true;

      const depth = Math.min(scroll / (window.innerHeight || 1), 1.5);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, -depth * 0.35, 0.05);
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, -depth * 1.6, 0.05);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      geo.dispose();
      material.dispose();
      renderer.dispose();
      el.removeChild(canvas);
    };
  }, []);

  return <div ref={ref} className="neon-landscape" aria-hidden />;
}
