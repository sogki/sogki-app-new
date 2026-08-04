import { useEffect, useRef } from 'react';

export type OrbMode = 'idle' | 'listening' | 'speaking';

type AssistantOrbProps = {
  mode: OrbMode;
  level?: number;
  bands?: number[];
  size?: number;
  className?: string;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function avgBands(bands: number[] | undefined, fallback: number) {
  if (!bands?.length) return fallback;
  let s = 0;
  for (let i = 0; i < bands.length; i++) s += bands[i]!;
  return s / bands.length;
}

/**
 * Clean Jarvis-style energy core:
 * soft luminous sphere + a few orbital HUD rings — no wireframe mesh.
 */
export default function AssistantOrb({
  mode,
  level = 0,
  bands,
  size = 220,
  className = '',
}: AssistantOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(level);
  const bandsRef = useRef(bands);
  const modeRef = useRef(mode);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    bandsRef.current = bands;
  }, [bands]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let smooth = 0.08;
    let ringSpin = 0;
    let scan = 0;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const cx = size / 2;
      const cy = size / 2;
      const currentMode = modeRef.current;
      const liveLevel = levelRef.current;
      const liveBands = bandsRef.current;
      const active = currentMode !== 'idle';

      const bandAvg = avgBands(liveBands, liveLevel);
      const raw = active
        ? clamp01(liveLevel * 0.7 + bandAvg * 0.45)
        : clamp01(0.1 + Math.sin(t * 0.7) * 0.025);

      smooth = lerp(smooth, raw, raw > smooth ? 0.2 : 0.07);
      const e = smooth;

      const spinSpeed =
        currentMode === 'idle' ? 0.22 : currentMode === 'listening' ? 0.55 : 0.38;
      ringSpin += 0.016 * spinSpeed;
      scan += 0.012 + e * 0.04;

      const R = size * 0.28 * (1 + (active ? e * 0.04 : Math.sin(t * 0.9) * 0.008));

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.495, 0, Math.PI * 2);
      ctx.clip();

      // Atmosphere
      const atm = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
      atm.addColorStop(0, `rgba(14, 116, 144, ${0.14 + e * 0.12})`);
      atm.addColorStop(0.45, `rgba(8, 47, 73, ${0.1 + e * 0.06})`);
      atm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = atm;
      ctx.fillRect(0, 0, size, size);

      // Soft outer halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.85);
      halo.addColorStop(0, `rgba(34, 211, 238, ${0.08 + e * 0.14})`);
      halo.addColorStop(0.55, `rgba(14, 165, 233, ${0.05 + e * 0.06})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.85, 0, Math.PI * 2);
      ctx.fill();

      // Expanding voice rings
      if (active) {
        for (let i = 0; i < 3; i++) {
          const age = (t * (0.55 + e * 0.35) + i * 0.33) % 1;
          const rr = R * (1.05 + age * 0.85);
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(165, 243, 252, ${(1 - age) * (0.22 + e * 0.35)})`;
          ctx.lineWidth = 1.4 * (1 - age * 0.7);
          ctx.stroke();
        }
      }

      // Orbital HUD rings — thin, elegant, few
      const orbits = [
        { tilt: 0.62, scaleY: 0.38, r: 1.22, speed: 1, ticks: 36, dash: false },
        { tilt: 1.15, scaleY: 0.48, r: 1.38, speed: -0.7, ticks: 24, dash: true },
        { tilt: 0.35, scaleY: 0.28, r: 1.55, speed: 0.45, ticks: 48, dash: false },
      ] as const;

      for (let oi = 0; oi < orbits.length; oi++) {
        const o = orbits[oi]!;
        const ang = ringSpin * o.speed + oi * 0.8;
        const rr = R * o.r * (1 + e * 0.03);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang * 0.15 + o.tilt * 0.2);
        ctx.scale(1, o.scaleY);

        // Ring body
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(103, 232, 249, ${0.18 + e * 0.2 - oi * 0.03})`;
        ctx.lineWidth = oi === 0 ? 1.35 : 0.9;
        if (o.dash) ctx.setLineDash([4, 7]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tick marks
        for (let k = 0; k < o.ticks; k++) {
          if (k % 3 !== 0 && oi === 2) continue;
          const a = (k / o.ticks) * Math.PI * 2 + ang;
          const major = k % 6 === 0;
          const len = major ? 5.5 : 2.8;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(ca * (rr - len), sa * (rr - len));
          ctx.lineTo(ca * (rr + (major ? 1.5 : 0.5)), sa * (rr + (major ? 1.5 : 0.5)));
          ctx.strokeStyle = `rgba(165, 243, 252, ${major ? 0.35 + e * 0.2 : 0.12 + e * 0.1})`;
          ctx.lineWidth = major ? 1.1 : 0.6;
          ctx.stroke();
        }

        // Bright arc accent on each ring
        const arcStart = ang + oi;
        const arcLen = 0.55 + e * 0.45;
        ctx.beginPath();
        ctx.arc(0, 0, rr, arcStart, arcStart + arcLen);
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.45 + e * 0.35})`;
        ctx.lineWidth = oi === 0 ? 2 : 1.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
      }

      // Scanning arc (single elegant sweep)
      {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(scan);
        const sweep = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.35);
        sweep.addColorStop(0, 'rgba(34, 211, 238, 0)');
        sweep.addColorStop(0.7, `rgba(34, 211, 238, ${0.04 + e * 0.06})`);
        sweep.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = sweep;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R * 1.35, -0.35, 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(R * 0.55, 0);
        ctx.lineTo(R * 1.32, 0);
        ctx.strokeStyle = `rgba(207, 250, 254, ${0.25 + e * 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // Glass sphere body
      const body = ctx.createRadialGradient(
        cx - R * 0.25,
        cy - R * 0.3,
        R * 0.05,
        cx,
        cy,
        R * 1.05
      );
      body.addColorStop(0, `rgba(240, 249, 255, ${0.2 + e * 0.15})`);
      body.addColorStop(0.25, `rgba(103, 232, 249, ${0.16 + e * 0.14})`);
      body.addColorStop(0.55, `rgba(14, 165, 233, ${0.12 + e * 0.1})`);
      body.addColorStop(0.82, `rgba(8, 47, 73, ${0.35 + e * 0.1})`);
      body.addColorStop(1, 'rgba(2, 12, 22, 0.55)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Inner luminous core
      const coreR = R * (0.42 + e * 0.12);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, `rgba(255, 255, 255, ${0.92 + e * 0.08})`);
      core.addColorStop(0.25, `rgba(207, 250, 254, ${0.7 + e * 0.2})`);
      core.addColorStop(0.55, `rgba(34, 211, 238, ${0.35 + e * 0.25})`);
      core.addColorStop(1, 'rgba(8, 145, 178, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight
      const spec = ctx.createRadialGradient(
        cx - R * 0.28,
        cy - R * 0.32,
        0,
        cx - R * 0.28,
        cy - R * 0.32,
        R * 0.35
      );
      spec.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      spec.addColorStop(0.4, 'rgba(186, 230, 253, 0.12)');
      spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx - R * 0.28, cy - R * 0.32, R * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Crisp rim
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(165, 243, 252, ${0.35 + e * 0.3})`;
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Inner rim glow
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.12 + e * 0.15})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Speaking: subtle frequency bars as soft arcs inside the glass
      if (currentMode === 'speaking' || (currentMode === 'listening' && e > 0.12)) {
        const n = 16;
        for (let i = 0; i < n; i++) {
          const b =
            liveBands && liveBands.length
              ? liveBands[i % liveBands.length]!
              : clamp01(e * (0.5 + 0.5 * Math.abs(Math.sin(t * 9 + i))));
          const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2;
          const len = R * (0.55 + b * 0.28);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a0) * R * 0.48, cy + Math.sin(a0) * R * 0.48);
          ctx.lineTo(cx + Math.cos(a0) * len, cy + Math.sin(a0) * len);
          ctx.strokeStyle = `rgba(207, 250, 254, ${0.15 + b * 0.45})`;
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={`block rounded-full ${className}`}
      width={size}
      height={size}
      style={{ width: size, height: size, maxWidth: '100%' }}
      aria-hidden
    />
  );
}
