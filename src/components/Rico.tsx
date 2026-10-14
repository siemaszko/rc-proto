import { lazy, Suspense } from "react";
import { RICO_EYES, ricoPath } from "@/lib/rico-shape";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

// Floating bottom-right launcher: animated Rico, tooltip on hover, click opens the chat.
export function RicoLauncher({ onOpen }: { onOpen: () => void }) {
  const size = 72;
  return (
    <div className="fixed right-4 bottom-24 z-40 md:right-6 md:bottom-6">
      <Tooltip>
        <TooltipTrigger
          render={<button onClick={onOpen} aria-label="Ask Rico" />}
          className="group relative grid place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-indigo-300"
        >
          <span aria-hidden className="absolute bottom-1 h-2 w-10 rounded-full bg-neutral-900/15 blur-[3px]" />
          <Suspense fallback={<RicoFace size={size} />}>
            <RicoCanvas size={size} />
          </Suspense>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={4}>Ask Rico anything about this page</TooltipContent>
      </Tooltip>
    </div>
  );
}
