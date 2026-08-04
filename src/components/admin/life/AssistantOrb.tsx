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
type Node = Vec3 & { phase: number; size: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Even points on a unit sphere (Fibonacci lattice). */
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
  // Inner constellation — denser “core mind”
  const core = fibonacciSphere(Math.floor(nodeCount * 0.35), radius * 0.42);
  const mid = fibonacciSphere(Math.floor(nodeCount * 0.2), radius * 0.68);

  const nodes: Node[] = [...shell, ...mid, ...core].map((p, i) => ({
    ...p,
    phase: (i * 0.37) % (Math.PI * 2),
    size: 1.2 + (i % 5) * 0.35,
  }));

  const links: Array<[number, number]> = [];
  const maxLinkDist = radius * 0.55;
  const maxLinkDist2 = maxLinkDist * maxLinkDist;
  const maxLinksPerNode = 5;

  for (let i = 0; i < nodes.length; i++) {
    const candidates: Array<{ j: number; d: number }> = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist2(nodes[i], nodes[j]);
      if (d < maxLinkDist2) candidates.push({ j, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    const take = Math.min(maxLinksPerNode, candidates.length);
    for (let k = 0; k < take; k++) {
      links.push([i, candidates[k].j]);
    }
  }

  // Ring scaffolds (Jarvis latitude lines as node belts)
  const ringYs = [-0.55, -0.2, 0.2, 0.55].map((y) => y * radius);
  for (const y of ringYs) {
    const ringIdx: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (Math.abs(nodes[i].y - y) < radius * 0.08) ringIdx.push(i);
    }
    ringIdx.sort((a, b) => Math.atan2(nodes[a].z, nodes[a].x) - Math.atan2(nodes[b].z, nodes[b].x));
    for (let i = 0; i < ringIdx.length; i++) {
      links.push([ringIdx[i], ringIdx[(i + 1) % ringIdx.length]]);
    }
  }

  return { nodes, links };
}

function energyTarget(mode: OrbMode, t: number, level: number, bands?: number[]) {
  if (bands && bands.length && (mode === 'listening' || mode === 'speaking')) {
    const avg = bands.reduce((s, v) => s + v, 0) / bands.length;
    return clamp01(0.2 + avg * 0.9);
  }
  if (mode === 'speaking') {
    const pulse =
      Math.abs(Math.sin(t * 5.1)) * 0.35 +
      Math.abs(Math.sin(t * 2.3)) * 0.2 +
      Math.abs(Math.sin(t * 9.0)) * 0.15;
    return clamp01(0.35 + level * 0.45 + pulse * 0.35);
  }
  return clamp01(0.22 + Math.sin(t * 1.2) * 0.06);
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const radius = size * 0.36;
    const { nodes, links } = buildGraph(72, radius);
    let smoothEnergy = 0.22;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const cx = size / 2;
      const cy = size / 2;
      const currentMode = modeRef.current;
      const target = energyTarget(currentMode, t, levelRef.current, bandsRef.current);
      smoothEnergy = lerp(smoothEnergy, target, currentMode === 'idle' ? 0.04 : 0.12);
      const energy = smoothEnergy;

      const rotY = t * (0.18 + energy * 0.12);
      const rotX = Math.sin(t * 0.23) * 0.35 + 0.15;

      // Project nodes
      const projected = nodes.map((n, i) => {
        let p = rotateY(n, rotY);
        p = rotateX(p, rotX);
        // Soft radial breathe
        const pulse = 1 + Math.sin(t * 2.1 + n.phase) * 0.012 * (1 + energy);
        const scale = pulse * (1 + energy * 0.04);
        const x3 = p.x * scale;
        const y3 = p.y * scale;
        const z3 = p.z * scale;
        const perspective = 1.15 / (1.15 - z3 / (radius * 2.2));
        return {
          i,
          x: cx + x3 * perspective,
          y: cy + y3 * perspective,
          z: z3,
          depth: perspective,
          blink: 0.55 + Math.sin(t * 3.4 + n.phase) * 0.45,
          size: n.size,
        };
      });

      ctx.clearRect(0, 0, size, size);

      // Ambient volumetric glow (dashboard cyan)
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.35);
      glow.addColorStop(0, `rgba(224, 242, 254, ${0.2 + energy * 0.25})`);
      glow.addColorStop(0.25, `rgba(56, 189, 248, ${0.14 + energy * 0.18})`);
      glow.addColorStop(0.55, `rgba(14, 165, 233, ${0.06 + energy * 0.08})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Depth-sorted links (spiderweb)
      const depthLinks = links
        .map(([a, b]) => {
          const pa = projected[a];
          const pb = projected[b];
          return { pa, pb, z: (pa.z + pb.z) * 0.5 };
        })
        .sort((a, b) => a.z - b.z);

      for (const { pa, pb, z } of depthLinks) {
        const depthFade = clamp01((z + radius) / (radius * 2));
        const activity = (pa.blink + pb.blink) * 0.5;
        const alpha = (0.08 + depthFade * 0.22 + energy * 0.2) * (0.55 + activity * 0.45);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha})`;
        ctx.lineWidth = 0.6 + depthFade * 0.7 + energy * 0.4;
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      // Occasional brighter “data pulse” along a few links
      const pulseCount = 6 + Math.floor(energy * 10);
      for (let p = 0; p < pulseCount; p++) {
        const link = links[(Math.floor(t * 4 + p * 17) + p * 3) % links.length];
        if (!link) continue;
        const pa = projected[link[0]];
        const pb = projected[link[1]];
        const u = (Math.sin(t * 3.2 + p) * 0.5 + 0.5 + (t * 0.35 + p * 0.1)) % 1;
        const x = lerp(pa.x, pb.x, u);
        const y = lerp(pa.y, pb.y, u);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 3.5);
        g.addColorStop(0, `rgba(240, 249, 255, ${0.55 + energy * 0.35})`);
        g.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nodes as data modules (small rects), back → front
      const sortedNodes = [...projected].sort((a, b) => a.z - b.z);
      for (const n of sortedNodes) {
        const depthFade = clamp01((n.z + radius) / (radius * 2));
        const s = (1.4 + n.size * 0.55) * n.depth * (0.85 + energy * 0.25);
        const alpha = 0.25 + depthFade * 0.55 + n.blink * 0.15 * energy;

        // Module glow
        const mg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, s * 3);
        mg.addColorStop(0, `rgba(186, 230, 253, ${0.35 * alpha})`);
        mg.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(n.x, n.y, s * 3, 0, Math.PI * 2);
        ctx.fill();

        // Rectangular data chip
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate((n.i % 2 === 0 ? 1 : -1) * 0.2);
        ctx.fillStyle = `rgba(240, 249, 255, ${0.55 + alpha * 0.4})`;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + alpha * 0.4})`;
        ctx.lineWidth = 0.7;
        const w = s * (n.i % 3 === 0 ? 2.2 : 1.5);
        const h = s * (n.i % 3 === 0 ? 1.1 : 1.5);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }

      // Soft core nucleus
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.28);
      core.addColorStop(0, `rgba(248, 250, 252, ${0.45 + energy * 0.35})`);
      core.addColorStop(0.4, `rgba(56, 189, 248, ${0.22 + energy * 0.22})`);
      core.addColorStop(1, 'rgba(8, 47, 73, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={size}
      height={size}
      aria-hidden
    />
  );
}
