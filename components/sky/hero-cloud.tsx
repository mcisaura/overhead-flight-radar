"use client";

import { useEffect, useRef } from "react";
import { MousePointer2 } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
let cloudScene: Promise<THREE.Group> | null = null;

type InteractiveCloud = {
  group: THREE.Group;
  x: number; y: number; tilt: number; phase: number;
  halfWidth: number; halfHeight: number;
  dragX: number; dragY: number;
  turnX: number; turnY: number; turnZ: number;
};

function loadCloud() {
  cloudScene ??= loader.loadAsync("/models/low_poly_cloud.glb").then((gltf) => gltf.scene).catch((error) => {
    cloudScene = null;
    throw error;
  });
  return cloudScene;
}

export default function HeroCloud() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    root.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 2.8, -2.8, 0.1, 100);
    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x678da4, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-3, 6, 9);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9ecbe1, 0.7);
    rim.position.set(5, -2, -4);
    scene.add(rim);

    let alive = true;
    let visible = true;
    let frame = 0;
    let lastFrame = 0;
    let elapsedSeconds = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const movingClouds: InteractiveCloud[] = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const originalCursor = document.body.style.cursor;
    let gesture: {
      cloud: InteractiveCloud;
      pointerId: number;
      mode: "move" | "rotate";
      startX: number; startY: number;
      dragX: number; dragY: number;
      turnX: number; turnY: number; turnZ: number;
    } | null = null;
    const materials: THREE.Material[] = [];
    const render = () => { if (alive && visible && !document.hidden) renderer.render(scene, camera); };
    const hasReturnMotion = () => movingClouds.some((cloud) =>
      Math.abs(cloud.dragX) >= .0005 || Math.abs(cloud.dragY) >= .0005
      || Math.abs(cloud.turnX) >= .0005 || Math.abs(cloud.turnY) >= .0005 || Math.abs(cloud.turnZ) >= .0005);
    const positionClouds = (time: number, elapsedMs = 0) => {
      movingClouds.forEach((cloud) => {
        if (gesture?.cloud !== cloud && elapsedMs > 0) {
          const settle = 1 - Math.exp(-elapsedMs / 240);
          cloud.dragX *= 1 - settle;
          cloud.dragY *= 1 - settle;
          cloud.turnX *= 1 - settle;
          cloud.turnY *= 1 - settle;
          cloud.turnZ *= 1 - settle;
          if (Math.abs(cloud.dragX) < .0005) cloud.dragX = 0;
          if (Math.abs(cloud.dragY) < .0005) cloud.dragY = 0;
          if (Math.abs(cloud.turnX) < .0005) cloud.turnX = 0;
          if (Math.abs(cloud.turnY) < .0005) cloud.turnY = 0;
          if (Math.abs(cloud.turnZ) < .0005) cloud.turnZ = 0;
        }
        cloud.group.position.x = cloud.x + Math.sin(time * .33 + cloud.phase) * .12 + cloud.dragX;
        cloud.group.position.y = cloud.y + Math.sin(time * .52 + cloud.phase * 1.4) * .09 + cloud.dragY;
        cloud.group.rotation.set(-.08 + cloud.turnX, -.08 + cloud.turnY, cloud.tilt + Math.sin(time * .28 + cloud.phase) * .012 + cloud.turnZ);
      });
    };
    const animate = (time: number) => {
      frame = 0;
      if (!alive || !visible || document.hidden || reducedMotion.matches) {
        lastFrame = 0;
        return;
      }
      // Idle clouds can render at a lower power-friendly cadence. Pointer
      // interaction and the spring-back need every animation frame so the
      // return does not visibly step between positions.
      const interactiveMotion = Boolean(gesture) || hasReturnMotion();
      if (lastFrame === 0 || interactiveMotion || time - lastFrame >= 40) {
        const elapsedMs = lastFrame === 0 ? 0 : Math.min(time - lastFrame, 100);
        elapsedSeconds += elapsedMs / 1000;
        lastFrame = time;
        positionClouds(elapsedSeconds, elapsedMs);
        render();
        if (!gesture && movingClouds.every((cloud) =>
          Math.abs(cloud.dragX) < .01 && Math.abs(cloud.dragY) < .01
          && Math.abs(cloud.turnX) < .005 && Math.abs(cloud.turnY) < .005 && Math.abs(cloud.turnZ) < .005)) {
          root.classList.remove("is-dragging");
        }
      }
      frame = window.requestAnimationFrame(animate);
    };
    const syncAnimation = () => {
      if (!visible || document.hidden || reducedMotion.matches || movingClouds.length === 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
        if (reducedMotion.matches) positionClouds(0);
        render();
      } else if (!frame) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      const stageBounds = root.closest(".sky-stage")?.getBoundingClientRect();
      const stageWidth = stageBounds?.width ?? width;
      const stageHeight = stageBounds?.height ?? height;
      const viewportWidth = window.innerWidth;
      const mobile = window.matchMedia("(max-width: 520px)").matches;
      const narrow = window.matchMedia("(max-width: 760px)").matches;
      const previousHeight = mobile ? 190 : stageHeight * (narrow ? .5 : .77);
      const previousTop = mobile ? stageHeight - 10 - previousHeight : stageHeight * (narrow ? .39 : .08);
      const halfHeight = 2.8 * height / previousHeight;
      const halfWidth = halfHeight * width / height;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      // The canvas fills the hero in both directions. Keep the resting cloud
      // composition at its original size and position as the camera expands.
      const previousWidth = mobile
        ? viewportWidth * 1.02
        : narrow
          ? viewportWidth * .88
          : Math.min(viewportWidth * .68, 980);
      const previousRight = mobile
        ? -stageWidth * .05
        : narrow
          ? -stageWidth * .22
          : 0;
      const previousCenter = stageWidth - previousRight - previousWidth / 2;
      const worldUnitsPerPixel = halfHeight * 2 / height;
      const cameraCenterX = (width / 2 - previousCenter) * worldUnitsPerPixel;
      const cameraCenterY = (previousTop + previousHeight / 2 - height / 2) * worldUnitsPerPixel;
      camera.position.set(cameraCenterX, cameraCenterY, 15);
      camera.lookAt(cameraCenterX, cameraCenterY, 0);
      camera.updateProjectionMatrix();
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    }, { rootMargin: "100px" });
    visibilityObserver.observe(root);
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", syncAnimation);
    resize();

    const cloudAt = (clientX: number, clientY: number) => {
      if (movingClouds.length === 0) return null;
      const bounds = root.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return null;
      const pass = root.closest(".sky-stage")?.querySelector(":scope > .boarding-pass");
      if (pass) {
        const passBounds = pass.getBoundingClientRect();
        if (clientX >= passBounds.left && clientX <= passBounds.right && clientY >= passBounds.top && clientY <= passBounds.bottom) return null;
      }
      pointer.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(movingClouds.map(({ group }) => group), true)[0];
      if (!hit) return null;
      let object: THREE.Object3D | null = hit.object;
      while (object && !movingClouds.some(({ group }) => group === object)) object = object.parent;
      return movingClouds.find(({ group }) => group === object) ?? null;
    };
    const pointerDown = (event: PointerEvent) => {
      if (gesture || (event.button !== 0 && event.button !== 2)) return;
      if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea")) return;
      const cloud = cloudAt(event.clientX, event.clientY);
      if (!cloud) return;
      event.preventDefault();
      gesture = {
        cloud, pointerId: event.pointerId,
        mode: event.shiftKey || event.button === 2 ? "rotate" : "move",
        startX: event.clientX, startY: event.clientY,
        dragX: cloud.dragX, dragY: cloud.dragY,
        turnX: cloud.turnX, turnY: cloud.turnY, turnZ: cloud.turnZ,
      };
      root.classList.add("is-dragging");
      document.body.style.cursor = "grabbing";
    };
    const pointerMove = (event: PointerEvent) => {
      const current = gesture;
      if (!current || current.pointerId !== event.pointerId) {
        if (event.pointerType === "mouse" && !current) {
          const overControl = event.target instanceof Element && Boolean(event.target.closest("button, a, input, select, textarea"));
          document.body.style.cursor = !overControl && cloudAt(event.clientX, event.clientY) ? "grab" : originalCursor;
        }
        return;
      }
      event.preventDefault();
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      if (current.mode === "rotate") {
        current.cloud.turnX = THREE.MathUtils.clamp(current.turnX + dy * .004, -.45, .45);
        current.cloud.turnY = THREE.MathUtils.clamp(current.turnY + dx * .004, -.55, .55);
        current.cloud.turnZ = THREE.MathUtils.clamp(current.turnZ - dx * .0012, -.2, .2);
      } else {
        const bounds = root.getBoundingClientRect();
        const idleX = current.cloud.x + Math.sin(elapsedSeconds * .33 + current.cloud.phase) * .12;
        const idleY = current.cloud.y + Math.sin(elapsedSeconds * .52 + current.cloud.phase * 1.4) * .09;
        const minX = camera.position.x + camera.left + current.cloud.halfWidth;
        const maxX = camera.position.x + camera.right - current.cloud.halfWidth;
        const minY = camera.position.y + camera.bottom + current.cloud.halfHeight;
        const maxY = camera.position.y + camera.top - current.cloud.halfHeight;
        current.cloud.dragX = THREE.MathUtils.clamp(current.dragX + dx / bounds.width * (camera.right - camera.left), minX - idleX, maxX - idleX);
        current.cloud.dragY = THREE.MathUtils.clamp(current.dragY - dy / bounds.height * (camera.top - camera.bottom), minY - idleY, maxY - idleY);
        current.cloud.turnZ = THREE.MathUtils.clamp(current.turnZ - dx * .0006, -.12, .12);
      }
      positionClouds(reducedMotion.matches ? 0 : elapsedSeconds);
      render();
    };
    const releaseCloud = () => {
      const current = gesture;
      if (!current) return;
      gesture = null;
      document.body.style.cursor = originalCursor;
      if (reducedMotion.matches) {
        current.cloud.dragX = current.cloud.dragY = 0;
        current.cloud.turnX = current.cloud.turnY = current.cloud.turnZ = 0;
        positionClouds(0);
        render();
        root.classList.remove("is-dragging");
      } else syncAnimation();
    };
    const pointerUp = (event: PointerEvent) => {
      if (gesture?.pointerId === event.pointerId) releaseCloud();
    };
    const contextMenu = (event: MouseEvent) => {
      if (gesture || cloudAt(event.clientX, event.clientY)) event.preventDefault();
    };
    window.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove, { passive: false });
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("blur", releaseCloud);
    window.addEventListener("contextmenu", contextMenu);

    void loadCloud().then((template) => {
      if (!alive) return;
      const bounds = new THREE.Box3().setFromObject(template);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const normalize = 1 / Math.max(size.x, size.y, size.z);
      const clouds = [
        { x: 0.8, y: 0.25, z: 0, size: 5.1, color: 0xf9fcff, tilt: -0.05 },
        { x: -2.35, y: 1.55, z: -1, size: 2.35, color: 0xecf5fb, tilt: 0.08 },
        { x: 2.7, y: -1.5, z: -0.7, size: 2.65, color: 0xe7f3fb, tilt: 0.06 },
      ];
      clouds.forEach(({ x, y, z, size: cloudSize, color, tilt }, index) => {
        const model = template.clone(true);
        model.scale.setScalar(normalize);
        model.position.copy(center).multiplyScalar(-normalize);
        const material = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true });
        materials.push(material);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) child.material = material;
        });
        const cloud = new THREE.Group();
        cloud.position.set(x, y, z);
        cloud.scale.setScalar(cloudSize);
        cloud.rotation.set(-0.08, -0.08, tilt);
        cloud.add(model);
        scene.add(cloud);
        const cloudBounds = new THREE.Box3().setFromObject(cloud).getSize(new THREE.Vector3());
        movingClouds.push({ group: cloud, x, y, tilt, phase: index * 2.1, halfWidth: cloudBounds.x / 2 + .1, halfHeight: cloudBounds.y / 2 + .1, dragX: 0, dragY: 0, turnX: 0, turnY: 0, turnZ: 0 });
      });
      resize();
      root.classList.add("is-ready");
      syncAnimation();
    }).catch(() => {});

    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      reducedMotion.removeEventListener("change", syncAnimation);
      document.body.style.cursor = originalCursor;
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("blur", releaseCloud);
      window.removeEventListener("contextmenu", contextMenu);
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="hero-cloud" ref={rootRef} role="img" aria-label="Interactive 3D clouds. Left-click drag to move; right-click drag to rotate.">
    <span className="aircraft-model-caption">
      <MousePointer2 size={17} strokeWidth={2.2} aria-hidden="true" />
      <span><strong>3D cloud illustration</strong><small className="hint-mouse">Left-click drag to move · Right-click drag to rotate</small><small className="hint-touch">Drag to move</small></span>
    </span>
  </div>;
}
