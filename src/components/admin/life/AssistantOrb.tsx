import { useEffect, useRef } from 'react';

export type OrbMode = 'idle' | 'listening' | 'speaking';

type AssistantOrbProps = {
  mode: OrbMode;
  level?: number;
  bands?: number[];
  size?: number;
  className?: string;
};

type Vec3 = { x: number; y: number; z: number };
type Node = Vec3 & { phase: number; size: number; band: number };

type Shockwave = { born: number; strength: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function fibonacciSphere(count: number, radius: number): Vec3[] {
  const pts: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return pts;
}

function dist2(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function rotateY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function buildGraph(nodeCount: number, radius: number) {
  const shell = fibonacciSphere(nodeCount, radius);
  const core = fibonacciSphere(Math.floor(nodeCount * 0.28), radius * 0.45);

  const nodes: Node[] = [...shell, ...core].map((p, i) => ({
    ...p,
    phase: (i * 0.37) % (Math.PI * 2),
    size: 1.1 + (i % 4) * 0.3,
    band: i % 24,
  }));

  const links: Array<[number, number]> = [];
  const maxLinkDist2 = (radius * 0.5) ** 2;
  const maxLinksPerNode = 3;

  for (let i = 0; i < nodes.length; i++) {
    const candidates: Array<{ j: number; d: number }> = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist2(nodes[i], nodes[j]);
      if (d < maxLinkDist2) candidates.push({ j, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    for (let k = 0; k < Math.min(maxLinksPerNode, candidates.length); k++) {
      links.push([i, candidates[k]!.j]);
    }
  }

  return { nodes, links };
}

function sampleBands(
  bands: number[] | undefined,
  count: number,
  t: number,
  level: number,
  mode: OrbMode
) {
  if (bands && bands.length) {
    return Array.from({ length: count }, (_, i) => clamp01(bands[i % bands.length] ?? 0));
  }
  if (mode === 'speaking') {
    return Array.from({ length: count }, (_, i) =>
      clamp01(
        level * 0.65 +
          Math.abs(Math.sin(t * 9 + i * 0.5)) * 0.28 * (0.35 + level) +
          Math.abs(Math.sin(t * 3.6 + i * 0.18)) * 0.15
      )
    );
  }
  return Array.from({ length: count }, (_, i) =>
    clamp01(0.07 + Math.sin(t * 1.05 + i * 0.28) * 0.035)
  );
}

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
    // Keep geometry well inside the canvas so speech pulse never clips into a square
    const radius = size * 0.28;
    const { nodes, links } = buildGraph(42, radius);

    let smoothEnergy = 0.1;
    let prevEnergy = 0.1;
    let rotY = 0.3;
    let rotX = 0.14;
    const shockwaves: Shockwave[] = [];
    const nodeHeat = new Float32Array(nodes.length);
    // Reused projected buffer — avoid alloc every frame
    const projected = nodes.map(() => ({
      i: 0,
      x: 0,
      y: 0,
      z: 0,
      depth: 1,
      heat: 0,
      size: 1,
    }));

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const cx = size / 2;
      const cy = size / 2;
      const currentMode = modeRef.current;
      const liveLevel = levelRef.current;
      const liveBands = bandsRef.current;
      const active = currentMode === 'speaking' || currentMode === 'listening';

      const bandVals = sampleBands(liveBands, 24, t, liveLevel, currentMode);
      let bandSum = 0;
      for (let i = 0; i < bandVals.length; i++) bandSum += bandVals[i]!;
      const rawEnergy = active
        ? clamp01(liveLevel * 0.8 + (bandSum / bandVals.length) * 0.4)
        : clamp01(0.09 + Math.sin(t * 1.1) * 0.025);

      const ease = rawEnergy > smoothEnergy ? 0.28 : 0.1;
      smoothEnergy = lerp(smoothEnergy, rawEnergy, ease);
      const energy = smoothEnergy;
      const hit = Math.max(0, energy - prevEnergy);
      prevEnergy = energy;

      if (active && hit > 0.07) {
        shockwaves.push({ born: t, strength: clamp01(0.3 + hit * 2) });
        if (shockwaves.length > 3) shockwaves.shift();
      }

      if (currentMode === 'idle') {
        rotY += 0.0012;
        rotX = lerp(rotX, 0.14 + Math.sin(t * 0.18) * 0.03, 0.02);
      } else {
        rotY += 0.00025;
        rotX = lerp(rotX, 0.11 + energy * 0.03, 0.04);
      }

      for (let i = 0; i < nodes.length; i++) {
        // Fast attack so nodes snap with voice peaks
        const spike = active ? (bandVals[nodes[i]!.band % bandVals.length] ?? 0) : 0.05;
        nodeHeat[i] = lerp(nodeHeat[i]!, spike, active ? 0.42 : 0.05);
      }

      // Global breath stays subtle; per-node bounce carries the speech look
      const breath = active
        ? 1 + energy * 0.03
        : 1 + Math.sin(t * 1.15) * 0.01;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        let p = rotateY(n, rotY);
        p = rotateX(p, rotX);
        const heat = nodeHeat[i]!;
        // Radial bounce: each node moves in/out on its own frequency band
        const bounce =
          currentMode === 'speaking'
            ? 1 + heat * 0.22 + Math.sin(t * 14 + n.phase) * heat * 0.06
            : currentMode === 'listening'
              ? 1 + heat * 0.16
              : 1 + Math.sin(t * 1.4 + n.phase) * 0.012;
        const scale = Math.min(1.18, breath * bounce);
        const x3 = p.x * scale;
        const y3 = p.y * scale;
        const z3 = p.z * scale;
        const perspective = 1.12 / (1.12 - z3 / (radius * 2.4));
        const out = projected[i]!;
        out.i = i;
        out.x = cx + x3 * perspective;
        out.y = cy + y3 * perspective;
        out.z = z3;
        out.depth = perspective;
        out.heat = heat;
        out.size = n.size * (1 + (active ? heat * 0.55 : 0));
      }

      ctx.clearRect(0, 0, size, size);

      // Circular clip so nothing can look square
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
      ctx.clip();

      const bloomR = radius * (1.15 + energy * 0.25);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
      glow.addColorStop(0, `rgba(240, 249, 255, ${0.1 + energy * 0.28})`);
      glow.addColorStop(0.4, `rgba(56, 189, 248, ${0.08 + energy * 0.16})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, bloomR, 0, Math.PI * 2);
      ctx.fill();

      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const wave = shockwaves[s]!;
        const age = t - wave.born;
        if (age > 0.55) {
          shockwaves.splice(s, 1);
          continue;
        }
        const progress = age / 0.55;
        const r = radius * (0.35 + progress * 0.75);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(186, 230, 253, ${(1 - progress) * wave.strength * 0.55})`;
        ctx.lineWidth = 1.2 + (1 - progress) * 1.6;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Links (no per-frame sort — z-order is soft enough)
      for (let li = 0; li < links.length; li++) {
        const [a, b] = links[li]!;
        const pa = projected[a]!;
        const pb = projected[b]!;
        const heat = (pa.heat + pb.heat) * 0.5;
        const depthFade = clamp01((pa.z + pb.z + radius * 2) / (radius * 4));
        const flash = active ? heat * heat : 0;
        const alpha = 0.07 + depthFade * 0.12 + energy * 0.14 + flash * 0.4;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(125, 211, 252, ${clamp01(alpha)})`;
        ctx.lineWidth = 0.55 + energy * 0.5 + flash;
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      if (active && energy > 0.1) {
        const packetCount = 4 + Math.floor(energy * 8);
        for (let p = 0; p < packetCount; p++) {
          const link = links[(p * 11 + Math.floor(t * (5 + energy * 10))) % links.length];
          if (!link) continue;
          const pa = projected[link[0]]!;
          const pb = projected[link[1]]!;
          const u = (t * (1.2 + energy * 1.8) + p * 0.19) % 1;
          const x = lerp(pa.x, pb.x, u);
          const y = lerp(pa.y, pb.y, u);
          const pr = 1.2 + energy * 1.6;
          ctx.beginPath();
          ctx.fillStyle = `rgba(224, 242, 254, ${0.45 + energy * 0.35})`;
          ctx.arc(x, y, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (let i = 0; i < projected.length; i++) {
        const n = projected[i]!;
        const depthFade = clamp01((n.z + radius) / (radius * 2));
        const flare = active ? n.heat : 0.04;
        const s = (1.05 + n.size * 0.45) * n.depth * (0.8 + energy * 0.2 + flare * 0.7);

        if (flare > 0.15) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(186, 230, 253, ${flare * 0.35})`;
          ctx.arc(n.x, n.y, s * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        const w = s * (n.i % 3 === 0 ? 1.9 : 1.3);
        const h = s * (n.i % 3 === 0 ? 1 : 1.3);
        ctx.fillStyle = `rgba(240, 249, 255, ${0.35 + depthFade * 0.25 + flare * 0.35})`;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 + flare * 0.45})`;
        ctx.lineWidth = 0.6 + flare * 0.5;
        ctx.fillRect(n.x - w / 2, n.y - h / 2, w, h);
        ctx.strokeRect(n.x - w / 2, n.y - h / 2, w, h);
      }

      const coreR = radius * (0.14 + energy * 0.06);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.6);
      core.addColorStop(0, `rgba(255, 255, 255, ${0.5 + energy * 0.3})`);
      core.addColorStop(0.5, `rgba(56, 189, 248, ${0.3 + energy * 0.25})`);
      core.addColorStop(1, 'rgba(8, 47, 73, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 1.6, 0, Math.PI * 2);
      ctx.fill();

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
