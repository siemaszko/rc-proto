import { lazy, Suspense, useRef, useState } from "react";
import { BloubRico } from "@/components/BloubRico";
import { RICO_EYES, ricoPath } from "@/lib/rico-shape";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Which Rico the page uses. "bloub" (round 5) is the bloub engine; "blob3d" (round 4) is the
// three.js blob in RicoCanvas + RicoFace. Kept side by side until one is chosen.
export type RicoVersion = "bloub" | "blob3d";
export const RICO_VERSION = "bloub" as RicoVersion;

const RICO_PATH = ricoPath();
const RicoCanvas = lazy(() => import("@/components/RicoCanvas"));

// Static Rico for avatars in the chat and as the launcher's loading fallback.
// `tight` crops to the body, for avatars.
export function RicoFace({ size = 28, tight, className }: { size?: number; tight?: boolean; className?: string }) {
  return (
    <svg viewBox={tight ? "-0.7 -0.62 1.4 1.4" : "-1 -1 2 2"} width={size} height={size} className={className} aria-hidden="true">
      {/* Same geometry as RicoCanvas at rest (body at y -0.08 there, y axis flipped here). */}
      <g transform="translate(0 0.08)">
        <path d={RICO_PATH} fill="#4f46e5" />
        {[-RICO_EYES.x, RICO_EYES.x].map((x) => (
          <rect
            key={x} x={x - RICO_EYES.w / 2} y={-RICO_EYES.y - RICO_EYES.h / 2} width={RICO_EYES.w} height={RICO_EYES.h} rx={RICO_EYES.w / 2} fill="#fff"
            transform={`rotate(${(RICO_EYES.tilt * 180) / Math.PI} ${x} ${-RICO_EYES.y})`}
          />
        ))}
      </g>
    </svg>
  );
}

// Rico as a chat avatar: a still frame, no animation loop.
export function RicoAvatar({ size = 28, className }: { size?: number; className?: string }) {
  if (RICO_VERSION === "blob3d") return <RicoFace size={size} tight className={className} />;
  return <BloubRico size={size} frozenAt={2} expression="attentif" tight className={className} />;
}

// Rico alive: blinking, gaze drifting or on the pointer. Used in the corner and on the chat.
// Rest face is bloub's "attentif" (looks straight out); hover lights it up to "excite".
export function RicoLive({ size, thinking, happy }: { size: number; thinking?: boolean; happy?: boolean }) {
  if (RICO_VERSION === "blob3d") {
    return (
      <Suspense fallback={<RicoFace size={size} />}>
        <RicoCanvas size={size} />
      </Suspense>
    );
  }
  return <BloubRico size={size} follow state={thinking ? "thinking" : "idle"} expression={happy ? "excite" : "attentif"} />;
}

type Corner = "br" | "bl" | "tr" | "tl";
const CORNERS: Corner[] = ["br", "bl", "tr", "tl"];
// Where Rico can sit. Bottom corners clear the prototype dock on a phone; left corners clear
// the sidebar on desktop; top corners clear the phone top bar.
const CORNER_CLASS: Record<Corner, string> = {
  br: "right-1 bottom-20 md:right-3 md:bottom-2",
  bl: "left-1 bottom-20 md:left-[228px] md:bottom-2",
  tr: "right-1 top-12 md:right-3 md:top-2",
  tl: "left-1 top-12 md:left-[228px] md:top-2",
};
const CORNER_KEY = "rico-corner";
const DRAG_START = 6; // px of movement before a press becomes a drag

function savedCorner(): Corner {
  try {
    const c = localStorage.getItem(CORNER_KEY) as Corner | null;
    return c && CORNERS.includes(c) ? c : "br";
  } catch {
    return "br";
  }
}

