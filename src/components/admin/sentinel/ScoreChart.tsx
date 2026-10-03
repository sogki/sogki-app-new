type Point = { date: string; score: number };

/** Lightweight SVG score trend — no chart library. */
export default function ScoreChart({ points }: { points: Point[] }) {
  if (!points.length) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-zinc-500">
        No score history yet
      </div>
    );
  }

  const width = 640;
  const height = 160;
  const padY = 12;
  const values = points.map((p) => p.score);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * width;
    const y = padY + (1 - (p.score - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(2)},${height} L${coords[0].x.toFixed(2)},${height} Z`;

  return (
    <div className="h-40 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="sentinel-score-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(220, 38, 38, 0.25)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sentinel-score-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#f87171"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
