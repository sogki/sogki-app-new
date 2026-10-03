export default function ScoreDisplay({
  score,
  size = 'lg',
}: {
  score: number | null;
  size?: 'sm' | 'lg';
}) {
  const display = score === null ? '—' : String(score);
  const tone =
    score === null
      ? 'text-zinc-500'
      : score >= 90
        ? 'text-emerald-300'
        : score >= 70
          ? 'text-amber-200'
          : 'text-rose-300';

  return (
    <div className={size === 'lg' ? 'text-center' : ''}>
      <p
        className={`font-mono font-semibold tracking-tight ${tone} ${
          size === 'lg' ? 'text-5xl' : 'text-2xl'
        }`}
      >
        {display}
        {score !== null && <span className="text-zinc-500"> / 100</span>}
      </p>
      {size === 'lg' && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Sentinel Security Score
        </p>
      )}
    </div>
  );
}
