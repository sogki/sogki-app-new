/**
 * Downloads all graphic design portfolio assets and saves them with clean names
 * in a folder structure ready for drag-and-drop into Supabase Storage.
 *
 * Run: node scripts/download-graphics-portfolio.js
 * Output: graphics-design-portfolio-upload/
 *
 * Then drag the contents of graphics-design-portfolio-upload into your
 * graphics-design-portfolio bucket in Supabase Dashboard.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'graphics-design-portfolio-upload');

// Collection slug -> folder name
const COLLECTION_FOLDERS = {
  'a1000000-0000-0000-0000-000000000001': '01-sogki-myself',
  'a1000000-0000-0000-0000-000000000002': '02-genshin-inspired',
  'a1000000-0000-0000-0000-000000000003': '03-anime-inspired',
  'a1000000-0000-0000-0000-000000000004': '04-arc-raiders-companion',
  'a1000000-0000-0000-0000-000000000005': '05-50andbad',
  'a1000000-0000-0000-0000-000000000006': '06-streamers-individuals',
  'a1000000-0000-0000-0000-000000000007': '07-game-inspired',
  'a1000000-0000-0000-0000-000000000008': '08-org-inspired',
};

// Each entry: [collectionId, assetTitle, mediaUrls[]]
const ASSETS = [
  ['a1000000-0000-0000-0000-000000000001', 'Umbreon x Japanese Sogki Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772293041865-0-73pk0emve8v.png']],
  ['a1000000-0000-0000-0000-000000000002', 'Varesa Artwork', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295510249-0-gvpg4imtrrh.png']],
  ['a1000000-0000-0000-0000-000000000002', 'Flins Artwork', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295451509-0-7gi92czcv5o.png']],
  ['a1000000-0000-0000-0000-000000000002', 'Columbina 1.0 Art', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295336659-0-hnpnix8372j.png']],
  ['a1000000-0000-0000-0000-000000000002', 'Columbina 2.0 Art', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295377462-0-jwfc0o6yx1.png']],
  ['a1000000-0000-0000-0000-000000000002', 'Columbina Portrait Art', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295408769-0-bbqhq33t5cq.png']],
  ['a1000000-0000-0000-0000-000000000003', 'Anime Girl Y2K Artwork', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295796225-0-c1tuiyqgklt.jpg']],
  ['a1000000-0000-0000-0000-000000000003', 'Zero Two 02 Wallpaper', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294563075-0-nt7dc4qb4ys.png']],
  ['a1000000-0000-0000-0000-000000000003', 'Fern x JDM Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294624750-0-bdc4tt65fxh.png']],
  ['a1000000-0000-0000-0000-000000000003', 'Lunar Anime Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294711635-0-vk8vi5btp7.png']],
  ['a1000000-0000-0000-0000-000000000003', 'Umbreon Japanese Artwork', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295577596-0-rflf3u7qj8k.png']],
  ['a1000000-0000-0000-0000-000000000004', 'Logo App Icon', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/media-library/1772292924530-0-06o8sgt2vodv.png']],
  ['a1000000-0000-0000-0000-000000000004', 'Arc Companion Promotion Graphic', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/media-library/arc-raiders-companion-installer-image.png']],
  ['a1000000-0000-0000-0000-000000000005', 'Twitch Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/fiddy-fam-banner-nobaruser.jpg']],
  ['a1000000-0000-0000-0000-000000000005', 'Twitch Channel Panels', [
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-about-me.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-donate.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-interact.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-leaderboard.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-recognise.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-rules.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-setup.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-socials.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-staff.png',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-twitch-panel-500x150-support.png',
  ]],
  ['a1000000-0000-0000-0000-000000000005', 'Twitch Banner Duplicate', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/fiddy-fam-banner-nobaruser.jpg']], // Same image as above, same path
  ['a1000000-0000-0000-0000-000000000005', 'Twitch Scene Assets', [
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-starting-soon.mp4',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-brb-new.mp4',
    'https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/50andbad-stream-ending.mp4',
  ]],
  ['a1000000-0000-0000-0000-000000000005', '50s Little Helper PFP', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/1772293376585-0-6jsr3h1n2hr.png']],
  ['a1000000-0000-0000-0000-000000000005', '50s Little Helper Bot Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/assets/1772293378859-0-qstqfuuasxk.png']],
  ['a1000000-0000-0000-0000-000000000006', 'Cypathic Twitch Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772293819704-0-qmszcj1jz.png']],
  ['a1000000-0000-0000-0000-000000000006', 'missyuukime Twitch Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294789702-0-43nzzfdvdgz.png']],
  ['a1000000-0000-0000-0000-000000000006', 'COCONUTMAN03 Twitch Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772295004432-0-1z3ewt82fa1.png']],
  ['a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner Fade', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294059902-0-dhh1whsga7j.png']],
  ['a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner Omen', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294066778-0-qf489lddkz8.png']],
  ['a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner Sage', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294072013-0-frq7qke40ce.png']],
  ['a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner Harbor', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294063408-0-2bu9ca7b8av.png']],
  ['a1000000-0000-0000-0000-000000000007', 'VALORANT Agent Banner Viper', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294076405-0-xd31f30flj.png']],
  ['a1000000-0000-0000-0000-000000000007', 'VALORANT Map Banner Lotus', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294240364-0-tip8fu7du7g.png']],
  ['a1000000-0000-0000-0000-000000000008', 'Senintels Inspired Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294376822-0-k5kciprkasc.jpg']],
  ['a1000000-0000-0000-0000-000000000008', 'Slipknot Inspired Banner', ['https://zsrrxqsrhnuztoqqzdsu.supabase.co/storage/v1/object/public/sogs-portfolio/1772294460562-0-j81gjj4hzn.png']],
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getExt(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || '.png';
  } catch {
    return '.png';
  }
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pathMap = []; // For updating the seed migration

  for (let i = 0; i < ASSETS.length; i++) {
    const [collectionId, title, urls] = ASSETS[i];
    const folder = COLLECTION_FOLDERS[collectionId];
    const targetDir = path.join(OUTPUT_DIR, folder);
    fs.mkdirSync(targetDir, { recursive: true });

    const baseSlug = slugify(title);
    const paths = [];

    for (let j = 0; j < urls.length; j++) {
      const url = urls[j];
      const ext = getExt(url);
      let filename;
      if (urls.length === 1) {
        filename = `${baseSlug}${ext}`;
      } else {
        const suffixes = ['about-me', 'donate', 'interact', 'leaderboard', 'recognise', 'rules', 'setup', 'socials', 'staff', 'support'];
        const isPanel = url.includes('twitch-panel');
        const isVideo = url.includes('.mp4');
        if (isPanel && j < suffixes.length) {
          filename = `${baseSlug}-${suffixes[j]}${ext}`;
        } else if (isVideo) {
          const vidNames = ['starting-soon', 'brb-new', 'stream-ending'];
          filename = `${baseSlug}-${vidNames[j] || j + 1}${ext}`;
        } else {
          filename = `${baseSlug}-${String(j + 1).padStart(2, '0')}${ext}`;
        }
      }

      const filepath = path.join(targetDir, filename);
      const bucketPath = `${folder}/${filename}`;

      try {
        console.log(`Downloading ${bucketPath}...`);
        const buf = await download(url);
        fs.writeFileSync(filepath, buf);
        paths.push(bucketPath);
      } catch (err) {
        console.error(`Failed: ${url}`, err.message);
      }
    }

    pathMap.push({ collectionId, title, paths });
  }

  // Write path mapping for seed update
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_path-mapping.json'),
    JSON.stringify(pathMap, null, 2)
  );

  console.log(`\nDone! Files saved to: ${OUTPUT_DIR}`);
  console.log('Drag the folder contents into your graphics-design-portfolio bucket in Supabase Storage.');
}

main().catch(console.error);
