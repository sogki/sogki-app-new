import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Code,
  Rocket,
  Award,
  Globe,
  Zap,
  Palette,
  ExternalLink,
} from 'lucide-react';
import ShinyText from './ShinyText';
import { sectionRevealTransition, sectionViewport, smoothEase } from '../lib/motionPresets';

type TimelineStatus =
  | 'live'
  | 'closed-beta'
  | 'in-progress'
  | 'completed'
  | 'offline'
  | 'ceased'
  | 'milestone';

interface TimelineEvent {
  year: string;
  title: string;
  titleJp: string;
  description: string;
  hoverDetail?: string;
  tech?: string[];
  url?: string;
  icon: React.ReactNode;
  color: string;
  status: TimelineStatus;
  branch?: 'left' | 'right' | 'center';
}

const STATUS_META: Record<
  TimelineStatus,
  { label: string; className: string }
> = {
  live: { label: 'Live', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  'closed-beta': {
    label: 'Closed Beta',
    className: 'bg-amber-500/20 text-amber-200 border-amber-400/35',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
  },
  offline: { label: 'Offline', className: 'bg-white/10 text-gray-400 border-white/15' },
  ceased: { label: 'Ceased', className: 'bg-white/10 text-gray-500 border-white/10' },
  milestone: {
    label: 'Milestone',
    className: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
  },
};

const events: TimelineEvent[] = [
  {
    year: '2026',
    title: 'ArcRaiders Companion',
    titleJp: 'アークレイダーズコンパニオン',
    description:
      'Production Arc Raiders companion — events, maps, 480+ item database, raid planning.',
    hoverDetail: 'Actively maintained in production with live game data.',
    tech: ['Next.js', 'PostgreSQL', 'Supabase', 'TypeScript'],
    url: 'https://arcraiders.50andbad.site',
    icon: <Rocket size={20} />,
    color: 'from-indigo-500 to-blue-500',
    status: 'live',
    branch: 'left',
  },
  {
    year: '2026',
    title: 'TikTok Live API',
    titleJp: 'TikTok Live API',
    description: 'REST API for live status, viewer counts, OAuth keys, and embed badges.',
    hoverDetail: 'Developer-facing API with rate limits and Discord login.',
    tech: ['TypeScript', 'REST', 'Discord OAuth'],
    url: 'https://api.50andbad.site',
    icon: <Zap size={20} />,
    color: 'from-pink-500 to-rose-500',
    status: 'live',
    branch: 'right',
  },
  {
    year: '2025',
    title: "50andBad's VOD Archive",
    titleJp: '50andBad VODアーカイブ',
    description: 'Creator VOD archive with admin tooling and polished discovery UX.',
    tech: ['Next.js', 'PostgreSQL', 'Supabase'],
    url: 'https://50andbad.site',
    icon: <Globe size={20} />,
    color: 'from-emerald-500 to-teal-500',
    status: 'completed',
    branch: 'left',
  },
  {
    year: '2025',
    title: 'Binderly TCG',
    titleJp: 'Binderly TCG',
    description: 'My main project — Pokémon collection platform with binders and pricing.',
    hoverDetail: 'Passion project currently in closed beta.',
    tech: ['Next.js', 'PostgreSQL', 'TypeScript'],
    url: 'https://binderlytcg.com',
    icon: <Award size={20} />,
    color: 'from-amber-500 to-orange-600',
    status: 'closed-beta',
    branch: 'right',
  },
  {
    year: '2025',
    title: 'RankTheGlobe',
    titleJp: '地球儀をランク付けする',
    description: 'Full-stack role building rankings across web and mobile.',
    hoverDetail: 'Operations ceased due to funding at World Ranking Inc.',
    tech: ['React Native', 'Next.js', 'PostgreSQL'],
    icon: <Globe size={20} />,
    color: 'from-cyan-500 to-teal-500',
    status: 'ceased',
    branch: 'left',
  },
  {
    year: '2025',
    title: 'Profiles After Dark',
    titleJp: 'プロフィールアフターダーク',
    description: 'Aesthetic profile community that reached 200+ users.',
    hoverDetail: 'Site is no longer live — kept here as a shipping milestone.',
    tech: ['Next.js', 'PostgreSQL'],
    icon: <Code size={20} />,
    color: 'from-violet-500 to-purple-500',
    status: 'offline',
    branch: 'right',
  },
  {
    year: '2025',
    title: 'Marlow Marketing',
    titleJp: 'マーロウマーケティング',
    description: 'Client website — clean, responsive marketing agency presence.',
    tech: ['React', 'TypeScript', 'Framer Motion'],
    url: 'https://marlowmarketing.org',
    icon: <Palette size={20} />,
    color: 'from-orange-500 to-amber-500',
    status: 'completed',
    branch: 'left',
  },
  {
    year: '2023',
    title: 'Full-Stack Journey',
    titleJp: 'フルスタックの旅',
    description: 'Deepened skills across React, Node, databases, and cloud deployment.',
    icon: <Code size={20} />,
    color: 'from-green-500 to-emerald-500',
    status: 'milestone',
    branch: 'center',
  },
  {
    year: '2020',
    title: 'Started Development',
    titleJp: '開発を開始',
    description: 'Began building digital products — design-led, user-focused engineering.',
    icon: <Calendar size={20} />,
    color: 'from-yellow-500 to-orange-500',
    status: 'milestone',
    branch: 'center',
  },
];

function TimelineCard({
  event,
  align,
}: {
  event: TimelineEvent;
  align: 'left' | 'right' | 'center';
}) {
  const [hovered, setHovered] = useState(false);
  const status = STATUS_META[event.status];
  const textAlign =
    align === 'left' ? 'md:text-right' : align === 'right' ? 'md:text-left' : 'md:text-center';

  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/50 p-6 backdrop-blur-sm ${textAlign}`}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r opacity-0 transition-opacity duration-300 ${event.color} ${hovered ? 'opacity-25' : ''}`}
      />

      <div className="relative">
        <div
          className={`mb-3 flex flex-wrap items-center gap-2 ${align === 'left' ? 'md:justify-end' : align === 'center' ? 'justify-center' : ''}`}
        >
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${status.className}`}
          >
            {status.label}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-semibold text-white ${event.color}`}
          >
            {event.icon}
            {event.year}
          </span>
        </div>

        <h3 className="font-mono text-xl font-bold text-white">{event.title}</h3>
        <p className="mt-1 text-sm text-purple-300/80">{event.titleJp}</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">{event.description}</p>

        <AnimatePresence>
          {hovered && (event.hoverDetail || event.tech?.length) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {event.hoverDetail && (
                <p className="mt-3 text-xs leading-relaxed text-gray-400">{event.hoverDetail}</p>
              )}
              {event.tech && event.tech.length > 0 && (
                <div
                  className={`mt-3 flex flex-wrap gap-1.5 ${align === 'left' ? 'md:justify-end' : align === 'center' ? 'justify-center' : ''}`}
                >
                  {event.tech.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-gray-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {event.url && event.status !== 'offline' && event.status !== 'ceased' && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 inline-flex items-center gap-1 text-xs text-purple-300 opacity-0 transition-opacity hover:text-purple-200 ${hovered ? 'opacity-100' : ''}`}
          >
            Visit <ExternalLink size={12} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export const Timeline: React.FC = () => {
  return (
    <section className="relative overflow-hidden px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <h2 className="font-mono text-5xl font-bold md:text-6xl">
            <ShinyText text="Journey" speed={3} />
          </h2>
          <p className="mb-2 mt-2 text-lg text-purple-300">旅路</p>
          <p className="mx-auto max-w-2xl text-gray-400">
            Projects shipped, paused, and milestones along the way — hover a card for more detail.
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-amber-500 via-purple-500 to-blue-500 md:block" />

          <div className="space-y-14 md:space-y-16">
            {events.map((event, index) => {
              const isLeft = event.branch === 'left';
              const isRight = event.branch === 'right';
              const isCenter = event.branch === 'center' || (!isLeft && !isRight);

              return (
                <motion.div
                  key={`${event.year}-${event.title}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: Math.min(index * 0.04, 0.25),
                    ease: smoothEase,
                  }}
                  viewport={sectionViewport}
                  className="relative"
                >
                  <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12">
                    {isLeft ? (
                      <div className="md:col-span-5 md:pr-8">
                        <TimelineCard event={event} align="left" />
                      </div>
                    ) : (
                      <div className="hidden md:col-span-5 md:block" />
                    )}

                    <div className="flex justify-center md:col-span-2">
                      <div
                        className={`relative z-10 h-3 w-3 rounded-full bg-gradient-to-r shadow-lg ${event.color}`}
                      >
                        <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                      </div>
                    </div>

                    {isRight ? (
                      <div className="md:col-span-5 md:pl-8">
                        <TimelineCard event={event} align="right" />
                      </div>
                    ) : isCenter ? (
                      <div className="md:col-span-10 md:col-start-2">
                        <TimelineCard event={event} align="center" />
                      </div>
                    ) : (
                      <div className="hidden md:col-span-5 md:block" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
