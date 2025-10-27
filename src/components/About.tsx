import React from 'react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';

export const About: React.FC = () => {
  return (
    <div className="relative py-20 px-6 bg-transparent">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <ShinyText text="About Me" speed={3} />
          </h2>
          <p className="text-purple-300 text-lg">私について</p>
        </motion.div>

        {/* About Content */}
        <motion.div
          className="text-center text-gray-300 text-lg leading-relaxed space-y-6 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p>
            I am <span className="text-white font-semibold">Sogki</span>, a software engineer dedicated to crafting
            digital experiences that blend <span className="text-purple-300">precision</span>,
            <span className="text-purple-300"> passion</span>, and <span className="text-purple-300">Japanese aesthetics</span>.
          </p>
          <p>
            From interactive applications to thoughtful design systems, I focus on building
            projects that embody simplicity, intentionality, and a sense of cosmic wonder.
          </p>
          <p>
            I believe that <span className="italic">美しさは簡潔にあり</span> — beauty lies in simplicity,
            and that every pixel and line of code should serve a purpose.
          </p>
          <p>
            Let’s create something meaningful together that leaves a subtle yet impactful footprint on the digital universe.
          </p>
        </motion.div>

        {/* Starmap Button */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <a
            href="https://constellation.sogki.dev" // Replace with your starmap URL
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-slate-800 text-purple-300 text-lg font-medium rounded-full hover:bg-slate-700 hover:text-purple-200 transition-colors duration-300"
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              Explore My Starmap
            </motion.span>
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default About;