import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchBlogBySlug } from '../lib/siteData';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

function readingTime(content: string): number {
  const wpm = 200;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Awaited<ReturnType<typeof fetchBlogBySlug>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchBlogBySlug(slug)
      .then(setBlog)
      .catch(() => setBlog(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <section className="relative py-24 px-4 sm:px-6 min-h-[60vh]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </section>
    );
  }

  if (!blog) {
    return (
      <section className="relative py-24 px-4 sm:px-6 min-h-[60vh]">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Post not found</h1>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to blog
          </Link>
        </div>
      </section>
    );
  }

  const mins = readingTime(blog.content);

  return (
    <article className="relative py-12 sm:py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            Back to blog
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-mono leading-tight mb-4">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(blog.published_at!).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {mins} min read
              </span>
            </div>
          </header>

          {blog.preview_image_url && (
            <div className="mb-10 rounded-xl overflow-hidden border border-white/10">
              <img
                src={blog.preview_image_url}
                alt=""
                className="w-full h-auto"
              />
            </div>
          )}

          <div className="blog-content prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{blog.content}</ReactMarkdown>
          </div>
        </motion.div>
      </div>
    </article>
  );
}
