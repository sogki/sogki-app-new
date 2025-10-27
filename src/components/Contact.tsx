import React from 'react';
import { motion } from 'framer-motion';
import  ShinyText  from './ShinyText';
import { MessageCircle } from 'lucide-react';

export const Contact: React.FC = () => {
  return (
    <div className="relative py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Section Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <ShinyText text="Get in touch" speed={3} />
          </h2>
          <p className="text-purple-300 text-lg mb-4">連絡を取る</p>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Ready to collaborate on something extraordinary? Reach out to me on Discord for quick responses and cosmic conversations.
          </p>
        </motion.div>
        
        {/* Discord Contact */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className="p-8 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-white/10 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 max-w-md">
            <MessageCircle className="text-purple-400 mx-auto mb-4" size={48} />
            <h3 className="text-white font-semibold mb-3 text-xl">Discord</h3>
            <p className="text-gray-300 text-lg mb-2">@sogki</p>
            <p className="text-purple-300 text-sm">ディスコード</p>
            <p className="text-gray-400 text-sm mt-3">Usually online and ready to chat about projects, tech, or anything cosmic!</p>
          </div>
        </motion.div>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <a
            href="https://discord.com/users/sogki"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
          >
            <MessageCircle size={20} />
            Message on Discord
          </a>
        </motion.div>
      </div>
    </div>
  );
};