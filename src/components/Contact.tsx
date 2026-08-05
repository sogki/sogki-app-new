import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ShinyText from './ShinyText';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { useSiteData } from '../context/SiteDataContext';
import { getString } from '../lib/siteContent';
import { submitContactForm } from '../lib/contactForm';
import { sectionRevealTransition, sectionViewport, smoothEase } from '../lib/motionPresets';

export const Contact: React.FC = () => {
  const { siteContent } = useSiteData();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await submitContactForm({ name, email, subject, message, website });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={sectionRevealTransition}
          viewport={sectionViewport}
        >
          <h2 className="mb-4 font-mono text-5xl font-bold md:text-6xl">
            <ShinyText text={getString(siteContent, 'contact.section_title', 'Get in touch')} speed={3} />
          </h2>
          <p className="mb-4 text-lg text-purple-300">
            {getString(siteContent, 'contact.section_title_jp', '連絡を取る')}
          </p>
          <p className="mx-auto max-w-xl text-gray-400">
            {getString(
              siteContent,
              'contact.description',
              'Send a message — no need to open your email app. I usually reply within a day or two.'
            )}
          </p>
        </motion.div>

        <motion.div
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.08, ease: smoothEase }}
          viewport={sectionViewport}
        >
          {sent ? (
            <div className="py-8 text-center">
              <p className="font-mono text-lg text-white">Message sent.</p>
              <p className="mt-2 text-sm text-gray-400">Thanks — I&apos;ll get back to you soon.</p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 text-sm text-purple-300 hover:text-purple-200"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Name</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-purple-400/50"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-purple-400/50"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Subject (optional)</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-purple-400/50"
                  placeholder="Project inquiry, collaboration…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Message</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-purple-400/50"
                  placeholder="What would you like to work on?"
                />
              </div>
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 font-medium text-white transition hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {sending ? 'Sending…' : 'Send message'}
                </button>
                <a
                  href="https://discord.com/users/sogki"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-sm text-gray-400 transition hover:text-purple-300"
                >
                  <MessageCircle size={16} />
                  Or message on Discord ({getString(siteContent, 'contact.discord_handle', '@sogki')})
                </a>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};
