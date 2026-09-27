"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export default function AircraftModel({ progress = 50, live = false }: { progress?: number | null; live?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress ?? 50);
  const updateProgressRef = useRef<(value: number) => void>(() => {});
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    progressRef.current = progress ?? 50;
    updateProgressRef.current(progressRef.current);
  }, [progress]);

  useEffect(() => {
    const container = containerRef.current;
    const root = rootRef.current;
    if (!container || !root) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setStatus("unavailable");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    // The nose is on the model's negative X end. From negative Z it points right on screen.
    camera.position.set(0, 4, -15);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xf5fbff, 0x6e899a, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(-3, 8, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb9e8ff, .8);
    fill.position.set(6, 1, -5);
    scene.add(fill);

    let model: THREE.Object3D | null = null;
    let alive = true;
    let baseX = 0;
    let offsetX = 0;
    let targetX = 0;
    let frame = 0;
    let previousFrame = 0;
    let startCenter = .04;
    let endCenter = 1.3;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const render = () => renderer.render(scene, camera);
    const measureFlightPath = () => {
      if (!model) return;
      const containerBounds = container.getBoundingClientRect();
      const pass = container.closest(".sky-stage")?.querySelector(":scope > .boarding-pass");
      const passRight = pass
        ? (pass.getBoundingClientRect().right - containerBounds.left) / containerBounds.width
        : 0;
      container.style.setProperty("--pass-edge", `${Math.max(0, passRight) * 100}%`);

      // Measure the actual mesh so the nose starts just beyond the pass edge.
      model.position.x = baseX;
      model.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      const point = new THREE.Vector3();
      let left = Infinity;
      let right = -Infinity;
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const positions = child.geometry.attributes.position;
        for (let index = 0; index < positions.count; index++) {
          point.fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld).project(camera);
          left = Math.min(left, (point.x + 1) / 2);
          right = Math.max(right, (point.x + 1) / 2);
        }
      });
      const leftExtent = left - .5;
      const rightExtent = right - .5;
      const desktop = window.matchMedia("(min-width: 851px)").matches;
      const peek = Math.min(.11, Math.max(.07, 90 / containerBounds.width));
      startCenter = desktop ? passRight + peek - rightExtent : .08 - rightExtent;
      endCenter = 1.03 - leftExtent;
      root.style.setProperty("--stream-start", `${desktop ? Math.max(0, passRight) * 100 : 0}%`);
    };
    const positionSlipstream = () => {
      const point = new THREE.Vector3(-1.6 + offsetX, -.6, 0).project(camera);
      root.style.setProperty("--stream-end", `${(point.x + 1) * 50}%`);
      root.style.setProperty("--stream-y", `${(1 - point.y) * 50}%`);
    };
    const positionForProgress = (value: number) => {
      const crossing = Math.max(0, Math.min(100, value));
      const travel = (crossing / 100) ** 2;
      const screenCenter = startCenter + (endCenter - startCenter) * travel;
      const horizontalHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
        * camera.position.length() * camera.aspect;
      return -(screenCenter * 2 - 1) * horizontalHalf;
    };
    const place = (immediate: boolean) => {
      targetX = positionForProgress(progressRef.current);
      if (!model) return;
      if (immediate) {
        offsetX = targetX;
        model.position.x = baseX + offsetX;
        positionSlipstream();
        render();
        return;
      }
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const animate = (time: number) => {
      frame = 0;
      if (!alive || !model) return;
      const elapsed = previousFrame ? Math.min(time - previousFrame, 100) : 16;
      previousFrame = time;
      offsetX += (targetX - offsetX) * (1 - Math.exp(-elapsed / (live ? 220 : 65)));
      model.position.x = baseX + offsetX;
      positionSlipstream();
      render();
      if (Math.abs(targetX - offsetX) > .005) frame = requestAnimationFrame(animate);
      else previousFrame = 0;
    };
    updateProgressRef.current = () => place(reducedMotion.matches);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      measureFlightPath();
      place(true);
      if (!model) render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    new GLTFLoader().load(
      "/models/boeing_737-200_white.glb",
      ({ scene: loaded }) => {
        if (!alive) return;
        const bounds = new THREE.Box3().setFromObject(loaded);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 8.8 / Math.max(size.x, size.y, size.z);
        loaded.position.copy(center).multiplyScalar(-scale);
        loaded.scale.multiplyScalar(scale);
        loaded.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => { material.side = THREE.DoubleSide; });
          }
        });
        model = loaded;
        baseX = loaded.position.x;
        scene.add(loaded);
        measureFlightPath();
        place(true);
        setStatus("ready");
      },
      undefined,
      () => { if (alive) setStatus("unavailable"); },
    );

    return () => {
      alive = false;
      updateProgressRef.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (model) {
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => material.dispose());
          }
        });
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className={`aircraft-model ${status === "ready" ? "is-ready" : ""}`} ref={rootRef} role="img" aria-label="3D illustration of a commercial aircraft flying across the sky">
    <div className="aircraft-slipstream" aria-hidden="true" />
    <div className="aircraft-model-canvas" ref={containerRef} />
    {status === "unavailable" && <span className="aircraft-model-status">3D aircraft unavailable</span>}
    <span className="aircraft-model-caption">3D aircraft illustration</span>
  </div>;
}
