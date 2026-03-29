import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BinderShowcaseImage } from '../lib/siteData';
import { smoothEase } from '../lib/motionPresets';

type BinderShowcaseCarouselProps = {
  images: BinderShowcaseImage[];
  alt: string;
};

const MAX_MAIN_H = 'min(72vh, 520px)';

export const BinderShowcaseCarousel: React.FC<BinderShowcaseCarouselProps> = ({ images, alt }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = images.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = images[safeIndex];
  const prevIdx = count > 1 ? (safeIndex - 1 + count) % count : 0;
  const nextIdx = count > 1 ? (safeIndex + 1) % count : 0;

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
      <div className="relative w-full max-w-lg mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/25 p-3 sm:p-4">
        <img
          src={current.public_url}
          alt={alt}
          className="w-full rounded-xl object-contain mx-auto"
          style={{ maxHeight: MAX_MAIN_H }}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none outline-none rounded-2xl focus-visible:ring-2 focus-visible:ring-fuchsia-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(1);
        }
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label={alt}
      tabIndex={0}
    >
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] via-violet-950/20 to-black/35 px-2 py-6 sm:px-4 sm:py-8 overflow-hidden">
        <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6">
          {/* Previous slide — dimmed peek */}
          <button
            type="button"
            onClick={() => go(-1)}
            className="group relative shrink-0 w-[18%] sm:w-[20%] max-w-[140px] min-w-[64px] rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/30 transition-transform duration-300 hover:scale-[1.03] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
            aria-label="Previous image"
          >
            <img
              src={images[prevIdx].public_url}
              alt=""
              className="w-full aspect-[3/4] object-cover object-center scale-110 opacity-[0.38] group-hover:opacity-[0.52] transition-opacity duration-300"
              style={{ filter: 'brightness(0.75) saturate(0.85)' }}
              loading="lazy"
            />
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/55 via-black/25 to-transparent"
              aria-hidden
            />
            <span
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none drop-shadow-md"
              aria-hidden
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </span>
          </button>

          {/* Main slide */}
          <div className="relative z-[1] flex-1 min-w-0 flex justify-center items-center max-w-[min(100%,440px)]">
            <AnimatePresence mode="wait" initial={false}>
              {current && (
                <motion.img
                  key={current.id}
                  src={current.public_url}
                  alt={alt}
                  loading="lazy"
                  className="w-full rounded-xl object-contain shadow-2xl shadow-black/40 ring-1 ring-white/15"
                  style={{ maxHeight: MAX_MAIN_H }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4, ease: smoothEase }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Next slide — dimmed peek */}
          <button
            type="button"
            onClick={() => go(1)}
            className="group relative shrink-0 w-[18%] sm:w-[20%] max-w-[140px] min-w-[64px] rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/30 transition-transform duration-300 hover:scale-[1.03] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
            aria-label="Next image"
          >
            <img
              src={images[nextIdx].public_url}
              alt=""
              className="w-full aspect-[3/4] object-cover object-center scale-110 opacity-[0.38] group-hover:opacity-[0.52] transition-opacity duration-300"
              style={{ filter: 'brightness(0.75) saturate(0.85)' }}
              loading="lazy"
            />
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-l from-black/55 via-black/25 to-transparent"
              aria-hidden
            />
            <span
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none drop-shadow-md"
              aria-hidden
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <div className="mt-5 flex justify-center gap-2 z-10 relative">
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
    </div>
  );
};
