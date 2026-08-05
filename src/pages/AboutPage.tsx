import { Timeline } from '../components/Timeline';
import { TechStack } from '../components/TechStack';
import ShinyText from '../components/ShinyText';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="relative min-h-screen pt-24">
      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-purple-300"
        >
          <ArrowLeft size={16} />
          Back home
        </Link>
        <motion.header
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-mono text-4xl font-bold sm:text-5xl">
            <ShinyText text="About" speed={3} />
          </h1>
          <p className="mt-2 text-purple-300">私について</p>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Journey, stack, and the path behind the work.
          </p>
        </motion.header>
      </div>
      <Timeline />
      <TechStack />
    </div>
  );
}
