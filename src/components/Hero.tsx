import React from "react";
import { motion } from "framer-motion";
import ShinyText from "./ShinyText";
import { ChevronDown, Github } from "lucide-react";

export const Hero: React.FC = () => {
  const scrollToProjects = () => {
    const element = document.getElementById("projects");
    if (element) {
      element.scrollIntoView({ behavior: "auto" });
      window.scrollBy(0, -20);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl opacity-20"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, ${
                i % 2 === 0 ? 'rgba(147, 51, 234, 0.4)' : 'rgba(59, 130, 246, 0.4)'
              } 0%, transparent 70%)`,
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
          />
        ))}
      </div>

      <div className="text-center max-w-4xl mx-auto relative z-10">
        {/* Japanese subtitle */}
        <motion.p
          className="text-purple-300 text-sm tracking-widest mb-4 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          ソフトウェアエンジニア・デザイナー
        </motion.p>

        {/* Main title */}
        <h1 className="text-6xl md:text-8xl font-bold mb-8 font-mono">
          <ShinyText text="Sogki" speed={3} />
        </h1>

        {/* Subtitle with typing effect */}
        <motion.p
          className="text-xl md:text-2xl text-gray-400 mb-12 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Full-stack engineer shipping production products end-to-end
        </motion.p>

        {/* Description - toned down entry motion */}
        <motion.div
          className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.45 }}
        >
          <p className="block mb-4">
            Crafting digital products that combine visual identity, real-world utility, and scalable architecture.
          </p>
          <p className="text-purple-300 text-lg">
            Production-ready work across companion apps, creator platforms, and community experiences.
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
            <span className="relative z-10">View Projects</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
            />
          </motion.button>
          <motion.a
            href="#contact"
            className="px-8 py-4 border-2 border-purple-400/50 rounded-full text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 transition-all duration-150 hover:scale-[1.02] transform-gpu relative overflow-hidden group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Get in Touch</span>
            <motion.div
              className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
            />
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
