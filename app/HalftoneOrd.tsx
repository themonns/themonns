"use client";

/*
  Ordet satt som halvtone. Hver prikk får størrelse etter hvor mye av bokstaven
  som dekker ruten, så kantene holder seg skarpe. Pekeren dytter prikkene fra
  plassen sin, og de varmer mot patina mens de er ute av posisjon. Klikk sender
  en ring gjennom ordet. Bygd på halftone-wordmark-footer, strippet til ordet.
*/

import * as React from "react";

type Props = {
  ord: string;
  blekk?: string;
  varm?: string;
  bakgrunn?: string;
  avstand?: number;
  radius?: number;
  skrift?: string;
  vekt?: number;
  className?: string;
};

const hex = (h: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [27, 28, 30];
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
};

export function HalftoneOrd({
  ord,
  blekk = "#1b1c1e",
  varm = "#41605a",
  bakgrunn = "#f2f1ee",
  avstand = 5,
  radius = 90,
  skrift = '"Nyght Serif", Georgia, serif',
  vekt = 400,
  className = "",
}: Props) {
  const rot = React.useRef<HTMLDivElement | null>(null);
  const lerret = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const root = rot.current;
    const canvas = lerret.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ink = hex(blekk);
    const warm = hex(varm);
    let w = 0,
      h = 0,
      dpr = 1,
      px = -1e5,
      py = -1e5,
      raf = 0,
      vaaken = true,
      synlig = true;
    let ring = { x: 0, y: 0, t: -1 };
    let dots = new Float32Array(0);
    let antall = 0;

    const layout = () => {
      const rect = root.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const mask = document.createElement("canvas");
      mask.width = w;
      mask.height = h;
      const m = mask.getContext("2d", { willReadFrequently: true });
      if (!m) return;
      m.font = `${vekt} 100px ${skrift}`;
      const maalt = m.measureText(ord).width;
      const str = maalt > 0 ? (w / maalt) * 100 : 0;
      m.font = `${vekt} ${str}px ${skrift}`;
      const box = m.measureText(ord);
      const cap = box.actualBoundingBoxAscent || str * 0.7;
      m.fillStyle = "#000";
      m.textBaseline = "alphabetic";
      /* Ordet fyller bredden. Grunnlinjen legges så versalhøyden akkurat går inn i boksen. */
      m.fillText(ord, (w - box.width) / 2, cap + (h - cap) / 2);
      const img = m.getImageData(0, 0, w, h).data;

      const gap = Math.max(3, avstand);
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp: number[] = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(y * w + x) * 4 + 3];
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.06) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          tmp.push(hx, hy, 0, 0, hx, hy, Math.sqrt(cov) * gap * 0.56);
        }
      }
      dots = new Float32Array(tmp);
      antall = tmp.length / 7;
      vaaken = true;
    };

    const tegn = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = bakgrunn;
      ctx.fillRect(0, 0, w, h);
      const r = rolig ? 0 : radius;
      const ringAlder = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAlder * 0.9;
      let beveger = false;
      for (let i = 0; i < antall; i++) {
        const j = i * 7;
        let x = dots[j],
          y = dots[j + 1],
          vx = dots[j + 2],
          vy = dots[j + 3];
        const hx = dots[j + 4],
          hy = dots[j + 5];
        if (!rolig) {
          if (ringAlder < 900) {
            const dx = hx - ring.x,
              dy = hy - ring.y;
            const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
            if (band > 0) {
              const f = band * 3.2 * (1 - ringAlder / 900);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
            }
          }
          const dx = x - px,
            dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (r > 0 && d2 < r * r) {
            const d = Math.sqrt(d2) + 0.001;
            const f = (1 - d / r) * 2.6;
            vx += (dx / d) * f;
            vy += (dy / d) * f;
          }
          vx = (vx + (hx - x) * 0.05) * 0.84;
          vy = (vy + (hy - y) * 0.05) * 0.84;
          x += vx;
          y += vy;
          if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) beveger = true;
          else {
            x = hx;
            y = hy;
            vx = 0;
            vy = 0;
          }
          dots[j] = x;
          dots[j + 1] = y;
          dots[j + 2] = vx;
          dots[j + 3] = vy;
        }
        const k = Math.min(1, Math.hypot(x - hx, y - hy) / 28);
        ctx.fillStyle =
          k > 0.02
            ? `rgb(${Math.round(ink[0] + (warm[0] - ink[0]) * k)},${Math.round(ink[1] + (warm[1] - ink[1]) * k)},${Math.round(ink[2] + (warm[2] - ink[2]) * k)})`
            : blekk;
        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6], 0, 6.2832);
        ctx.fill();
      }
      vaaken = beveger || ringAlder < 900 || px > -1e4;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!synlig) return;
      tegn(now);
      if (vaaken) raf = requestAnimationFrame(loop);
    };
    const vekk = () => {
      vaaken = true;
      if (!raf && synlig) raf = requestAnimationFrame(loop);
    };
    const lokal = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    const onMove = (e: PointerEvent) => {
      [px, py] = lokal(e);
      vekk();
    };
    const onLeave = () => {
      px = -1e5;
      py = -1e5;
      vekk();
    };
    const onDown = (e: PointerEvent) => {
      if (rolig) return;
      const p = lokal(e);
      ring = { x: p[0], y: p[1], t: performance.now() };
      vekk();
    };

    layout();
    tegn(performance.now());
    vekk();
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    const ro = new ResizeObserver(() => {
      layout();
      vekk();
    });
    ro.observe(root);
    const io = new IntersectionObserver((en) => {
      synlig = en[0] ? en[0].isIntersecting : true;
      if (synlig) vekk();
    });
    io.observe(root);
    let lever = true;
    document.fonts?.ready.then(() => {
      if (!lever) return;
      layout();
      vekk();
    });
    return () => {
      lever = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [ord, blekk, varm, bakgrunn, avstand, radius, skrift, vekt]);

  return (
    <div ref={rot} className={className} style={{ position: "relative", width: "100%", touchAction: "pan-y" }}>
      <canvas ref={lerret} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", margin: 0 }}>{ord}</h1>
    </div>
  );
}
