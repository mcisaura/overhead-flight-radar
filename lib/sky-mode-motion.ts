/** Commit a mode change synchronously; visual effects never gate the new view. */
export function animateSkyModeChange(root: HTMLElement | null, update: () => void, reducedMotion: boolean): () => void {
  if (!root || reducedMotion) {
    update();
    return () => {};
  }

  const ticket = root.querySelector<HTMLElement>(".boarding-pass");
  let layer: HTMLElement | null = null;
  let copy: HTMLElement | null = null;
  if (ticket) {
    const bounds = ticket.getBoundingClientRect();
    const doc = root.ownerDocument;
    layer = doc.createElement("div");
    layer.className = root.querySelector(".app-shell")?.className ?? "";
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;
    Object.assign(layer.style, { position: "fixed", inset: "0", zIndex: "1000", pointerEvents: "none" });
    const stage = doc.createElement("div");
    stage.className = root.querySelector(".sky-stage")?.className ?? "";
    Object.assign(stage.style, { position: "absolute", inset: "0", display: "block", width: "100%", height: "100%", minHeight: "0", padding: "0", margin: "0", background: "none", overflow: "visible" });
    copy = ticket.cloneNode(true) as HTMLElement;
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    copy.querySelectorAll(".boarding-pass-outgoing").forEach((element) => element.remove());
    Object.assign(copy.style, { position: "absolute", left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`, minHeight: "0", margin: "0", transform: "none" });
    stage.appendChild(copy);
    layer.appendChild(stage);
    doc.body.appendChild(layer);
  }

  // Do not await animation promises, frames, tiles, models, or network responses.
  update();

  const animations: Animation[] = [];
  if (copy) animations.push(copy.animate([
    { opacity: 1, transform: "translateY(0)" },
    { opacity: 0, transform: "translateY(-4px)" },
  ], { duration: 140, easing: "ease-out", fill: "both" }));
  root.querySelectorAll<HTMLElement>(".boarding-pass, .sky-dashboard").forEach((element) => {
    animations.push(element.animate([
      { opacity: element.matches(".boarding-pass") ? .35 : .8, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 200, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" }));
  });
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    animations.forEach((animation) => animation.cancel());
    layer?.remove();
  };
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(cleanup);
  return cleanup;
}
