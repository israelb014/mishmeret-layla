import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: '/mishmeret-layla/',
  define: { __DEV__: command === 'serve' },
  server: { port: 5173, fs: { allow: ['..', '/home/one/work/raw'] } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 0,
  },
}));
