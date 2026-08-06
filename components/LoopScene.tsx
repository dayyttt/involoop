"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LoopScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    el.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    const geometry = new THREE.TorusKnotGeometry(1.05, 0.3, 240, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4d94,
      roughness: 0.3,
      metalness: 0.05,
      emissive: 0xff4d94,
      emissiveIntensity: 0.35,
    });
    const torus = new THREE.Mesh(geometry, material);
    scene.add(torus);

    const pink = new THREE.Color(0xff4d94);
    const orange = new THREE.Color(0xff9933);

    const light1 = new THREE.PointLight(0xff4d94, 60, 40);
    light1.position.set(4, 3, 4);
    const light2 = new THREE.PointLight(0xff9933, 50, 40);
    light2.position.set(-4, -2, 3);
    const light3 = new THREE.PointLight(0xffffff, 20, 30);
    light3.position.set(0, 0, 6);
    scene.add(light1, light2, light3);

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
      torus.position.set(w >= 900 ? 1.9 : 0, w >= 900 ? 0.1 : -1.1, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const tick = (t: number) => {
      const time = t * 0.001;
      torus.rotation.x += 0.004;
      torus.rotation.y += 0.007;

      const depth = Math.min(scroll / (window.innerHeight || 1), 1.2);
      torus.rotation.z = THREE.MathUtils.lerp(torus.rotation.z, depth * 0.9, 0.06);
      torus.position.y += -scroll * 0.0035 - torus.position.y * 0.06;
      torus.scale.setScalar(1 + Math.min(scroll * 0.001, 0.8));
      material.color.copy(pink).lerp(orange, Math.min(scroll * 0.0012, 1));
      material.emissive.copy(material.color);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      el.removeChild(canvas);
    };
  }, []);

  return <div ref={ref} className="loop-scene" aria-hidden />;
}
