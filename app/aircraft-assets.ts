import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Group } from "three";
import type { AircraftVisual } from "../lib/aircraft-visual";

const modelFiles: Record<AircraftVisual, string> = {
  airliner: "/models/boeing_737-200_white.glb",
  private: "/models/cessna_310_airplane_-_low_poly.glb",
  helicopter: "/models/helicopter.glb",
};

const loader = new GLTFLoader();
const scenes = new Map<AircraftVisual, Promise<Group>>();
let preloadScheduled = false;

export function loadAircraftScene(visual: AircraftVisual): Promise<Group> {
  const cached = scenes.get(visual);
  if (cached) return cached;

  const pending = loader.loadAsync(modelFiles[visual]).then((gltf) => gltf.scene);
  scenes.set(visual, pending);
  void pending.catch(() => {
    if (scenes.get(visual) === pending) scenes.delete(visual);
  });
  return pending;
}

export function preloadAircraftScenes() {
  if (preloadScheduled) return;
  preloadScheduled = true;
  const visuals: AircraftVisual[] = ["airliner", "private", "helicopter"];
  let index = 0;
  const loadNext = () => {
    const visual = visuals[index++];
    if (!visual) return;
    const start = () => {
      void loadAircraftScene(visual).catch(() => {}).finally(loadNext);
    };
    // Fetch every model before it is selected, while keeping parsing away from
    // the first paint and avoiding a three-model decode burst.
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 1200 });
    else window.setTimeout(start, 200);
  };
  loadNext();
}
