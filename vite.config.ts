import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

/** Local stand-in for Vercel `/api/image/[id]` edge function. */
function imageProxyPlugin(): Plugin {
  return {
    name: 'sogki-image-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/image/')) return next();

        const id = req.url.slice('/api/image/'.length).split('?')[0] ?? '';
        if (!id) {
          res.statusCode = 400;
          res.end('Missing image id');
          return;
        }

        let rawUrl: string;
        try {
          rawUrl = fromBase64Url(decodeURIComponent(id));
        } catch {
          res.statusCode = 400;
          res.end('Invalid image id');
          return;
        }

        try {
          const upstream = await fetch(rawUrl, {
            headers: { Accept: 'image/*,*/*' },
            redirect: 'follow',
          });
          if (!upstream.ok) {
            res.statusCode = upstream.status;
            res.end(`Upstream error: ${upstream.status}`);
            return;
          }
          const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          const buffer = Buffer.from(await upstream.arrayBuffer());
          res.end(buffer);
        } catch {
          res.statusCode = 502;
          res.end('Proxy failed');
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), imageProxyPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
