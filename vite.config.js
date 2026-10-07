import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { validateProductionBuild } from './config/productionBuild.mjs';

const root = fileURLToPath(new URL('./frontend', import.meta.url));
export default defineConfig(({ mode, command }) => {
  if (command === 'build' && mode === 'production') {
    const allowTestKeys = process.env.ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD === 'true';
    const allowLocalApi = process.env.ALLOW_LOCAL_API_IN_PROD_BUILD === 'true';
    validateProductionBuild(loadEnv(mode, root, 'VITE_'), { allowTestKeys, allowLocalApi });
    if (allowTestKeys || allowLocalApi) console.warn('[build] Sandbox overrides enabled. This artifact must not serve live customers.');
  }
  return {
    root,
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./frontend/src', import.meta.url)) } },
    build: {
      outDir: fileURLToPath(new URL('./dist', import.meta.url)),
      emptyOutDir: true,
      rollupOptions: { output: { manualChunks(id) {
        if (!id.includes('node_modules')) return;
        if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)) return 'react-vendor';
        if (/node_modules\/(@stripe|stripe)\//.test(id)) return 'payments';
        if (/node_modules\/(framer-motion|motion-dom|motion-utils|gsap)\//.test(id)) return 'animation';
      } } },
    },
  };
});
