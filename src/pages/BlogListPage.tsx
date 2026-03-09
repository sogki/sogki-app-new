import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchBlogs, type Blog } from '../lib/siteData';
import ShinyText from '../components/ShinyText';
import { ArrowRight, Calendar, FileText } from 'lucide-react';

export function BlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs()
      .then(setBlogs)
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="relative py-24 px-4 sm:px-6 min-h-[60vh]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-400">Loading posts...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 font-mono">
            <ShinyText text="Blog" speed={3} />
          </h1>
          <p className="text-purple-300 text-base sm:text-lg mb-2">ブログ</p>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto px-4">
            Thoughts on engineering, design, and building products.
          </p>
        </motion.div>

        {blogs.length === 0 ? (
          <motion.div
            className="text-center py-16 rounded-xl border border-white/10 bg-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FileText className="mx-auto text-gray-500 mb-4" size={48} />
            <p className="text-gray-400">No posts yet. Check back soon.</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {blogs.map((blog, i) => (
              <motion.article
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  to={`/blog/${blog.slug}`}
                  className="block group p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {blog.preview_image_url && (
                      <div className="sm:w-40 sm:shrink-0 rounded-lg overflow-hidden border border-white/10">
                        <img
                          src={blog.preview_image_url}
                          alt=""
                          className="w-full h-28 object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-white font-mono group-hover:text-purple-300 transition-colors">
                        {blog.title}
                      </h2>
                      {blog.excerpt && (
                        <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                          {blog.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(blog.published_at!).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      className="shrink-0 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all"
                      size={20}
                    />
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
