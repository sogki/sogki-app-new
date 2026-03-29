import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Sparkles } from 'lucide-react';
import ShinyText from './ShinyText';
import { BinderShowcaseCarousel } from './BinderShowcaseCarousel';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';
import { sectionRevealTransition, sectionViewport, smoothEase } from '../lib/motionPresets';
import { collectionStats, masterSets, type MasterSetProgress } from '../data/pokemonCollection';
import { fetchBinderShowcases, type BinderShowcase, type BinderShowcaseSet } from '../lib/siteData';

type SetRow = MasterSetProgress | BinderShowcaseSet;

function setRowDescription(row: SetRow): string | null {
  const d = 'description' in row ? row.description : undefined;
  if (d == null || typeof d !== 'string') return null;
  const t = d.trim();
  return t ? t : null;
}

function MasterSetBar({ row, index }: { row: SetRow; index: number }) {
  const pct = Math.min(100, Math.round((row.completed / row.total) * 100));
  const blurb = setRowDescription(row);
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: smoothEase }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-semibold text-white font-mono">{row.name}</h3>
          {row.name_jp ? <p className="text-xs text-purple-300/90">{row.name_jp}</p> : null}
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-white tabular-nums">{pct}%</span>
          <p className="text-[11px] text-gray-400 tabular-nums">
            {row.completed} / {row.total}
          </p>
        </div>
      </div>
      {blurb ? <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-3">{blurb}</p> : null}
      <div className="h-2.5 rounded-full bg-black/40 overflow-hidden border border-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.1, ease: smoothEase, delay: 0.15 + index * 0.06 }}
        />
      </div>
    </motion.div>
  );
}

type PokemonCollectionProps = {
  isStandalonePage?: boolean;
};

export const PokemonCollection: React.FC<PokemonCollectionProps> = ({ isStandalonePage = false }) => {
  const { siteContent } = useSiteData();
  const [binderShowcases, setBinderShowcases] = useState<BinderShowcase[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchBinderShowcases()
      .then((rows) => {
        if (!cancelled) setBinderShowcases(rows);
      })
      .catch(() => {
        if (!cancelled) setBinderShowcases([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const TitleTag = isStandalonePage ? 'h1' : 'h2';
  const description = getString(siteContent, 'collection.section_description', '');

  return (
    <main
      className="relative min-h-screen py-12 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden"
      aria-label="Pokemon TCG collection"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <div className="inline-flex items-center gap-2 text-purple-300/90 text-xs sm:text-sm font-mono uppercase tracking-widest mb-4">
            <Layers size={16} className="text-fuchsia-400" />
            <span>TCG Collection</span>
            <Sparkles size={14} className="text-cyan-400" />
          </div>
          <TitleTag className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-mono">
            <ShinyText
              text={getString(siteContent, 'collection.section_title', 'Cards & binders')}
              speed={3}
            />
          </TitleTag>
          <p className="text-purple-300 text-base sm:text-lg mb-2">
            {getString(siteContent, 'collection.section_title_jp', 'コレクション')}
          </p>
          {description ? (
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto px-4">{description}</p>
          ) : null}
        </motion.div>

        {collectionStats.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14 sm:mb-16"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: smoothEase }}
          >
            {collectionStats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent px-6 py-5 text-center"
              >
                <p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums mb-1">{s.value}</p>
                <p className="text-sm text-gray-300">{s.label}</p>
                <p className="text-xs text-purple-300/80 mt-0.5">{s.labelJp}</p>
              </div>
            ))}
          </motion.div>
        )}

        {masterSets.length > 0 && (
          <div className="mb-14 sm:mb-16">
            <motion.h3
              className="text-xl sm:text-2xl font-bold font-mono text-white mb-6 flex items-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-fuchsia-500 to-transparent" />
              Master set progress
              <span className="text-sm font-normal text-purple-300/90">マスター進捗</span>
            </motion.h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {masterSets.map((set, index) => (
                <MasterSetBar key={set.id} row={set} index={index} />
              ))}
            </div>
          </div>
        )}

        {binderShowcases.length > 0 && (
          <div className="space-y-14 sm:space-y-16">
            <motion.h3
              className="text-xl sm:text-2xl font-bold font-mono text-white mb-2 flex items-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-cyan-500 to-transparent" />
              Binder showcase
              <span className="text-sm font-normal text-purple-300/90">バインダー</span>
            </motion.h3>

            {binderShowcases.map((s, pageIndex) => {
              const sets = s.binder_showcase_sets ?? [];
              return (
                <motion.article
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.55, delay: pageIndex * 0.06, ease: smoothEase }}
                  className="rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900/90 to-black/80 backdrop-blur-md p-5 sm:p-8 shadow-xl shadow-purple-950/30 relative overflow-hidden"
                >
                  <div>
                    <header className="mb-6 border-b border-white/10 pb-5">
                      <h4 className="text-xl font-bold text-white font-mono">{s.title}</h4>
                      {s.title_jp ? <p className="text-sm text-purple-300/90 mt-1">{s.title_jp}</p> : null}
                      {s.description ? (
                        <p className="text-sm text-gray-400 mt-3 max-w-3xl leading-relaxed">{s.description}</p>
                      ) : null}
                    </header>

                    <BinderShowcaseCarousel images={s.binder_showcase_images ?? []} alt={s.title} />

                    {sets.length > 0 ? (
                      <div className="mt-8">
                        <h5 className="text-sm font-mono text-white/90 mb-4 flex items-center gap-2">
                          <span className="h-px flex-1 max-w-8 bg-gradient-to-r from-fuchsia-500/60 to-transparent" />
                          Master sets
                          <span className="text-xs text-purple-300/80 font-normal">マスター</span>
                        </h5>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {sets.map((row, i) => (
                            <MasterSetBar key={row.id} row={row} index={i} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
