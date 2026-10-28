import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * 로컬 개발 서버에서도 api/*.ts(Vercel 함수)를 그대로 부른다. 배포에서는 Vercel이 같은 파일을 함수로 돌린다.
 * 키는 .env.local에서 읽는다(저장소에 올라가지 않음).
 */
function devApi(): Plugin {
  return {
    name: 'nod-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        if (!path.startsWith('/api/') || path.includes('..')) return next();
        const file = `${path.slice(1)}.ts`;
        if (!existsSync(file)) return next();
        try {
          const mod = await server.ssrLoadModule(`/${file}`);
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Response | Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const body = req.method === 'GET' || req.method === 'HEAD' || !chunks.length ? undefined : Buffer.concat(chunks);
          const r = await handler(new Request(`http://localhost${req.url}`, { method: req.method, headers, body }));
          res.statusCode = r.status;
          r.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await r.arrayBuffer()));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v;
  return {
    plugins: [react(), devApi()],
    build: { rollupOptions: { input: { main: resolve('index.html'), pay: resolve('pay.html') } } },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
