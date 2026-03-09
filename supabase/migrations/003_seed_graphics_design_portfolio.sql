-- ============================================
-- Seed Graphics Design Portfolio
-- ============================================
-- Run after 002_graphics_design_portfolio.sql
-- Uses bucket paths: graphics-design-portfolio/
-- Upload files from graphics-design-portfolio-upload/ first
-- ============================================

-- Clear existing seed (idempotent re-run)
DELETE FROM public.graphics_design_assets;
DELETE FROM public.graphics_design_collections;

-- Insert collections with sort_order, then assets
INSERT INTO public.graphics_design_collections (id, client, summary, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Sogki (myself)', 'A range of visuals for personal projects.', 1),
  ('a1000000-0000-0000-0000-000000000002', 'Genshin Inspired (Free to use)', 'A range of visuals for personal projects.', 2),
  ('a1000000-0000-0000-0000-000000000003', 'Anime Inspired (Free to use)', 'A range of visuals for personal projects.', 3),
  ('a1000000-0000-0000-0000-000000000004', 'Arc Raiders Companion', 'Brand visuals for the Arc Raiders Companion app, including logo, app icon, and promotional graphics.', 4),
  ('a1000000-0000-0000-0000-000000000005', '50andBad - Variety Twitch Streamer', 'Brand visuals and channel assets.', 5),
  ('a1000000-0000-0000-0000-000000000006', 'Streamers & Individuals', 'Brand visuals and assets for various streamers and individuals.', 6),
  ('a1000000-0000-0000-0000-000000000007', 'Game Inspired (Free to use)', 'A range of visuals for personal projects.', 7),
  ('a1000000-0000-0000-0000-000000000008', 'Org-inspired', 'A range of visuals for personal projects.', 8);

-- Sogki (myself)
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Umbreon x Japanese Sogki Banner', 'Social', 'A banner for my personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["01-sogki-myself/umbreon-x-japanese-sogki-banner.png"]', 1);

-- Genshin Inspired
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'Varesa Artwork', 'Social', 'Varesa Artwork for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["02-genshin-inspired/varesa-artwork.png"]', 1),
  ('a1000000-0000-0000-0000-000000000002', 'Flins Artwork', 'Social', 'Flins Artwork for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["02-genshin-inspired/flins-artwork.png"]', 2),
  ('a1000000-0000-0000-0000-000000000002', 'Columbina 1.0 Art', 'Social', 'Columbina Artwork for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["02-genshin-inspired/columbina-1-0-art.png"]', 3),
  ('a1000000-0000-0000-0000-000000000002', 'Columbina 2.0 Art', 'Social', 'Columbina Artwork for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["02-genshin-inspired/columbina-2-0-art.png"]', 4),
  ('a1000000-0000-0000-0000-000000000002', 'Columbina Portrait Art', 'Social', 'Columbina Artwork for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["02-genshin-inspired/columbina-portrait-art.png"]', 5);

-- Anime Inspired
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'Anime Girl Y2K Artwork', 'Social', 'A wallpaper for personal use.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["03-anime-inspired/anime-girl-y2k-artwork.jpg"]', 1),
  ('a1000000-0000-0000-0000-000000000003', 'Zero Two // 02 - Wallpaper', 'Social', 'A wallpaper for personal use.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["03-anime-inspired/zero-two-02-wallpaper.png"]', 2),
  ('a1000000-0000-0000-0000-000000000003', 'Fern x JDM Banner', 'Social', 'A banner for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["03-anime-inspired/fern-x-jdm-banner.png"]', 3),
  ('a1000000-0000-0000-0000-000000000003', 'Lunar Anime Banner', 'Social', 'A banner for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["03-anime-inspired/lunar-anime-banner.png"]', 4),
  ('a1000000-0000-0000-0000-000000000003', 'Umbreon Japanese Artwork', 'Social', 'An umbreon artwork for personal use.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["03-anime-inspired/umbreon-japanese-artwork.png"]', 5);

-- Arc Raiders Companion
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000004', 'Logo & App Icon', 'Social', 'Logo and app icon for the Arc Raiders Companion App.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["04-arc-raiders-companion/logo-app-icon.png"]', 1),
  ('a1000000-0000-0000-0000-000000000004', 'Arc Companion Promotion Graphic', 'Social', 'Promotional graphic for the Arc Raiders Companion.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["04-arc-raiders-companion/arc-companion-promotion-graphic.png"]', 2);

