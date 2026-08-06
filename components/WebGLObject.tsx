"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function WebGLObject({ variant = "knot" }: { variant?: "knot" | "sphere" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    el.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 3.8);
    camera.lookAt(0, 0, 0);

    const isSphere = variant === "sphere";
    const geo = isSphere
      ? new THREE.IcosahedronGeometry(1.45, 4)
      : new THREE.TorusKnotGeometry(1.05, 0.3, 220, 32);
    geo.center();

    const pink = new THREE.Color(0xff2f7a);
    const orange = new THREE.Color(0xff8a2b);
    const violet = new THREE.Color(0x9d4dff);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      let t = isSphere ? (y + 1.5) / 3 : (pos.getX(i) + 1.6) / 3.2;
      t = Math.max(0, Math.min(1, t));
      const c = pink.clone().lerp(orange, t).lerp(violet, Math.max(0, t - 0.7));
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
      mesh.rotation.y += isSphere ? 0.004 : 0.006;
      mesh.rotation.x = Math.sin(t * 0.25) * 0.12;

      const depth = Math.min(scroll / (window.innerHeight || 1), 1.2);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, depth * 0.5, 0.05);
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, -depth * 0.35, 0.05);
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1 + depth * 0.2, 0.05));

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
  }, [variant]);

  return <div ref={ref} className="webgl-object" aria-hidden />;
}
