import { useEffect, useId, useRef, useState } from "react";
import { NOTIF_BLUE, type DotRender } from "@/vendor/bloub/bot/decor";
import { BotEngine, type BotFrame } from "@/vendor/bloub/bot/engine";
import { EXPRESSION_BY_ID } from "@/vendor/bloub/bot/expressions";
import { clamp, easings } from "@/vendor/bloub/bot/math";
import { DEMI_VIEWBOX as VB, RAYON as R } from "@/vendor/bloub/bot/repere";
import { mixHex } from "@/vendor/bloub/bot/skins";
import type { StateId } from "@/vendor/bloub/bot/states";

// Rico on the bloub engine (github.com/jeremy-prt/bloub, MIT, vendored in src/vendor/bloub):
// one filled shape whose eyes are holes in a mask, morphing between measured states.
// This is a React port of bloub's BloubBot.vue, cut down to what Rico needs: one state at
// a time, a rest expression, eyes that follow the pointer, and a frozen mode for avatars.

export const RICO_INK = "#4f46e5"; // indigo-600, the page accent

type Props = {
  size: number;
  state?: StateId;
  /** bloub expression id, e.g. "neutre", "heureux", "curieux" */
  expression?: string;
  /** Eyes follow the pointer. */
  follow?: boolean;
  /** Render one still frame at this time (seconds) and run no loop. For avatars. */
  frozenAt?: number;
  /** What shows through the eye holes. */
  paper?: string;
  /** Crop the box to the body, for small avatars. */
  tight?: boolean;
  className?: string;
};

const TURN_IN = 1.1; // seconds for the head to turn towards the pointer, as in bloub's TURN_TIME
const YAW = 28, PITCH = 16; // degrees at the edge of the window

export function BloubRico({ size, state = "idle", expression = "neutre", follow, frozenAt, paper = "#ffffff", tight, className }: Props) {
  const maskId = `rico-mask-${useId().replace(/:/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const clock = useRef(0);
  const [engine] = useState(() => new BotEngine(R, state, null, EXPRESSION_BY_ID.get(expression) ?? null));
  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(frozenAt ?? 0));

  useEffect(() => {
    engine.setState(state, clock.current);
    if (frozenAt !== undefined) setFrame(engine.sample(frozenAt));
  }, [engine, state, frozenAt]);

  useEffect(() => {
    engine.setExpression(EXPRESSION_BY_ID.get(expression) ?? null, clock.current);
    if (frozenAt !== undefined) setFrame(engine.sample(frozenAt));
  }, [engine, expression, frozenAt]);

  useEffect(() => {
    if (frozenAt !== undefined) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pointer: { x: number; y: number } | null = null;
    let aimingSince: number | null = null;
    const onMove = (e: PointerEvent) => { if (e.pointerType !== "touch") pointer = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { pointer = null; };
    if (follow) {
      window.addEventListener("pointermove", onMove);
      document.addEventListener("pointerleave", onLeave);
    }

    let raf = 0, last = 0;
    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0;
      last = ms;
      clock.current += dt;
      const now = clock.current;

      // Same rule as bloub: no NaN into the engine, it keeps the last target forever.
      const box = svgRef.current?.getBoundingClientRect();
      if (follow && pointer && box && box.width > 0) {
        aimingSince ??= now;
        const nx = clamp((pointer.x - (box.left + box.width / 2)) / Math.max(1, window.innerWidth / 2), -1, 1);
        const ny = clamp((pointer.y - (box.top + box.height / 2)) / Math.max(1, window.innerHeight / 2), -1, 1);
        const mix = easings.easeOutQuint(clamp((now - aimingSince) / TURN_IN));
        engine.setLook({ yaw: nx * YAW, pitch: -ny * PITCH, mix, spin: 0, wander: 0 }, now);
      } else if (aimingSince !== null) {
        engine.setLook(null, now, TURN_IN);
        aimingSince = null;
      }

      setFrame(engine.sample(now));
      if (still) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [engine, follow, frozenAt]);

  const dot = (d: DotRender, i: number) => {
    const fill = d.color ?? (d.depth === undefined ? RICO_INK : mixHex(paper, RICO_INK, d.depth));
    return d.d
      ? <path key={i} d={d.d} fill={fill} opacity={d.opacity} transform={`translate(${d.x} ${d.y}) rotate(${d.rot ?? 0}) scale(${R})`} />
      : <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={fill} opacity={d.opacity} />;
  };

  return (
    <svg ref={svgRef} width={size} height={size} viewBox={tight ? `${-R * 1.05} ${-R * 1.05} ${R * 2.1} ${R * 2.1}` : `${-VB} ${-VB} ${VB * 2} ${VB * 2}`} className={className} aria-hidden="true">
      <defs>
        {/* The eyes are holes in the body, so they clip against the outline by themselves. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-VB} y={-VB} width={VB * 2} height={VB * 2}>
          <path d={frame.bodyPath} fill="#fff" />
          {frame.eyes.map((eye, i) => <path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="#000" />)}
          {frame.notch && <circle cx={frame.notch.x} cy={frame.notch.y} r={frame.notch.r} fill="#000" />}
        </mask>
        {frame.arcs.map((arc) => (
          <linearGradient key={arc.id} id={`${maskId}-${arc.id}`} gradientUnits="userSpaceOnUse" x1={arc.grad.x1} y1={arc.grad.y1} x2={arc.grad.x2} y2={arc.grad.y2}>
            {arc.grad.stops.map((c, i) => <stop key={i} offset={i / (arc.grad.stops.length - 1)} stopColor={c} />)}
          </linearGradient>
        ))}
      </defs>

      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => <path key={arc.id} d={arc.back} stroke={`url(#${maskId}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity} />)}
      </g>
      {frame.dotsBehind && <g>{frame.dots.map(dot)}</g>}

      <g opacity={frame.bodyAlpha}>
        {/* Opaque backing in the paper colour: what the eye holes show. */}
        <path d={frame.bodyPath} fill={paper} />
        <g mask={`url(#${maskId})`}>
          <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={RICO_INK} />
        </g>
      </g>

      {!frame.dotsBehind && <g>{frame.dots.map(dot)}</g>}
      {frame.notif && <circle cx={frame.notif.x} cy={frame.notif.y} r={frame.notif.r} fill={NOTIF_BLUE} />}
      <g fill="none" strokeLinecap="round">
        {frame.arcs.map((arc) => <path key={arc.id} d={arc.front} stroke={`url(#${maskId}-${arc.id})`} strokeWidth={arc.width} opacity={arc.opacity} />)}
      </g>
    </svg>
  );
}