-- 50andBad
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000005', 'Twitch Banner', 'Social', 'A VALORANT inspired twitch banner for 50andBad, featuring Omen.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["05-50andbad/twitch-banner.jpg"]', 1),
  ('a1000000-0000-0000-0000-000000000005', 'Twitch Channel Panels', 'Social', 'Twitch panels for 50andBad, designed to match the channel branding & provide clear navigation.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["05-50andbad/twitch-channel-panels-about-me.png","05-50andbad/twitch-channel-panels-donate.png","05-50andbad/twitch-channel-panels-interact.png","05-50andbad/twitch-channel-panels-leaderboard.png","05-50andbad/twitch-channel-panels-recognise.png","05-50andbad/twitch-channel-panels-rules.png","05-50andbad/twitch-channel-panels-setup.png","05-50andbad/twitch-channel-panels-socials.png","05-50andbad/twitch-channel-panels-staff.png","05-50andbad/twitch-channel-panels-support.png"]', 2),
  ('a1000000-0000-0000-0000-000000000005', 'Twitch Banner', 'Social', 'A VALORANT inspired twitch banner for 50andBad, featuring Omen.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["05-50andbad/twitch-banner.jpg"]', 3),
  ('a1000000-0000-0000-0000-000000000005', 'Twitch Scene Assets', 'Social', 'Scene assets for 50andBad''s Twitch channel - Starting, Brb, Ending Screens.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["05-50andbad/twitch-scene-assets-starting-soon.mp4","05-50andbad/twitch-scene-assets-brb-new.mp4","05-50andbad/twitch-scene-assets-stream-ending.mp4"]', 4),
  ('a1000000-0000-0000-0000-000000000005', '50s Little Helper - PFP', 'Social', 'A cute custom discord bot icon, designed for 50andBad.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["05-50andbad/50s-little-helper-pfp.png"]', 5),
  ('a1000000-0000-0000-0000-000000000005', '50s Little Helper - Bot Banner', 'Social', 'A cute custom discord bot banner, designed for 50andBad.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["05-50andbad/50s-little-helper-bot-banner.png"]', 6);

-- Streamers & Individuals
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000006', 'Cypathic - Twitch Banner', 'Social', 'A custom Twitch banner for Streamer Cypathic.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["06-streamers-individuals/cypathic-twitch-banner.png"]', 1),
  ('a1000000-0000-0000-0000-000000000006', 'missyuukime - Twitch Banner', 'Social', 'A custom Twitch banner for Streamer missyuukime', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["06-streamers-individuals/missyuukime-twitch-banner.png"]', 2),
  ('a1000000-0000-0000-0000-000000000006', 'COCONUTMAN03 - Twitch Banner', 'Social', 'A custom Twitch banner for individual coconutman03', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["06-streamers-individuals/coconutman03-twitch-banner.png"]', 3);

-- Game Inspired (Sage: source URL returned 400 - add valorant-agent-banner-sage.png manually if you have it)
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner - Fade', 'Social', 'A custom VALORANT agent banner for Fade.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["07-game-inspired/valorant-agent-banner-fade.png"]', 1),
  ('a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner - Omen', 'Social', 'A custom VALORANT agent banner for Omen.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["07-game-inspired/valorant-agent-banner-omen.png"]', 2),
  ('a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner - Sage', 'Social', 'A custom VALORANT agent banner for Sage.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["07-game-inspired/valorant-agent-banner-sage.png"]', 3),
  ('a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner - Harbor', 'Social', 'A custom VALORANT agent banner for Harbor.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["07-game-inspired/valorant-agent-banner-harbor.png"]', 4),
  ('a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner - Viper', 'Social', 'A custom VALORANT agent banner for Viper.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["07-game-inspired/valorant-agent-banner-viper.png"]', 5),
  ('a1000000-0000-0000-0000-000000000007', 'VALORANT Map Banner - Lotus', 'Social', 'A custom VALORANT map banner for Lotus.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["07-game-inspired/valorant-map-banner-lotus.png"]', 6);

-- Org-inspired
INSERT INTO public.graphics_design_assets (collection_id, title, category, description, tools, thumbnail_class_name, media_urls, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000008', 'Senintels Inspired Banner', 'Social', 'A banner for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["08-org-inspired/senintels-inspired-banner.jpg"]', 1),
  ('a1000000-0000-0000-0000-000000000008', 'Slipknot Inspired Banner', 'Social', 'A banner for personal social media.', ARRAY['Photoshop'], 'bg-gradient-to-br from-purple-500/60 to-indigo-500/60', '["08-org-inspired/slipknot-inspired-banner.png"]', 2);
