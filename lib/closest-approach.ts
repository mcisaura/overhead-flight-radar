export function closestApproachCue(progress: number | null, closestKm: number | null) {
  if (progress == null || closestKm == null || progress < 43) return null;
  const overhead = closestKm <= 1;
  if (progress < 49) return overhead ? "Look up soon" : "Closest approach soon";
  if (progress <= 52) return overhead ? "Passing overhead" : "At closest approach";
  return overhead ? "Just passed overhead" : "Closest approach passed";
}
