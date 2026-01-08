import React, { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import ShinyText from './ShinyText';
import { Code2, Users, Rocket, Award } from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  labelJp: string;
  color: string;
  maxValue: number; // For graph scaling
}

const stats: StatItem[] = [
  {
    icon: <Code2 size={24} />,
    value: 10,
    suffix: '+',
    label: 'Projects Built',
    labelJp: '構築されたプロジェクト',
    color: 'from-purple-500 to-indigo-500',
    maxValue: 15
  },
  {
    icon: <Users size={24} />,
    value: 200,
    suffix: '+',
    label: 'Users Served',
    labelJp: 'サービス提供ユーザー',
    color: 'from-purple-500 to-indigo-500',
    maxValue: 250
  },
  {
    icon: <Rocket size={24} />,
    value: 4,
    suffix: '+',
    label: 'Years Coding',
    labelJp: '年のコーディング',
    color: 'from-purple-500 to-indigo-500',
    maxValue: 5
  },
  {
    icon: <Award size={24} />,
    value: 100,
    suffix: '%',
    label: 'Client Satisfaction',
    labelJp: 'クライアント満足度',
    color: 'from-purple-500 to-indigo-500',
    maxValue: 100
  }
];

const AnimatedCounter: React.FC<{ value: number; suffix?: string; duration?: number }> = ({ 
  value, 
  suffix = '', 
  duration = 2 
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, isInView, value]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        const rounded = Math.floor(latest);
        ref.current.textContent = `${rounded}${suffix}`;
      }
    });
    return () => unsubscribe();
  }, [springValue, suffix]);

  return <span ref={ref}>0{suffix}</span>;
};

export const About: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-transparent" ref={containerRef}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-mono">
            <ShinyText text="About Me" speed={3} />
          </h2>
          <p className="text-purple-300 text-base sm:text-lg">私について</p>
        </motion.div>

        {/* Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* About Content - Left Side */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div className="text-gray-300 text-base sm:text-lg leading-relaxed space-y-4">
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
                Let's create something meaningful together that leaves a subtle yet impactful footprint on the digital universe.
              </p>
            </div>

            {/* Starmap Button */}
            <motion.div
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <a
                href="https://constellation.sogki.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-800 text-purple-300 text-sm sm:text-base font-medium rounded-full hover:bg-slate-700 hover:text-purple-200 transition-colors duration-150"
              >
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  Explore My Starmap
                </motion.span>
              </a>
            </motion.div>
          </motion.div>

          {/* Stats Graph - Right Side */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="mb-6">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white font-mono">
                By The Numbers
              </h3>
              <p className="text-purple-300 text-sm sm:text-base">数字で見る実績</p>
            </div>

            {/* Graph Container */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 sm:p-6 space-y-6">
              {stats.map((stat, index) => {
                const percentage = (stat.value / stat.maxValue) * 100;
                
                return (
                  <motion.div
                    key={stat.label}
                    className="space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    {/* Label and Value */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color} text-white`}>
                          {stat.icon}
                        </div>
                        <div>
                          <div className="text-white text-sm sm:text-base font-medium font-mono">
                            {stat.label}
                          </div>
                          <div className="text-purple-300 text-xs">
                            {stat.labelJp}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent font-mono`}>
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="relative h-3 sm:h-4 bg-white/5 rounded-full overflow-hidden">
                      {/* Background */}
                      <div className="absolute inset-0 bg-white/5 rounded-full" />
                      
                      {/* Animated Bar */}
                      <motion.div
                        className={`h-full bg-gradient-to-r ${stat.color} rounded-full relative overflow-hidden`}
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
                        transition={{ 
                          duration: 1.5, 
                          delay: 0.5 + (index * 0.1),
                          ease: "easeOut"
                        }}
                      >
                        {/* Shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{
                            x: ['-100%', '200%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 1,
                            ease: "linear"
                          }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
