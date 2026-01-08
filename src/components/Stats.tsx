import React, { useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { Code2, Users, Rocket, Award } from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  labelJp: string;
  color: string;
}

const stats: StatItem[] = [
  {
    icon: <Code2 size={32} />,
    value: 10,
    suffix: '+',
    label: 'Projects Built',
    labelJp: '構築されたプロジェクト',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: <Users size={32} />,
    value: 200,
    suffix: '+',
    label: 'Users Served',
    labelJp: 'サービス提供ユーザー',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: <Rocket size={32} />,
    value: 4,
    suffix: '+',
    label: 'Years Coding',
    labelJp: '年のコーディング',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: <Award size={32} />,
    value: 100,
    suffix: '%',
    label: 'Client Satisfaction',
    labelJp: 'クライアント満足度',
    color: 'from-yellow-500 to-orange-500'
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

export const Stats: React.FC = () => {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white font-mono">
            By The Numbers
          </h2>
          <p className="text-purple-300 text-lg">数字で見る実績</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="relative group"
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.05 }}
            >
              {/* Glow effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${stat.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
              
              <div className="relative bg-black border border-white/10 rounded-2xl p-6 md:p-8 text-center backdrop-blur-sm">
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${stat.color} mb-4`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>

                {/* Number */}
                <div className="mb-2">
                  <span className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </span>
                </div>

                {/* Label */}
                <div className="text-sm md:text-base text-gray-300 font-medium mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-purple-300">
                  {stat.labelJp}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
