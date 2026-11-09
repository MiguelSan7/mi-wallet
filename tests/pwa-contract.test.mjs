import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

test('manifest.json cumple con todos los requerimientos técnicos de PWA del PDF', () => {
  const manifestPath = path.join(ROOT, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json debe existir');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.name, 'Mi Billetera Lite');
  assert.ok(manifest.short_name && manifest.short_name.length > 0);
  assert.ok(manifest.theme_color && /^#[0-9A-Fa-f]{6}$/.test(manifest.theme_color));
  assert.ok(manifest.background_color && /^#[0-9A-Fa-f]{6}$/.test(manifest.background_color));
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);

  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192'), 'Debe incluir ícono 192x192');
  assert.ok(sizes.includes('512x512'), 'Debe incluir ícono 512x512');

  const hasMaskable = manifest.icons.some((i) => i.purpose && i.purpose.includes('maskable'));
  assert.ok(hasMaskable, 'Debe incluir íconos compatibles con máscaras (maskable)');

  for (const icon of manifest.icons) {
    const iconFile = path.join(ROOT, icon.src.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(iconFile), `El archivo de ícono ${icon.src} debe existir en disco`);
    const stat = fs.statSync(iconFile);
    assert.ok(stat.size > 100, `El archivo de ícono ${icon.src} no debe estar vacío`);
  }
});

test('sw.js implementa install, activate y fetch con estrategia Cache First y Network Fallback', async () => {
  const swPath = path.join(ROOT, 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js debe existir');

  const swSource = fs.readFileSync(swPath, 'utf8');
  assert.ok(swSource.includes("addEventListener('install'"), 'Debe manejar el evento install');
  assert.ok(swSource.includes("addEventListener('activate'"), 'Debe manejar el evento activate');
  assert.ok(swSource.includes("addEventListener('fetch'"), 'Debe manejar el evento fetch');

  const appShellMatches = [...swSource.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
  assert.ok(appShellMatches.length >= 10, 'APP_SHELL debe listar todos los archivos estáticos');
  for (const rel of appShellMatches) {
    const cleanRel = rel === './' ? 'index.html' : rel.replace(/^\.\//, '');
    const targetPath = path.join(ROOT, cleanRel);
    assert.ok(fs.existsSync(targetPath), `El recurso precacheado ${rel} debe existir en disco`);
  }

  const listeners = {};
  const cacheStore = new Map();

  const mockCaches = {
    async open(name) {
      if (!cacheStore.has(name)) {
        cacheStore.set(name, new Map());
      }
      const bucket = cacheStore.get(name);
      return {
        async addAll(urls) {
          for (const u of urls) {
            bucket.set(u, { url: u, status: 200, clone() { return this; } });
          }
        },
        async put(req, res) {
          const key = typeof req === 'string' ? req : req.url;
          bucket.set(key, res);
        },
      };
    },
    async keys() {
      return [...cacheStore.keys()];
    },
    async delete(name) {
      return cacheStore.delete(name);
    },
    async match(req) {
      const key = typeof req === 'string' ? req : req.url;
      for (const bucket of cacheStore.values()) {
        if (bucket.has(key)) return bucket.get(key);
      }
      return undefined;
    },
  };

  await cacheStore.set('old-cache-v0', new Map());

  globalThis.self = {
    location: { origin: 'https://mibilletera.local' },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    skipWaiting() {
      return Promise.resolve();
    },
    clients: {
      claim() {
        return Promise.resolve();
      },
    },
  };
  globalThis.caches = mockCaches;
  globalThis.fetch = async (req) => ({
    ok: true,
    status: 200,
    type: 'basic',
    url: typeof req === 'string' ? req : req.url,
    clone() {
      return this;
    },
  });

  await import(`../sw.js?t=${Date.now()}`);

  let installPromise;
  listeners.install({
    waitUntil(p) {
      installPromise = p;
    },
  });
  await installPromise;

  let activatePromise;
  listeners.activate({
    waitUntil(p) {
      activatePromise = p;
    },
  });
  await activatePromise;

  assert.equal(cacheStore.has('old-cache-v0'), false, 'activate debe limpiar cachés antiguas');
  assert.equal(cacheStore.size, 1, 'Debe quedar únicamente la caché activa');

  let fetchResponsePromise;
  listeners.fetch({
    request: {
      method: 'GET',
      url: './index.html',
      mode: 'navigate',
    },
    respondWith(p) {
      fetchResponsePromise = p;
    },
  });
  const cachedRes = await fetchResponsePromise;
  assert.equal(cachedRes.status, 200, 'fetch debe responder desde caché cuando el archivo existe');
});
