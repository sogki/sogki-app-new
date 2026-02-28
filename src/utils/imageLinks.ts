const toBinaryString = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
};

export const toBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const base64 = btoa(toBinaryString(bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const toSogkiImageProxyUrl = (rawImageUrl: string) => {
  return `https://sogki.dev/api/image/${toBase64Url(rawImageUrl)}`;
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];

const getPathnameFromUrl = (value: string) => {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

export type MediaType = 'image' | 'video';

export const getMediaType = (value: string): MediaType => {
  const pathname = getPathnameFromUrl(value);
  if (VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'video';
  if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'image';
  return 'image';
};

export const buildImageViewerPath = (imageLinks: string[], activeIndex: number) => {
  const payload = toBase64Url(JSON.stringify(imageLinks));
  return `/image-viewer?p=${encodeURIComponent(payload)}&i=${activeIndex}`;
};

export const GRAPHIC_DESIGN_SCROLL_KEY = 'graphic-design:scrollY';
export const GRAPHIC_DESIGN_RESTORE_KEY = 'graphic-design:restore';

export const parseImageViewerPayload = (search: string) => {
  const params = new URLSearchParams(search);
  const payload = params.get('p');
  const indexParam = Number(params.get('i') ?? 0);

  if (!payload) {
    return { imageLinks: [] as string[], startIndex: 0 };
  }

  try {
    const decoded = fromBase64Url(payload);
    const parsed = JSON.parse(decoded);
    const imageLinks = Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    const boundedIndex = Number.isFinite(indexParam) ? Math.max(0, Math.min(indexParam, imageLinks.length - 1)) : 0;

    return { imageLinks, startIndex: boundedIndex };
  } catch {
    return { imageLinks: [] as string[], startIndex: 0 };
  }
};
