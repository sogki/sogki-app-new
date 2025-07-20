import React from "react";
import { motion } from "framer-motion";
import ShinyText from "./ShinyText";
import { SplitText } from "./SplitText";
import { ChevronDown, Github, Mail, Linkedin } from "lucide-react";

export const Hero: React.FC = () => {
  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-24">
      <div className="text-center max-w-4xl mx-auto">
        {/* Japanese subtitle */}
        <motion.p
          className="text-purple-300 text-sm tracking-widest mb-4 font-light"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          ソフトウェアエンジニア・デザイナー
        </motion.p>

        {/* Main title */}
        <h1 className="text-6xl md:text-8xl font-bold mb-20">
          <ShinyText text="Sogki" speed={3} />
        </h1>

        {/* Description */}
        <div className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
          <SplitText delay={0.8} className="block mb-2">
            Crafting digital experiences with passion, precision, and a touch of Japanese & Space aesthetics.
          </SplitText>
          <br />
          <SplitText delay={1.2} className="text-purple-300 text-lg">
            次元を超えたデジタル体験を創造
          </SplitText>
        </div>

        {/* CTA Buttons */}
        <motion.div
          className="flex gap-4 justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          <button
            onClick={scrollToProjects}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 transform-gpu"
          >
            View Projects
          </button>
          <a
            href="#contact"
            className="px-8 py-3 border border-purple-400/50 rounded-full text-purple-300 hover:bg-purple-500/10 transition-all duration-300 hover:scale-105 transform-gpu"
          >
            Get in Touch
          </a>
        </motion.div>

        {/* Social Links */}
        <motion.div
          className="flex gap-6 justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        >
          <a
            href="https://github.com/sogki"
            className="text-gray-400 hover:text-purple-400 transition-all duration-300 hover:scale-110 transform-gpu"
          >
            <Github size={24} />
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="animate-bounce"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
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
