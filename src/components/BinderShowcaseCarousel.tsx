import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BinderShowcaseImage } from '../lib/siteData';
import { smoothEase } from '../lib/motionPresets';

type BinderShowcaseCarouselProps = {
  images: BinderShowcaseImage[];
  alt: string;
};

export const BinderShowcaseCarousel: React.FC<BinderShowcaseCarouselProps> = ({ images, alt }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = images.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = images[safeIndex];

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 5500);
    return () => window.clearInterval(t);
  }, [count, paused]);

  const imageIds = useMemo(() => images.map((i) => i.id).join(','), [images]);
  useEffect(() => {
    setIndex(0);
  }, [imageIds]);

  if (count === 0) return null;

  if (count === 1 && current) {
    return (
      <div className="rounded-xl overflow-hidden border border-white/15 bg-black/40 aspect-[4/3] sm:aspect-[16/10] max-h-[420px] mx-auto">
        <img src={current.public_url} alt={alt} className="w-full h-full object-contain bg-black/60" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-white/15 bg-black/40 aspect-[4/3] sm:aspect-[16/10] max-h-[420px] mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {current && (
          <motion.img
            key={current.id}
            src={current.public_url}
            alt={alt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain bg-black/60"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: smoothEase }}
          />
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 border border-white/15 text-white/90 hover:bg-black/70 hover:text-white transition-colors z-10"
        aria-label="Previous image"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 border border-white/15 text-white/90 hover:bg-black/70 hover:text-white transition-colors z-10"
        aria-label="Next image"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === safeIndex ? 'w-6 bg-fuchsia-400' : 'w-2 bg-white/35 hover:bg-white/55'
            }`}
            aria-label={`Image ${i + 1} of ${count}`}
            aria-current={i === safeIndex}
          />
        ))}
      </div>
    </div>
  );
};
