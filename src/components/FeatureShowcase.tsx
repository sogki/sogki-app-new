import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Zap, Palette, Rocket, Shield, Sparkles } from 'lucide-react';
import ShinyText from './ShinyText';

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
    id: 'design',
    icon: <Palette size={32} />,
    title: 'Aesthetic Design',
    titleJp: '美的デザイン',
    description: 'Creating visually stunning interfaces that blend Japanese minimalism with modern web aesthetics. Every pixel is intentional.',
    descriptionJp: '日本のミニマリズムとモダンなウェブ美学を融合した、視覚的に美しいインターフェースを作成。'
  },
  {
    id: 'performance',
    icon: <Zap size={32} />,
    title: 'Lightning Fast',
    titleJp: '超高速',
    description: 'Optimized for performance with instant load times, smooth animations, and zero lag. Built for scale.',
    descriptionJp: '瞬時の読み込み、スムーズなアニメーション、ゼロラグで最適化。スケールのために構築。'
  },
  {
    id: 'innovation',
    icon: <Sparkles size={32} />,
    title: 'Cutting Edge',
    titleJp: '最先端',
    description: 'Leveraging the latest technologies and frameworks to build innovative solutions that push boundaries.',
    descriptionJp: '最新の技術とフレームワークを活用し、境界を押し広げる革新的なソリューションを構築。'
  },
  {
    id: 'scalability',
    icon: <Rocket size={32} />,
    title: 'Scalable Architecture',
    titleJp: 'スケーラブルなアーキテクチャ',
    description: 'Building systems that grow with your business. From MVP to enterprise, designed for the long term.',
    descriptionJp: 'ビジネスと共に成長するシステムを構築。MVPからエンタープライズまで、長期的に設計。'
  },
  {
    id: 'security',
    icon: <Shield size={32} />,
    title: 'Secure & Reliable',
    titleJp: '安全で信頼性',
    description: 'Enterprise-grade security with best practices. Your data and users are protected at every layer.',
    descriptionJp: 'ベストプラクティスによるエンタープライズグレードのセキュリティ。すべてのレイヤーで保護。'
  },
  {
    id: 'code',
    icon: <Code2 size={32} />,
    title: 'Clean Code',
    titleJp: 'クリーンなコード',
    description: 'Maintainable, well-documented code that follows best practices. Easy to understand and extend.',
    descriptionJp: 'ベストプラクティスに従った、保守可能で文書化されたコード。理解しやすく拡張可能。'
  }
];

export const FeatureShowcase: React.FC = () => {
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
            <ShinyText text="What I Bring" speed={3} />
          </h2>
          <p className="text-purple-300 text-base sm:text-lg mb-2">私が提供するもの</p>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto px-4">
            A comprehensive approach to building digital products that matter
          </p>
        </motion.div>

        {/* Auto-scrolling Marquee */}
        <div className="relative overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-6 animate-marquee-features">
            {/* Duplicate for seamless loop - start from right edge */}
            {[...features, ...features].map((feature, index) => (
              <div
                key={`${feature.id}-${index}`}
                className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-[320px]"
              >
                <div className="group relative h-full">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 -z-10" />

                  <div className="relative bg-black/40 border border-white/10 rounded-xl p-4 sm:p-6 h-full hover:border-purple-400/50 transition-all duration-200">
                    {/* Icon */}
                    <div className="mb-3 sm:mb-4">
                      <div className="inline-flex p-2 sm:p-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/50">
                        {feature.icon}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 font-mono group-hover:text-purple-300 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-purple-300 mb-3 sm:mb-4">{feature.titleJp}</p>

                    {/* Description */}
                    <div className="space-y-2">
                      <p className="text-gray-300 leading-relaxed text-xs sm:text-sm line-clamp-3">
                        {feature.description}
                      </p>
                      <p className="text-xs text-purple-300/80 italic border-l-2 border-purple-500/50 pl-2 sm:pl-3 line-clamp-2">
                        {feature.descriptionJp}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
