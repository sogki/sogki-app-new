import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatTime, greetingForHour } from '../../../lib/lifeDashboard/format';

type LifeWelcomeProps = {
  displayName: string;
};

export default function LifeWelcome({ displayName }: LifeWelcomeProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      data-widget-id="welcome"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -left-1/4 -top-1/2 h-[140%] w-[70%] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.28) 0%, rgba(99,102,241,0) 68%)',
          }}
          animate={{ x: [0, 36, 0], y: [0, 18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-1/5 top-[-20%] h-[120%] w-[55%] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0) 70%)',
          }}
          animate={{ x: [0, -22, 0], y: [0, 16, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/3 top-0 h-[90%] w-[50%] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(168,85,247,0.14) 0%, rgba(168,85,247,0) 65%)',
          }}
          animate={{ x: [0, 20, -12, 0], opacity: [0.55, 0.85, 0.6, 0.55] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            background:
              'linear-gradient(120deg, rgba(255,255,255,0.04) 0%, transparent 42%, rgba(255,255,255,0.03) 100%)',
          }}
        />
      </div>

      <div className="relative">
        <h1 className="text-2xl font-semibold tracking-tight text-white font-mono sm:text-3xl lg:text-4xl">
          {greeting}, {displayName}.
        </h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-gray-400">
          <span>{dateLabel}</span>
          <span className="font-mono text-gray-300 tabular-nums">{formatTime(now)}</span>
        </div>
      </div>
    </div>
  );
}
