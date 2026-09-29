"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import * as THREE from "three";
import type { AircraftVisual } from "../lib/aircraft-visual";
import { loadAircraftScene } from "./aircraft-assets";

export default function AircraftModel({ progress = 50, live = false, visual = "airliner", entranceRun, onReady }: { progress?: number | null; live?: boolean; visual?: AircraftVisual; entranceRun?: number; onReady?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress ?? 50);
  const updateProgressRef = useRef<(value: number) => void>(() => {});
  const resetProgressRef = useRef<() => void>(() => {});
  const onReadyRef = useRef(onReady);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const lastEntranceRun = useRef(entranceRun);

  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    progressRef.current = progress ?? 50;
    updateProgressRef.current(progressRef.current);
  }, [progress]);

  useEffect(() => {
    if (entranceRun === undefined || entranceRun === lastEntranceRun.current) return;
    lastEntranceRun.current = entranceRun;
    const root = rootRef.current;
    if (root && status === "ready" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("is-ready");
    }
    resetProgressRef.current();
    if (status !== "loading") onReadyRef.current?.();
    if (!root || status !== "ready" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let nextFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(() => root.classList.add("is-ready"));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(nextFrame);
    };
  }, [entranceRun, status]);

  useEffect(() => {
    const container = containerRef.current;
    const root = rootRef.current;
    if (!container || !root) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      const failureNotice = window.setTimeout(() => {
        setStatus("unavailable");
        onReadyRef.current?.();
      }, 0);
      return () => window.clearTimeout(failureNotice);
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
    let mainRotor: THREE.Object3D | undefined;
    let tailRotor: THREE.Object3D | undefined;
    let alive = true;
    let baseX = 0;
    let baseY = 0;
    let offsetX = 0;
    let targetX = 0;
    let dragX = 0;
    let dragY = 0;
    let dragTargetX = 0;
    let dragTargetY = 0;
    let turnX = 0;
    let turnY = 0;
    let turnZ = 0;
    let turnTargetX = 0;
    let turnTargetY = 0;
    let turnTargetZ = 0;
    let gesture: {
      pointerId: number;
      mode: "move" | "rotate";
      startX: number;
      startY: number;
      dragX: number;
      dragY: number;
      turnX: number;
      turnY: number;
      turnZ: number;
    } | null = null;
    let frame = 0;
    let previousFrame = 0;
    let inViewport = true;
    let startCenter = .04;
    let endCenter = 1.3;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const originalCursor = document.body.style.cursor;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const canRender = () => inViewport && !document.hidden;
    const render = () => { if (canRender()) renderer.render(scene, camera); };
    const drawAircraft = () => {
      if (!model) return;
      model.position.set(baseX + offsetX + dragX, baseY + dragY, model.position.z);
      model.rotation.set(turnX, turnY, turnZ);
      positionSlipstream();
      render();
    };
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
      const point = new THREE.Vector3(-1.6 + offsetX + dragX, -.6 + dragY, 0).project(camera);
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
      if (!canRender()) {
        offsetX = targetX;
        return;
      }
      if (immediate) {
        offsetX = targetX;
        drawAircraft();
        return;
      }
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const animate = (time: number) => {
      frame = 0;
      if (!alive || !model) return;
      if (!canRender()) {
        offsetX = targetX;
        previousFrame = 0;
        return;
      }
      const elapsed = previousFrame ? Math.min(time - previousFrame, 100) : 16;
      previousFrame = time;
      if (visual === "helicopter" && !reducedMotion.matches) {
        if (mainRotor) mainRotor.rotation.y += elapsed * .02;
        if (tailRotor) tailRotor.rotation.x += elapsed * .045;
      }
      offsetX += (targetX - offsetX) * (1 - Math.exp(-elapsed / (live ? 220 : 65)));
      if (!gesture) {
        const settle = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 250);
        dragX += (dragTargetX - dragX) * settle;
        dragY += (dragTargetY - dragY) * settle;
        turnX += (turnTargetX - turnX) * settle;
        turnY += (turnTargetY - turnY) * settle;
        turnZ += (turnTargetZ - turnZ) * settle;
      }
      drawAircraft();
      if (Math.abs(targetX - offsetX) > .005 || Math.abs(dragX - dragTargetX) > .005
        || Math.abs(dragY - dragTargetY) > .005 || Math.abs(turnX - turnTargetX) > .002
        || Math.abs(turnY - turnTargetY) > .002 || Math.abs(turnZ - turnTargetZ) > .002
        || (visual === "helicopter" && !reducedMotion.matches)) {
        frame = requestAnimationFrame(animate);
      }
      else previousFrame = 0;
    };
    updateProgressRef.current = () => place(reducedMotion.matches);
    resetProgressRef.current = () => place(true);

    const syncVisibility = () => {
      if (!canRender()) {
        cancelAnimationFrame(frame);
        frame = 0;
        previousFrame = 0;
        return;
      }
      previousFrame = 0;
      place(true);
      if (model && visual === "helicopter" && !reducedMotion.matches && !frame) frame = requestAnimationFrame(animate);
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      syncVisibility();
    }, { rootMargin: "100px" });
    visibilityObserver.observe(root);
    document.addEventListener("visibilitychange", syncVisibility);

    const aircraftAt = (clientX: number, clientY: number) => {
      if (!model) return false;
      const bounds = container.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return false;
      const pass = container.closest(".sky-stage")?.querySelector(":scope > .boarding-pass");
      if (pass && window.matchMedia("(min-width: 851px)").matches
        && clientX < pass.getBoundingClientRect().right) return false;
      pointer.set(((clientX - bounds.left) / bounds.width) * 2 - 1, -((clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(model, true).length > 0;
    };
    const pointerDown = (event: PointerEvent) => {
      if (gesture || !aircraftAt(event.clientX, event.clientY)) return;
      if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea")) return;
      event.preventDefault();
      gesture = {
        pointerId: event.pointerId,
        mode: event.shiftKey || event.button === 2 ? "rotate" : "move",
        startX: event.clientX,
        startY: event.clientY,
        dragX,
        dragY,
        turnX,
        turnY,
        turnZ,
      };
      document.body.style.cursor = "grabbing";
    };
    const pointerMove = (event: PointerEvent) => {
      if (!gesture || gesture.pointerId !== event.pointerId) {
        if (event.pointerType === "mouse" && !gesture) {
          const overControl = event.target instanceof Element && !!event.target.closest("button, a, input, select, textarea");
          document.body.style.cursor = !overControl && aircraftAt(event.clientX, event.clientY) ? "grab" : originalCursor;
        }
        return;
      }
      event.preventDefault();
      const bounds = container.getBoundingClientRect();
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (gesture.mode === "rotate") {
        turnX = turnTargetX = THREE.MathUtils.clamp(gesture.turnX + dy * .004, -.3, .3);
        turnY = turnTargetY = THREE.MathUtils.clamp(gesture.turnY + dx * .004, -.4, .4);
        turnZ = turnTargetZ = THREE.MathUtils.clamp(gesture.turnZ - dx * .0015, -.15, .15);
      } else {
        const verticalSpan = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length();
        dragX = dragTargetX = gesture.dragX - dx / bounds.width * verticalSpan * camera.aspect;
        dragY = dragTargetY = gesture.dragY - dy / bounds.height * verticalSpan;
        turnZ = turnTargetZ = THREE.MathUtils.clamp(-dx * .0008, -.12, .12);
      }
      drawAircraft();
    };
    const releaseAircraft = () => {
      gesture = null;
      dragTargetX = dragTargetY = 0;
      turnTargetX = turnTargetY = turnTargetZ = 0;
      document.body.style.cursor = originalCursor;
      if (!frame) frame = requestAnimationFrame(animate);
    };
    const pointerUp = (event: PointerEvent) => {
      if (gesture?.pointerId === event.pointerId) releaseAircraft();
    };
    const windowBlur = () => { if (gesture) releaseAircraft(); };
    const contextMenu = (event: MouseEvent) => {
      if (aircraftAt(event.clientX, event.clientY)) event.preventDefault();
    };
    window.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove, { passive: false });
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("blur", windowBlur);
    window.addEventListener("contextmenu", contextMenu);

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

    void loadAircraftScene(visual).then(
      (template) => {
        if (!alive) return;
        // The cached GLB owns its geometry, materials and textures. Each mounted
        // aircraft gets its own transforms and rotor state without parsing again.
        const loaded = template.clone(true);
        const bounds = new THREE.Box3().setFromObject(loaded);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = (visual === "airliner" ? 8.8 : 8.8 * .8) / Math.max(size.x, size.y, size.z);
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
        const oriented = new THREE.Group();
        oriented.rotation.y = visual === "airliner" ? 0 : -Math.PI / 2;
        oriented.add(loaded);
        model = new THREE.Group();
        model.add(oriented);
        baseX = model.position.x;
        baseY = model.position.y;
        if (visual === "helicopter") {
          mainRotor = loaded.getObjectByName("blades_0");
          tailRotor = loaded.getObjectByName("tail_rotor_1");
        }
        scene.add(model);
        measureFlightPath();
        place(true);
        if (canRender() && visual === "helicopter" && !reducedMotion.matches && !frame) frame = requestAnimationFrame(animate);
        setStatus("ready");
        onReadyRef.current?.();
      },
      () => {
        if (!alive) return;
        setStatus("unavailable");
        onReadyRef.current?.();
      },
    );

    return () => {
      alive = false;
      updateProgressRef.current = () => {};
      resetProgressRef.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      document.body.style.cursor = originalCursor;
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("blur", windowBlur);
      window.removeEventListener("contextmenu", contextMenu);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [live, visual]);

  return <div className={`aircraft-model ${status === "ready" ? "is-ready" : ""}`} ref={rootRef} role="img" aria-label={`3D illustration of ${visual === "helicopter" ? "a helicopter" : visual === "private" ? "a small aircraft" : "a commercial aircraft"} flying across the sky`}>
    <div className="aircraft-slipstream" aria-hidden="true" />
    <div className="aircraft-model-canvas" ref={containerRef} />
    {status === "unavailable" && <span className="aircraft-model-status">3D aircraft unavailable</span>}
    {status === "ready" && <span className="aircraft-model-caption">
      <MousePointer2 size={17} strokeWidth={2.2} aria-hidden="true" />
      <span><strong>3D aircraft illustration</strong><small className="hint-mouse">Left-click drag to move · Right-click drag to rotate</small><small className="hint-touch">Drag to move</small></span>
    </span>}
  </div>;
}
