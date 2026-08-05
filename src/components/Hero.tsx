import React from "react";
import { motion } from "framer-motion";
import ShinyText from "./ShinyText";
import LiquidBackground from "./LiquidBackground";
import { ChevronDown, Github } from "lucide-react";
import { useSiteData } from "../context/SiteDataContext";
import { getString } from "../lib/siteContent";
import { getMotionAwareScrollBehavior } from "../utils/motion";

export const Hero: React.FC = () => {
  const { siteContent } = useSiteData();
  const scrollToProjects = () => {
    const element = document.getElementById("projects");
    if (element) {
      element.scrollIntoView({ behavior: getMotionAwareScrollBehavior(), block: "start" });
      window.scrollBy(0, -20);
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24">
      <div className="absolute inset-0 z-0">
        <LiquidBackground
          intensity="medium"
          colors={['#0a0a0a', '#1a1a2e', '#16213e', '#533483', '#7209b7']}
          speed={1.2}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Japanese subtitle */}
        <motion.p
          className="text-purple-300 text-sm tracking-widest mb-4 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {getString(siteContent, 'hero.subtitle_jp', 'ソフトウェアエンジニア・デザイナー')}
        </motion.p>

        {/* Main title */}
        <h1 className="text-6xl md:text-8xl font-bold mb-8 font-mono">
          <ShinyText text={getString(siteContent, 'hero.title', 'Sogki')} speed={3} />
        </h1>

        {/* Subtitle with typing effect */}
        <motion.p
          className="text-xl md:text-2xl text-gray-400 mb-12 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {getString(siteContent, 'hero.subtitle', 'Software engineer & designer. I build products for collectors, gamers, and communities.')}
        </motion.p>

        <motion.div
          className="mb-12 text-lg leading-relaxed text-gray-300 md:text-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.45 }}
        >
          <p className="mb-4 block">
            {getString(siteContent, 'hero.description_1', 'Crafting digital products that combine visual identity, real-world utility, and scalable architecture.')}
          </p>
          <p className="text-base text-purple-300/90">
            {getString(siteContent, 'hero.description_2', 'Currently focused on Binderly TCG — my main project for Pokémon collectors.')}
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <motion.button
            onClick={scrollToProjects}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-150 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 transform-gpu relative overflow-hidden group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">{getString(siteContent, 'hero.cta_projects', 'View work')}</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
            />
          </motion.button>
          <motion.a
            href="/graphic-design"
            className="group relative transform-gpu overflow-hidden rounded-full border-2 border-purple-400/50 px-8 py-4 text-purple-300 transition-all duration-150 hover:scale-[1.02] hover:border-purple-400 hover:bg-purple-500/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">{getString(siteContent, 'hero.cta_design', 'Graphic design')}</span>
          </motion.a>
        </motion.div>

        {/* Social Links */}
        <motion.div
          className="flex gap-6 justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <motion.a
            href="https://github.com/sogki"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-purple-400 transition-all duration-150 transform-gpu relative group"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
          >
            <Github size={24} />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              GitHub
            </span>
          </motion.a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="opacity-90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <ChevronDown
            className="text-purple-400 mx-auto cursor-pointer hover:text-purple-300 transition-colors"
            size={32}
            onClick={scrollToProjects}
          />
        </motion.div>
      </div>
    </section>
  );
};
