import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Zap, Palette, Rocket, Shield, Sparkles } from 'lucide-react';
import ShinyText from './ShinyText';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';

interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  titleJp: string;
  description: string;
  descriptionJp: string;
}

const features: Feature[] = [
  {
    id: 'product-delivery',
    icon: <Palette size={32} />,
    title: 'Product-Led Frontend',
    titleJp: 'プロダクト主導のフロントエンド',
    description: 'I design and build interfaces that are opinionated, branded, and conversion-aware, not just component demos.',
    descriptionJp: 'コンポーネント実装だけでなく、ブランドと成果を意識したUIを設計・実装。'
  },
  {
    id: 'live-data-systems',
    icon: <Zap size={32} />,
    title: 'Live Data Experiences',
    titleJp: 'リアルタイムデータ体験',
    description: 'ArcRaiders Companion demonstrates event tracking, map/data exploration, and practical utility workflows in production.',
    descriptionJp: 'ArcRaiders Companionで、イベント追跡・地図探索・実用的なワークフローを本番運用。'
  },
  {
    id: 'community-platforms',
    icon: <Sparkles size={32} />,
    title: 'Community Platforms',
    titleJp: 'コミュニティプラットフォーム',
    description: 'Profiles After Dark highlights creator-friendly content architecture, discoverability, and repeat engagement loops.',
    descriptionJp: 'Profiles After Darkで、発見性と継続利用を重視したコミュニティ基盤を構築。'
  },
  {
    id: 'full-stack-ownership',
    icon: <Rocket size={32} />,
    title: 'Full-Stack Ownership',
    titleJp: 'フルスタック開発力',
    description: 'From database and API design to polished UI delivery, I handle complete product slices independently.',
    descriptionJp: 'DB設計からAPI、UI仕上げまで、一人でエンドツーエンドに完遂可能。'
  },
  {
    id: 'scalable-foundations',
    icon: <Shield size={32} />,
    title: 'Scalable Foundations',
    titleJp: '拡張可能な基盤',
    description: 'I architect data models and app structure to support feature velocity without sacrificing maintainability.',
    descriptionJp: '保守性を維持しながら、機能追加の速度を高める設計を実践。'
  },
  {
    id: 'execution-speed',
    icon: <Code2 size={32} />,
    title: 'Fast Iteration, High Polish',
    titleJp: '高速改善と高品質',
    description: 'I ship quickly, test with real users, and continuously refine based on behavior and feedback.',
    descriptionJp: '素早くリリースし、実ユーザーの反応を元に継続改善。'
  }
];

export const FeatureShowcase: React.FC = () => {
  const { siteContent } = useSiteData();
  return (
    <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 overflow-hidden pr-16 sm:pr-20 md:pr-24 lg:pr-28">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-mono">
            <ShinyText text={getString(siteContent, 'features.section_title', 'What I Bring')} speed={3} />
          </h2>
          <p className="text-purple-300 text-base sm:text-lg mb-2">{getString(siteContent, 'features.section_title_jp', '私が提供するもの')}</p>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto px-4">
            A comprehensive approach to building digital products that matter
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature) => (
            <div key={feature.id} className="group relative h-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10" />

              <div className="relative bg-black/40 border border-white/10 rounded-xl p-4 sm:p-6 h-full hover:border-purple-400/50 transition-all duration-200">
                <div className="mb-3 sm:mb-4">
                  <div className="inline-flex p-2 sm:p-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/40">
                    {feature.icon}
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 font-mono group-hover:text-purple-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-purple-300 mb-3 sm:mb-4">{feature.titleJp}</p>

                <div className="space-y-2">
                  <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">
                    {feature.description}
                  </p>
                  <p className="text-xs text-purple-300/80 italic border-l-2 border-purple-500/50 pl-2 sm:pl-3">
                    {feature.descriptionJp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
