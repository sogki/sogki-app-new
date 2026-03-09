import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Loader2, Palette } from 'lucide-react';
import ShinyText from './ShinyText';
import {
  buildImageViewerPath,
  getMediaType,
  GRAPHIC_DESIGN_RESTORE_KEY,
  GRAPHIC_DESIGN_SCROLL_KEY,
  toSogkiImageProxyUrl,
} from '../utils/imageLinks';
import {
  fetchGraphicsDesignPortfolio,
  type ClientCollection,
  type GraphicAsset,
} from '../lib/graphicsDesignPortfolio';

const AssetCard: React.FC<{ asset: GraphicAsset; cardKey: string }> = ({ asset, cardKey }) => {
  const navigate = useNavigate();
  const mediaLinks = asset.media_urls ?? [];
  const proxyLinks = mediaLinks.map((link) =>
    getMediaType(link) === 'image' ? toSogkiImageProxyUrl(link) : link
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [proxyFailures, setProxyFailures] = useState<Record<number, boolean>>({});
  const hasMedia = mediaLinks.length > 0;
  const canSlide = mediaLinks.length > 1;
  const activeMediaType = hasMedia ? getMediaType(mediaLinks[activeImageIndex]) : 'image';
  const useDirectUrl = Boolean(proxyFailures[activeImageIndex]);
  const activeDisplayUrl = useDirectUrl ? mediaLinks[activeImageIndex] : proxyLinks[activeImageIndex];

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? mediaLinks.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev === mediaLinks.length - 1 ? 0 : prev + 1));
  };

  const openViewer = () => {
    sessionStorage.setItem(GRAPHIC_DESIGN_SCROLL_KEY, String(window.scrollY));
    sessionStorage.setItem(GRAPHIC_DESIGN_RESTORE_KEY, '1');
    navigate(buildImageViewerPath(mediaLinks, activeImageIndex));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const thumbnailClassName = asset.thumbnail_class_name ?? undefined;

  return (
    <article
      key={cardKey}
      className="mb-4 break-inside-avoid rounded-xl border border-white/10 bg-white/5 overflow-hidden"
    >
      {hasMedia ? (
        <div className="relative h-36 sm:h-44 bg-black/40">
          {activeMediaType === 'video' ? (
            <video
              src={activeDisplayUrl}
              className="h-full w-full object-cover"
              muted
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={activeDisplayUrl}
              alt={asset.title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => {
                if (!proxyFailures[activeImageIndex]) {
                  setProxyFailures((prev) => ({ ...prev, [activeImageIndex]: true }));
                }
              }}
            />
          )}

          {canSlide && (
            <>
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white"
              >
                <ChevronRight size={14} />
              </button>
              <div className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-md bg-black/70 text-gray-200 font-mono border border-white/20">
                {activeImageIndex + 1}/{mediaLinks.length}
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className={`h-24 sm:h-28 ${
            thumbnailClassName ?? 'bg-gradient-to-br from-purple-500/50 to-indigo-500/50'
          }`}
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white text-sm sm:text-base font-semibold">{asset.title}</h3>
          <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-purple-400/30 text-purple-300 bg-purple-500/10 font-mono">
            {asset.category}
          </span>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-3">{asset.description}</p>
        <div className="flex flex-wrap gap-2">
          {asset.tools.map((tool) => (
            <span
              key={`${cardKey}-${tool}`}
              className="text-[10px] sm:text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 font-mono"
            >
              {tool}
            </span>
          ))}
        </div>
        {hasMedia && (
          <button
            type="button"
            onClick={openViewer}
            className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 mt-3"
          >
            Open current media
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </article>
  );
};

export const GraphicDesignPortfolio: React.FC = () => {
  const [collections, setCollections] = useState<ClientCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGraphicsDesignPortfolio()
      .then((data) => {
        if (!cancelled) setCollections(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative min-h-screen pt-28 pb-16 px-4 sm:px-6 z-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-purple-300 text-sm tracking-widest mb-3">Graphic design showcase</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-4">
            <ShinyText text="Graphic Design Portfolio" speed={3} />
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-3xl mx-auto">
            Selected visual work organized by client. Open each client dropdown to explore assets in a masonry layout.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-purple-400 animate-spin" size={40} />
            <p className="text-gray-400">Loading portfolio...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 text-center">
            <p className="text-red-300 font-mono text-lg mb-2">Failed to load portfolio</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">
              Ensure the graphics_design_collections and graphics_design_assets tables exist and are seeded.
            </p>
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 sm:p-8 text-center">
            <p className="text-white font-mono text-lg mb-2">No graphic design showcases yet</p>
            <p className="text-gray-400 text-sm sm:text-base">
              Add entries in the Supabase graphics_design_collections and graphics_design_assets tables.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => (
              <details
                key={collection.id}
                className="group rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
              >
                <summary className="list-none cursor-pointer px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-3 sm:gap-4 hover:bg-white/5">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-purple-300">
                    <Palette size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white text-lg sm:text-xl font-semibold font-mono">{collection.client}</h2>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">{collection.summary}</p>
                  </div>
                  <ChevronDown
                    className="text-gray-400 transition-transform duration-150 group-open:rotate-180"
                    size={18}
                  />
                </summary>

                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <div className="columns-1 md:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
                    {collection.assets.map((asset) => (
                      <AssetCard
                        key={`${collection.id}-${asset.id}`}
                        cardKey={`${collection.id}-${asset.id}`}
                        asset={asset}
                      />
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
