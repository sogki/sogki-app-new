import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Code, Rocket, Award, Clock, Globe } from 'lucide-react';
import ShinyText from './ShinyText';

interface TimelineEvent {
  year: string;
  title: string;
  titleJp: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status?: 'completed' | 'in-progress';
  branch?: 'left' | 'right' | 'center';
}

const events: TimelineEvent[] = [
  {
    year: '2025',
    title: 'Binderly TCG',
    titleJp: 'Binderly TCG',
    description: 'Developing a comprehensive Pokemon card collection platform with real-time pricing, market insights, and community features. Currently in active development.',
    icon: <Award size={20} />,
    color: 'from-blue-500 to-cyan-500',
    status: 'in-progress',
    branch: 'right'
  },
  {
    year: '2025',
    title: 'RankTheGlobe',
    titleJp: '地球儀をランク付けする',
    description: 'Full-Stack Software Engineer role. Interactive crowd-source consumer rankings and ratings platform. Built with React, React Native, Next.js, and PostgreSQL.',
    icon: <Globe size={20} />,
    color: 'from-cyan-500 to-teal-500',
    status: 'completed',
    branch: 'left'
  },
  {
    year: '2025',
    title: 'Profiles After Dark',
    titleJp: 'プロフィールアフターダーク',
    description: 'Created an aesthetic profile database serving 200+ users. Built with Next.js, PostgreSQL, and modern design principles.',
    icon: <Code size={20} />,
    color: 'from-pink-500 to-rose-500',
    status: 'completed',
    branch: 'right'
  },
  {
    year: '2025',
    title: 'BLXR Platform',
    titleJp: 'BLXRプラットフォーム',
    description: 'Building a next-generation developer platform for modular backends. Features innovative DSL system and zero-config type generation. In development.',
    icon: <Rocket size={20} />,
    color: 'from-purple-500 to-indigo-500',
    status: 'in-progress',
    branch: 'left'
  },
  {
    year: '2023',
    title: 'Full-Stack Journey',
    titleJp: 'フルスタックの旅',
    description: 'Expanded expertise across the entire stack, mastering React, Node.js, databases, and cloud infrastructure.',
    icon: <Code size={20} />,
    color: 'from-green-500 to-emerald-500',
    status: 'completed',
    branch: 'center'
  },
  {
    year: '2020',
    title: 'Started Development',
    titleJp: '開発を開始',
    description: 'Began my journey as a software engineer, focusing on creating beautiful, functional digital experiences.',
    icon: <Calendar size={20} />,
    color: 'from-yellow-500 to-orange-500',
    status: 'completed',
    branch: 'center'
  }
];

