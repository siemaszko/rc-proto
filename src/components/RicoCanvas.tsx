import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RICO_EYES, RICO_R, ricoRadius } from "@/lib/rico-shape";

// Rico in three.js: a flat indigo blob with two pill eyes, like the mascot sketches.
// The outline wobbles slowly, the body breathes and bobs, the eyes blink and follow the
// pointer. Hovering or clicking the host button kicks a damped spring: the jelly jiggle.
// Lazy-loaded so three.js stays out of the page's first bundle.

const BODY = 0x4f46e5; // indigo-600, the page accent
const SEGMENTS = 96;

function pill(w: number, h: number) {
  const r = w / 2, s = new THREE.Shape();
  s.moveTo(-r, -h / 2 + r);
  s.lineTo(-r, h / 2 - r);
  s.absarc(0, h / 2 - r, r, Math.PI, 0, true);
  s.lineTo(r, -h / 2 + r);
  s.absarc(0, -h / 2 + r, r, 0, Math.PI, true);
  return new THREE.ShapeGeometry(s, 16);
}

export default function RicoCanvas({ size }: { size: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current!;
    const trigger = host.closest("button") ?? host;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    const rico = new THREE.Group();
    scene.add(rico);

    const bodyGeo = new THREE.CircleGeometry(RICO_R, SEGMENTS);
    const pos = bodyGeo.attributes.position as THREE.BufferAttribute;
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: BODY }));
    rico.add(body);

    const eyeGeo = pill(RICO_EYES.w, RICO_EYES.h);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyes = new THREE.Group();
    eyes.position.set(0, RICO_EYES.y, 0.1);
    for (const x of [-RICO_EYES.x, RICO_EYES.x]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.x = x;
      eye.rotation.z = -RICO_EYES.tilt;
      eyes.add(eye);
    }
    rico.add(eyes);

    // Jiggle: a damped spring on the squash. Hover and click give it a kick.
    let jx = 0, jv = 0;
    const kick = () => { jv += 2.2; }; // was 5.5 in round 4; toned down in round 5
    trigger.addEventListener("pointerenter", kick);
    trigger.addEventListener("pointerdown", kick);

    // Eyes follow the pointer a little.
    const look = new THREE.Vector2(), lookTarget = new THREE.Vector2();
    const onMove = (e: PointerEvent) => {
      const b = host.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(d / 300, 1) * 0.07;
      lookTarget.set((dx / d) * k, (-dy / d) * k);
    };
    window.addEventListener("pointermove", onMove);

    let blinkAt = 1.5, raf = 0, last = performance.now();
    const t0 = last;

    const frame = (now: number) => {
      const t = (now - t0) / 1000, dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      jv += (-190 * jx - 9 * jv) * dt;
      jx += jv * dt;

      // Outline: slow wobble, louder while jiggling.
      const w = 0.022 + Math.min(Math.abs(jx), 0.3) * 0.5;
      for (let i = 1; i <= SEGMENTS + 1; i++) {
        const a = ((i - 1) / SEGMENTS) * Math.PI * 2;
        const r = ricoRadius(a) * (1 + w * Math.sin(3 * a + t * 1.4) + w * 0.7 * Math.sin(5 * a - t * 2.1) + w * 0.5 * Math.sin(2 * a + t * 0.9));
        pos.setXY(i, Math.cos(a) * r, Math.sin(a) * r);
      }
      pos.needsUpdate = true;

      const breath = Math.sin(t * 2.2) * 0.02;
      rico.scale.set(1 + breath + jx, 1 - breath - jx * 0.8, 1);
      rico.position.y = -0.08 + Math.sin(t * 1.6) * 0.035;
      rico.rotation.z = jx * 0.35;

      look.lerp(lookTarget, 0.08);
      eyes.position.x = look.x;
      eyes.position.y = RICO_EYES.y + look.y;

      // Blink for 140ms every 2.5-5.5s.
      if (t > blinkAt + 0.14) blinkAt = t + 2.5 + Math.random() * 3;
      eyes.scale.y = t >= blinkAt ? 0.12 : 1;

      renderer.render(scene, camera);
      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      trigger.removeEventListener("pointerenter", kick);
      trigger.removeEventListener("pointerdown", kick);
      window.removeEventListener("pointermove", onMove);
      bodyGeo.dispose(); eyeGeo.dispose(); eyeMat.dispose(); (body.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [size]);

  return <div ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}
