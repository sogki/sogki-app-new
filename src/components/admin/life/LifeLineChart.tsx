import type { InvestmentPoint } from '../../../lib/lifeDashboard/types';

type LifeLineChartProps = {
  points: InvestmentPoint[];
  positive?: boolean;
  className?: string;
};

/** Lightweight SVG sparkline/area chart — no chart library required. */
export default function LifeLineChart({ points, positive = true, className = '' }: LifeLineChartProps) {
  if (!points.length) {
    return (
      <div className={`flex h-40 items-center justify-center text-xs text-gray-500 ${className}`}>
        No chart data
      </div>
    );
  }

  const width = 640;
  const height = 180;
  const padX = 0;
  const padY = 10;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(points.length - 1, 1)) * (width - padX * 2);
    const y = padY + (1 - (p.value - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(2)},${height} L${coords[0].x.toFixed(2)},${height} Z`;
  const stroke = positive ? '#34d399' : '#f87171';
  const fill = positive ? 'rgba(52, 211, 153, 0.16)' : 'rgba(248, 113, 113, 0.14)';

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-48"
        role="img"
        aria-label="Price chart"
      >
        <defs>
          <linearGradient id="life-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#life-chart-fill)" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="4"
            fill={stroke}
          />
        )}
      </svg>
    </div>
  );
}
