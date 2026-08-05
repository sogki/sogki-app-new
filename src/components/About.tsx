import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ShinyText from './ShinyText';
import { Palette, Layers, Sparkles, ArrowRight } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';
import { sectionRevealTransition, sectionViewport, smoothEase } from '../lib/motionPresets';

const focusAreas = [
  {
    id: 'binderly',
    icon: <Sparkles size={22} />,
    title: 'Building Binderly',
    titleJp: 'Binderlyを構築中',
    body: 'My main project — a Pokémon TCG home for binders, pricing, and collection care. Closed beta.',
    accent: 'from-amber-500/20 to-orange-600/10 border-amber-400/25',
    glow: 'group-hover:shadow-amber-500/10',
  },
  {
    id: 'craft',
    icon: <Palette size={22} />,
    title: 'Design & Frontend',
    titleJp: 'デザインとフロントエンド',
    body: 'Interfaces with personality — branded UI, motion, and graphic design work alongside code.',
    accent: 'from-purple-500/20 to-indigo-500/10 border-purple-400/25',
    glow: 'group-hover:shadow-purple-500/10',
  },
  {
    id: 'stack',
    icon: <Layers size={22} />,
    title: 'Full-Stack Products',
    titleJp: 'フルスタックプロダクト',
    body: 'From schema design to deployed UI — companion apps, APIs, and creator tools end to end.',
    accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-400/25',
    glow: 'group-hover:shadow-cyan-500/10',
  },
];

export const About: React.FC = () => {
  const { siteContent } = useSiteData();
  const [activeId, setActiveId] = useState(focusAreas[0]!.id);
  const active = focusAreas.find((f) => f.id === activeId) ?? focusAreas[0]!;

  return (
    <section className="relative bg-transparent px-4 py-12 sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-10 text-center sm:mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <h2 className="mb-3 font-mono text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl">
            <ShinyText text={getString(siteContent, 'about.section_title', 'About Me')} speed={3} />
          </h2>
          <p className="text-base text-purple-300 sm:text-lg">
            {getString(siteContent, 'about.section_title_jp', '私について')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div
            className="space-y-5 text-base leading-relaxed text-gray-300 sm:text-lg"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.64, delay: 0.06, ease: smoothEase }}
            viewport={sectionViewport}
          >
            <p>
              {getString(
                siteContent,
                'about.bio_1',
                "I'm Sogki (Jay) — a software engineer and designer who builds products people actually use."
              )}
            </p>
            <p>
              {getString(
                siteContent,
                'about.bio_2',
                'Most of my work sits at the intersection of games, collectors, and communities: companion tools, collection platforms, and APIs that solve real friction.'
              )}
            </p>
            <p>
              {getString(
                siteContent,
                'about.bio_3',
                'Right now my energy is on Binderly TCG in closed beta, while keeping ArcRaiders Companion and other live projects sharp.'
              )}
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 transition hover:text-purple-200"
            >
              Full journey & stack
              <ArrowRight size={14} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.64, delay: 0.1, ease: smoothEase }}
            viewport={sectionViewport}
          >
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-purple-300/70">
              Current focus
            </p>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {focusAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setActiveId(area.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    activeId === area.id
                      ? 'border-purple-400/50 bg-purple-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20'
                  }`}
                >
                  {area.title}
                </button>
              ))}
            </div>

            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-xl transition-shadow ${active.accent} ${active.glow}`}
            >
              <div className="mb-3 flex items-center gap-3 text-purple-200">
                <span className="rounded-lg border border-white/10 bg-black/30 p-2">
                  {active.icon}
                </span>
                <div>
                  <h3 className="font-mono text-lg font-semibold text-white">{active.title}</h3>
                  <p className="text-xs text-purple-300/80">{active.titleJp}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-gray-300">{active.body}</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