// Floating launcher: animated Rico in a corner, tooltip on hover, click opens the chat.
// Drag it and the other corners show drop spots; it snaps to the nearest one on release.
export function RicoLauncher({ onOpen }: { onOpen: () => void }) {
  const bloub = RICO_VERSION === "bloub";
  const size = bloub ? 96 : 72; // bloub's body fills ~63% of its box
  const [corner, setCorner] = useState<Corner>(savedCorner);
  const [hover, setHover] = useState(false);
  const [jiggle, setJiggle] = useState(false);
  // While dragging: Rico's box top-left in viewport px, and the corner it would land in.
  const [drag, setDrag] = useState<{ x: number; y: number; target: Corner } | null>(null);
  // After release: glide to the drop spot, then hand back to the corner classes.
  const [landing, setLanding] = useState<{ x: number; y: number; corner: Corner } | null>(null);
  const justDragged = useRef(false);
  const spots = useRef<Partial<Record<Corner, HTMLDivElement | null>>>({});

  const nearest = (cx: number, cy: number): Corner => {
    let best: Corner = corner, bestD = Infinity;
    for (const c of CORNERS) {
      const r = spots.current[c]?.getBoundingClientRect();
      if (!r) continue;
      const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  };

  // Press is heard in the capture phase (the tooltip trigger may stop it bubbling); move and
  // release on window, since a quick flick leaves Rico's box on the very first move.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, dragged: false };
    let last: { x: number; y: number } | null = null;

    const move = (ev: PointerEvent) => {
      if (!p.dragged && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < DRAG_START) return;
      p.dragged = true;
      ev.preventDefault();
      last = { x: ev.clientX - p.dx, y: ev.clientY - p.dy };
      setHover(false);
      setDrag({ ...last, target: nearest(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!p.dragged || !last) return;
      // The click that may follow this release is not a click.
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 0);
      const to = nearest(ev.clientX, ev.clientY);
      const spot = spots.current[to]?.getBoundingClientRect();
      setDrag(null);
      // Already there (no transition would fire): land straight away.
      if (spot && Math.hypot(spot.left - last.x, spot.top - last.y) > 1) setLanding({ x: spot.left, y: spot.top, corner: to });
      else settle(to);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const settle = (to: Corner) => {
    setCorner(to);
    try { localStorage.setItem(CORNER_KEY, to); } catch { /* per-viewer nicety only */ }
    setLanding(null);
  };
  // left and top each end a transition; the second call finds landing already cleared.
  const land = () => { if (landing) settle(landing.corner); };
  const onClick = () => { if (!justDragged.current) onOpen(); };

  const free = drag ?? landing;
  const left = corner === "bl" || corner === "tl";
  return (
    <>
      {/* Drop spots: always mounted so they can be measured. While dragging, the other corners
          show "Drop here"; Rico's own corner shows a plain gray circle where it came from.
          Letting go near it puts Rico back. */}
      {CORNERS.map((c) => (
        <div
          key={c}
          ref={(el) => { spots.current[c] = el; }}
          aria-hidden
          className={cn("pointer-events-none fixed z-40 grid place-items-center", CORNER_CLASS[c], !drag && "invisible")}
          style={{ width: size, height: size }}
        >
          {c === corner ? (
            <span className="size-[62%] rounded-full bg-neutral-200" />
          ) : (
            <span
              className={cn(
                "grid size-[62%] place-items-center rounded-full border-2 border-dashed text-center text-[10px] leading-tight font-medium transition-all duration-150",
                drag?.target === c ? "scale-110 border-indigo-500 bg-indigo-100/80 text-indigo-700" : "border-indigo-300 bg-white/70 text-indigo-400",
              )}
            >
              Drop<br />here
            </span>
          )}
        </div>
      ))}

      <div
        className={cn("fixed", free ? "z-50" : "z-40", !free && CORNER_CLASS[corner], landing && "transition-[left,top] duration-300 ease-out")}
        style={free ? { left: free.x, top: free.y } : undefined}
        onTransitionEnd={(e) => e.target === e.currentTarget && land()}
        onPointerDownCapture={onPointerDown}
      >
        <Tooltip open={hover && !free} onOpenChange={(o) => !o && setHover(false)}>
          <TooltipTrigger
            render={<button onClick={onClick} aria-label="Ask Rico" />}
            onPointerEnter={() => { if (!free) { setHover(true); setJiggle(true); } }}
            onPointerLeave={() => setHover(false)}
            className={cn("group relative grid touch-none place-items-center rounded-full outline-none select-none focus-visible:ring-3 focus-visible:ring-indigo-300", drag ? "cursor-grabbing" : "cursor-grab")}
          >
            <span aria-hidden className={cn("absolute rounded-full bg-neutral-900/15 blur-[3px] transition-all", bloub ? "bottom-3 h-2 w-12" : "bottom-1 h-2 w-10", drag && "bottom-0 w-8 opacity-60")} />
            {/* The three.js blob jiggles itself; bloub gets one small CSS wobble per hover. */}
            <span className={cn(bloub && jiggle ? "rico-jiggle" : "block", drag && "scale-105")} onAnimationEnd={() => setJiggle(false)}>
              <RicoLive size={size} happy={hover || !!drag} />
            </span>
          </TooltipTrigger>
          <TooltipContent side={left ? "right" : "left"} sideOffset={bloub ? -6 : 4}>Ask Rico about your business</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
