import React from 'react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';
import { MessageCircle } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';
import { sectionRevealTransition, sectionViewport, smoothEase } from '../lib/motionPresets';

export const Contact: React.FC = () => {
  const { siteContent } = useSiteData();
  return (
    <div className="relative py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Section Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4 font-mono">
            <ShinyText text={getString(siteContent, 'contact.section_title', 'Get in touch')} speed={3} />
          </h2>
          <p className="text-purple-300 text-lg mb-4">{getString(siteContent, 'contact.section_title_jp', '連絡を取る')}</p>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {getString(siteContent, 'contact.description', 'Ready to collaborate on something extraordinary? Reach out to me on Discord for quick responses and cosmic conversations.')}
          </p>
        </motion.div>
        
        {/* Discord Contact */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.08, ease: smoothEase }}
          viewport={sectionViewport}
        >
          <div className="p-8 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all duration-150 hover:scale-[1.02] max-w-md">
            <MessageCircle className="text-purple-400 mx-auto mb-4" size={48} />
            <h3 className="text-white font-semibold mb-3 text-xl font-mono">Discord</h3>
            <p className="text-gray-300 text-lg mb-2">{getString(siteContent, 'contact.discord_handle', '@sogki')}</p>
            <p className="text-purple-300 text-sm">{getString(siteContent, 'contact.discord_label_jp', 'ディスコード')}</p>
            <p className="text-gray-400 text-sm mt-3">{getString(siteContent, 'contact.discord_bio', 'Usually online and ready to chat about projects, tech, or anything cosmic!')}</p>
          </div>
        </motion.div>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, delay: 0.12, ease: smoothEase }}
          viewport={sectionViewport}
        >
          <a
            href="https://discord.com/users/sogki"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-150 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25"
          >
            <MessageCircle size={20} />
            {getString(siteContent, 'contact.cta_label', 'Message on Discord')}
          </a>
        </motion.div>
      </div>
    </div>
  );
};