export const Timeline: React.FC = () => {
  return (
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4 font-mono">
            <ShinyText text="Journey" speed={3} />
          </h2>
          <p className="text-purple-300 text-lg mb-2">旅路</p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A timeline of milestones, projects, and growth in my development journey
          </p>
        </motion.div>

        {/* Tree Timeline */}
        <div className="relative">
          {/* Main Trunk - Vertical Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-500 via-green-500 via-purple-500 to-blue-500 transform -translate-x-1/2 hidden md:block" />

          <div className="space-y-16 md:space-y-20">
            {events.map((event, index) => {
              const isLeft = event.branch === 'left';
              const isRight = event.branch === 'right';
              const isCenter = event.branch === 'center' || (!isLeft && !isRight);

              return (
                <motion.div
                  key={`${event.year}-${event.title}`}
                  className="relative"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                >
                  {/* Branch Line (horizontal) */}
                  {!isCenter && (
                    <div className={`absolute top-1/2 ${isLeft ? 'right-1/2' : 'left-1/2'} w-1/4 h-0.5 bg-gradient-to-r ${isLeft ? 'from-purple-500 to-transparent' : 'from-transparent to-blue-500'} hidden md:block`} />
                  )}

                  {/* Timeline Node - Using grid for proper centering */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative">
                    {/* Left Branch Card */}
                    {isLeft ? (
                      <div className="md:col-span-5 md:pr-8 md:text-right order-1 md:order-1">
                        <motion.div
                          className="bg-black border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-200 group relative"
                          whileHover={{ scale: 1.02, x: -8 }}
                        >
                          {/* Status Badge */}
                          <div className="flex items-center gap-2 mb-3 md:justify-end">
                            {event.status === 'in-progress' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                                <Clock size={12} />
                                In Progress
                              </span>
                            )}
                            {event.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                Completed
                              </span>
                            )}
                          </div>

                          {/* Year Badge */}
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${event.color} text-white text-sm font-semibold mb-4`}>
                            {event.icon}
                            <span>{event.year}</span>
                          </div>

                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors font-mono">
                            {event.title}
                          </h3>
                          <p className="text-sm text-purple-300 mb-3">{event.titleJp}</p>
                          <p className="text-gray-300 leading-relaxed text-sm">
                            {event.description}
                          </p>

                          {/* Glow effect */}
                          <div className={`absolute -inset-1 bg-gradient-to-r ${event.color} rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`} />
                        </motion.div>
                      </div>
                    ) : (
                      <div className="md:col-span-5 order-1 md:order-1"></div>
                    )}

                    {/* Center Node - Always in the middle column */}
                    <div className="flex justify-center md:col-span-2 order-2 md:order-2 relative z-10">
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${event.color} shadow-lg relative`}>
                        <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                      </div>
                    </div>

                    {/* Right Branch Card */}
                    {isRight ? (
                      <div className="md:col-span-5 md:pl-8 md:text-left order-3 md:order-3">
                        <motion.div
                          className="bg-black border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-200 group relative"
                          whileHover={{ scale: 1.02, x: 8 }}
                        >
                          {/* Status Badge */}
                          <div className="flex items-center gap-2 mb-3">
                            {event.status === 'in-progress' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                                <Clock size={12} />
                                In Progress
                              </span>
                            )}
                            {event.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                Completed
                              </span>
                            )}
                          </div>

                          {/* Year Badge */}
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${event.color} text-white text-sm font-semibold mb-4`}>
                            {event.icon}
                            <span>{event.year}</span>
                          </div>

                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors font-mono">
                            {event.title}
                          </h3>
                          <p className="text-sm text-purple-300 mb-3">{event.titleJp}</p>
                          <p className="text-gray-300 leading-relaxed text-sm">
                            {event.description}
                          </p>

                          {/* Glow effect */}
                          <div className={`absolute -inset-1 bg-gradient-to-r ${event.color} rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`} />
                        </motion.div>
                      </div>
                    ) : !isCenter ? (
                      <div className="md:col-span-5 order-3 md:order-3"></div>
                    ) : null}

                    {/* Center Card - Spans both sides */}
                    {isCenter && (
                      <div className="md:col-span-10 md:col-start-2 md:text-center order-3 md:order-3">
                        <motion.div
                          className="bg-black border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-200 group relative"
                          whileHover={{ scale: 1.02 }}
                        >
                          {/* Status Badge */}
                          <div className="flex items-center justify-center gap-2 mb-3">
                            {event.status === 'in-progress' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                                <Clock size={12} />
                                In Progress
                              </span>
                            )}
                            {event.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                Completed
                              </span>
                            )}
                          </div>

                          {/* Year Badge */}
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${event.color} text-white text-sm font-semibold mb-4`}>
                            {event.icon}
                            <span>{event.year}</span>
                          </div>

                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors font-mono">
                            {event.title}
                          </h3>
                          <p className="text-sm text-purple-300 mb-3">{event.titleJp}</p>
                          <p className="text-gray-300 leading-relaxed text-sm">
                            {event.description}
                          </p>

                          {/* Glow effect */}
                          <div className={`absolute -inset-1 bg-gradient-to-r ${event.color} rounded-xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`} />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
