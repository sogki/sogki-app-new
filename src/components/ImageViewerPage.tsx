import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import {
  getMediaType,
  GRAPHIC_DESIGN_RESTORE_KEY,
  parseImageViewerPayload,
  toSogkiImageProxyUrl,
} from '../utils/imageLinks';

export const ImageViewerPage: React.FC = () => {
  const { imageLinks, startIndex } = useMemo(
    () => parseImageViewerPayload(window.location.search),
    []
  );

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [proxyFailures, setProxyFailures] = useState<Record<number, boolean>>({});
  const hasImages = imageLinks.length > 0;
  const canSlide = imageLinks.length > 1;

  const activeOriginalUrl = imageLinks[activeIndex];
  const activeMediaType = activeOriginalUrl ? getMediaType(activeOriginalUrl) : 'image';
  const activeProxyUrl =
    activeOriginalUrl && activeMediaType === 'image'
      ? toSogkiImageProxyUrl(activeOriginalUrl)
      : activeOriginalUrl ?? '';
  const useDirectUrl = Boolean(proxyFailures[activeIndex]);
  const activeDisplayUrl = useDirectUrl ? activeOriginalUrl : activeProxyUrl;

  const goPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? imageLinks.length - 1 : prev - 1));
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev === imageLinks.length - 1 ? 0 : prev + 1));
  };

  const goBack = () => {
    sessionStorage.setItem(GRAPHIC_DESIGN_RESTORE_KEY, '1');
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.history.pushState({}, '', '/graphic-design');
    window.dispatchEvent(new Event('app:navigate'));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasImages) return;
      if (event.key === 'ArrowLeft' && canSlide) {
        setActiveIndex((prev) => (prev === 0 ? imageLinks.length - 1 : prev - 1));
      }
      if (event.key === 'ArrowRight' && canSlide) {
        setActiveIndex((prev) => (prev === imageLinks.length - 1 ? 0 : prev + 1));
      }
      if (event.key === 'Escape') goBack();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasImages, canSlide, imageLinks.length]);

  return (
    <section className="relative min-h-screen z-20 px-4 sm:px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-3 py-2 bg-black/40"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {hasImages && (
            <span className="text-xs sm:text-sm text-gray-300 font-mono">
              Item {activeIndex + 1} / {imageLinks.length}
            </span>
          )}
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 min-h-[55vh] sm:min-h-[70vh] flex items-center justify-center">
          {hasImages ? (
            <>
              {activeMediaType === 'video' ? (
                <video
                  src={activeDisplayUrl}
                  className="w-full h-full object-contain max-h-[80vh]"
                  muted
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={activeDisplayUrl}
                  alt={`Viewer image ${activeIndex + 1}`}
                  className="w-full h-full object-contain max-h-[80vh]"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (!proxyFailures[activeIndex]) {
                      setProxyFailures((prev) => ({ ...prev, [activeIndex]: true }));
                    }
                  }}
                />
              )}

              {canSlide && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center px-6">
              <p className="text-white font-mono text-lg mb-2">No image payload found</p>
              <p className="text-gray-400 text-sm">
                Return to Graphic Design and open an item using &quot;Open current image&quot;.
              </p>
            </div>
          )}
        </div>

        {hasImages && (
          <div className="mt-4 flex justify-end">
            <a
              href={activeOriginalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs sm:text-sm text-purple-300 hover:text-purple-200"
            >
              Open original URL
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
