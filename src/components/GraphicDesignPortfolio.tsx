import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Palette } from 'lucide-react';
import ShinyText from './ShinyText';
import {
  buildImageViewerPath,
  getMediaType,
  GRAPHIC_DESIGN_RESTORE_KEY,
  GRAPHIC_DESIGN_SCROLL_KEY,
  toSogkiImageProxyUrl,
} from '../utils/imageLinks';

type GraphicAsset = {
  title: string;
  category: string;
  description: string;
  tools: string[];
  thumbnailClassName?: string;
  link?: string | string[];
};

type ClientCollection = {
  client: string;
  summary: string;
  assets: GraphicAsset[];
};

const AssetCard: React.FC<{ asset: GraphicAsset; cardKey: string }> = ({ asset, cardKey }) => {
  const mediaLinks = Array.isArray(asset.link) ? asset.link : asset.link ? [asset.link] : [];
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
    window.history.pushState({}, '', buildImageViewerPath(mediaLinks, activeImageIndex));
    window.dispatchEvent(new Event('app:navigate'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

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
            asset.thumbnailClassName ?? 'bg-gradient-to-br from-purple-500/50 to-indigo-500/50'
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
  const graphicDesignCollections: ClientCollection[] = [
    {
      client: 'Sogki (myself)',
      summary: 'A range of visuals for personal projects.',
      assets: [
        {
          title: 'Umbreon x Japanese Sogki Banner',
          category: 'Social',
          description: 'A banner for my personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772293041865-0-73pk0emve8v.png'
          ]
        }
      ]
    },
    {
      client: 'Genshin Inspired (Free to use)',
      summary: 'A range of visuals for personal projects.',
      assets: [
        {
          title: 'Varesa Artwork',
          category: 'Social',
          description: 'Varesa Artwork for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295510249-0-gvpg4imtrrh.png'
          ]
        },
         {
          title: 'Flins Artwork',
          category: 'Social',
          description: 'Flins Artwork for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295451509-0-7gi92czcv5o.png'
          ]
        },
        {
          title: 'Columbina 1.0 Art',
          category: 'Social',
          description: 'Columbina Artwork for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295336659-0-hnpnix8372j.png'
          ]
        },
        {
          title: 'Columbina 2.0 Art',
          category: 'Social',
          description: 'Columbina Artwork for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295377462-0-jwfc0o6yx1.png'
          ]
        },
        {
          title: 'Columbina Portrait Art',
          category: 'Social',
          description: 'Columbina Artwork for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295408769-0-bbqhq33t5cq.png'
          ]
        }
      ]
    },
    { 
      client: 'Anime Inspired (Free to use)',
      summary: 'A range of visuals for personal projects.',
      assets: [
        {
          title: 'Anime Girl Y2K Artwork',
          category: 'Social',
          description: 'A wallpaper for personal use.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295796225-0-c1tuiyqgklt.jpg'
          ]
        },
        {
          title: 'Zero Two // 02 - Wallpaper',
          category: 'Social',
          description: 'A wallpaper for personal use.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294563075-0-nt7dc4qb4ys.png'
          ]
        },
        {
          title: 'Fern x JDM Banner',
          category: 'Social',
          description: 'A banner for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294624750-0-bdc4tt65fxh.png'
          ]
        },
        {
          title: 'Lunar Anime Banner',
          category: 'Social',
          description: 'A banner for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294711635-0-vk8vi5btp7.png'
          ]
        },
        {
          title: 'Umbreon Japanese Artwork',
          category: 'Social',
          description: 'An umbreon artwork for personal use.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295577596-0-rflf3u7qj8k.png'
          ]
        },
      ]
    },
    {
      client: 'Arc Raiders Companion',
      summary: 'Brand visuals for the Arc Raiders Companion app, including logo, app icon, and promotional graphics.',
      assets: [
        {
          title: 'Logo & App Icon',
          category: 'Social',
          description: 'Logo and app icon for the Arc Raiders Companion App.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/media-library/1772292924530-0-06o8sgt2vodv.png'
          ]
        },
        {
          title: 'Arc Companion Promotion Graphic',
          category: 'Social',
          description: 'Promotional graphic for the Arc Raiders Companion.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/media-library/arc-raiders-companion-installer-image.png'
          ]
        }
      ]
    },
    {
      client: '50andBad - Variety Twitch Streamer',
      summary: 'Brand visuals and channel assets.',
      assets: [
        {
          title: 'Twitch Banner',
          category: 'Social',
          description: 'A VALORANT inspired twitch banner for 50andBad, featuring Omen.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/fiddy-fam-banner-nobaruser.jpg'
          ]
        },
        {
          title: 'Twitch Channel Panels',
          category: 'Social',
          description: 'Twitch panels for 50andBad, designed to match the channel branding & provide clear navigation.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-about-me.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-donate.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-interact.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-leaderboard.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-recognise.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-rules.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-setup.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-socials.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-staff.png',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-support.png'
          ]
        },
        {
          title: 'Twitch Banner',
          category: 'Social',
          description: 'A VALORANT inspired twitch banner for 50andBad, featuring Omen.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/fiddy-fam-banner-nobaruser.jpg'
          ]
        },
        {
          title: 'Twitch Scene Assets',
          category: 'Social',
          description: 'Scene assets for 50andBad\'s Twitch channel - Starting, Brb, Ending Screens.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-starting-soon.mp4',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-brb-new.mp4',
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-stream-ending.mp4'
          ]
        },
         {
          title: '50s Little Helper - PFP',
          category: 'Social',
          description: 'A cute custom discord bot icon, designed for 50andBad.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/1772293376585-0-6jsr3h1n2hr.png'
          ]
        },
        {
          title: '50s Little Helper - Bot Banner',
          category: 'Social',
          description: 'A cute custom discord bot banner, designed for 50andBad.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/1772293378859-0-qstqfuuasxk.png'
          ]
        },
      ]
    },
    {
      client: 'Streamers & Individuals',
      summary: 'Brand visuals and assets for various streamers and individuals.',
      assets: [
        {
          title: 'Cypathic - Twitch Banner',
          category: 'Social',
          description: 'A custom Twitch banner for Streamer Cypathic.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772293819704-0-qmszcj1jz.png'
          ]
        },
        {
          title: 'missyuukime - Twitch Banner',
          category: 'Social',
          description: 'A custom Twitch banner for Streamer missyuukime',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294789702-0-43nzzfdvdgz.png'
          ]
        },
        {
          title: 'COCONUTMAN03 - Twitch Banner',
          category: 'Social',
          description: 'A custom Twitch banner for individual coconutman03',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295004432-0-1z3ewt82fa1.png'
          ]
        }
      ]
    },
     {
      client: 'Game Inspired (Free to use)',
      summary: 'A range of visuals for personal projects.',
      assets: [
        {
          title: 'VALORANT Agent Banner - Fade ',
          category: 'Social',
          description: 'A custom VALORANT agent banner for Fade.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294059902-0-dhh1whsga7j.png'
          ]
        },
        {
          title: 'VALORANT Agent Banner - Omen ',
          category: 'Social',
          description: 'A custom VALORANT agent banner for Omen.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294066778-0-qf489lddkz8.png'
          ]
        },
        {
          title: 'VALORANT Agent Banner - Sage ',
          category: 'Social',
          description: 'A custom VALORANT agent banner for Sage.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294072013-0-frq7kqe40ce.png'
          ]
        },
        {
          title: 'VALORANT Agent Banner - Harbor ',
          category: 'Social',
          description: 'A custom VALORANT agent banner for Harbor.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294063408-0-2bu9ca7b8av.png'
          ]
        },
        {
          title: 'VALORANT Agent Banner - Viper ',
          category: 'Social',
          description: 'A custom VALORANT agent banner for Viper.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294076405-0-xd31f30flj.png'
          ]
        },
        {
          title: 'VALORANT Map Banner - Lotus  ',
          category: 'Social',
          description: 'A custom VALORANT map banner for Lotus.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294240364-0-tip8fu7du7g.png'
          ]
        }
      ]
    },
    {
      client: 'Org-inspired',
      summary: 'A range of visuals for personal projects.',
      assets: [
        {
          title: 'Senintels Inspired Banner',
          category: 'Social',
          description: 'A banner for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294376822-0-k5kciprkasc.jpg'
          ]
        },
        {
          title: 'Slipknot Inspired Banner',
          category: 'Social',
          description: 'A banner for personal social media.',
          tools: ['Photoshop'],
          thumbnailClassName: 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60',
          link: [
            'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294460562-0-j81gjj4hzn.png'
          ]
        }
      ]
    },
  ];

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

        {graphicDesignCollections.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 sm:p-8 text-center">
            <p className="text-white font-mono text-lg mb-2">No graphic design showcases yet</p>
            <p className="text-gray-400 text-sm sm:text-base">
              Add entries in `src/components/GraphicDesignPortfolio.tsx` inside `graphicDesignCollections`.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {graphicDesignCollections.map((collection) => (
              <details
                key={collection.client}
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
                        key={`${collection.client}-${asset.title}`}
                        cardKey={`${collection.client}-${asset.title}`}
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
