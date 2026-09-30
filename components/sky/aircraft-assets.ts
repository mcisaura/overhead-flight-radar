import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Group } from "three";
import type { AircraftVisual } from "../../lib/aircraft-visual";

const modelFiles: Record<AircraftVisual, string> = {
  airliner: "/models/boeing_737-200_white.glb",
  private: "/models/cessna_310_airplane_-_low_poly.glb",
  helicopter: "/models/helicopter.glb",
};

const loader = new GLTFLoader();
const scenes = new Map<AircraftVisual, Promise<Group>>();

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
