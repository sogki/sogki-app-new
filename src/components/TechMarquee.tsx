import { motion } from 'framer-motion';

const TECH_ITEMS = [
  'TypeScript',
  'React',
  'Next.js',
  'React Native',
  'Node.js',
  'PostgreSQL',
  'Supabase',
  'Tailwind CSS',
  'Framer Motion',
  'Rust',
  'REST APIs',
  'Vercel',
  'Git',
  'Figma',
  'Python',
  'MySQL',
];

export default function TechMarquee() {
  const items = [...TECH_ITEMS, ...TECH_ITEMS, ...TECH_ITEMS];

  return (
    <section className="relative overflow-hidden py-8" aria-label="Technologies I use">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#06060a] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#06060a] to-transparent" />

      <div className="flex animate-marquee gap-4">
        {items.map((tech, i) => (
          <motion.span
            key={`${tech}-${i}`}
            className="flex-shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-sm text-gray-300 backdrop-blur-sm transition hover:border-purple-400/40 hover:text-white"
            whileHover={{ scale: 1.05, y: -2 }}
          >
            {tech}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
