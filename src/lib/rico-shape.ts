// Rico's resting outline, shared by the three.js mascot and the SVG avatar.
// A circle, a little wider than tall, with two soft lumps so it reads as a blob.
export const RICO_R = 0.6;
export const RICO_EYES = { x: 0.17, y: 0.04, w: 0.14, h: 0.3, tilt: 0.22 };

export const ricoRadius = (a: number) =>
  RICO_R * (1 + 0.05 * Math.cos(2 * a) + 0.035 * Math.sin(3 * a + 0.6) + 0.02 * Math.cos(5 * a + 1.2));

// SVG path (y down) of the resting outline, centred on 0,0.
export function ricoPath(segments = 72) {
  let d = "";
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2, r = ricoRadius(a);
    d += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(3)},${(-Math.sin(a) * r).toFixed(3)}`;
  }
  return d + "Z";
}
