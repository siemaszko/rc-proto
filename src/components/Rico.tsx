import { lazy, Suspense, useState } from "react";
import { BloubRico } from "@/components/BloubRico";
import { RICO_EYES, ricoPath } from "@/lib/rico-shape";
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

// Floating bottom-right launcher: animated Rico, tooltip on hover, click opens the chat.
export function RicoLauncher({ onOpen }: { onOpen: () => void }) {
  const bloub = RICO_VERSION === "bloub";
  const size = bloub ? 96 : 72; // bloub's body fills ~63% of its box
  const [hover, setHover] = useState(false);
  const [jiggle, setJiggle] = useState(false);
  return (
    <div className={bloub ? "fixed right-1 bottom-20 z-40 md:right-3 md:bottom-2" : "fixed right-4 bottom-24 z-40 md:right-6 md:bottom-6"}>
      <Tooltip>
        <TooltipTrigger
          render={<button onClick={onOpen} aria-label="Ask Rico" />}
          onPointerEnter={() => { setHover(true); setJiggle(true); }}
          onPointerLeave={() => setHover(false)}
          className="group relative grid place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-indigo-300"
        >
          <span aria-hidden className={bloub ? "absolute bottom-3 h-2 w-12 rounded-full bg-neutral-900/15 blur-[3px]" : "absolute bottom-1 h-2 w-10 rounded-full bg-neutral-900/15 blur-[3px]"} />
          {/* The three.js blob jiggles itself; bloub gets one small CSS wobble per hover. */}
          <span className={bloub && jiggle ? "rico-jiggle" : "block"} onAnimationEnd={() => setJiggle(false)}>
            <RicoLive size={size} happy={hover} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={bloub ? -6 : 4}>Ask Rico anything about this page</TooltipContent>
      </Tooltip>
    </div>
  );
}
