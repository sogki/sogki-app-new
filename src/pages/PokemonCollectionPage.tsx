import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { PokemonCollection } from '../components/PokemonCollection';

export function PokemonCollectionPage() {
  return (
    <div className="relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-mono text-purple-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} className="shrink-0" aria-hidden />
            <span>Back to home</span>
            <span className="text-purple-400/80 text-xs">ホームへ</span>
          </Link>
        </motion.div>
      </div>
      <PokemonCollection isStandalonePage />
    </div>
  );
}
