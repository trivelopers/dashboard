import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ''); // mantiene tu forma de leer GEMINI_API_KEY

  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
    server: {
      host: true,          // 0.0.0.0 dentro del contenedor
      port: 5173,
      strictPort: true,
      hmr: { clientPort: 5173 },
      watch: { usePolling: true }, // hot reload estable en Windows + Docker
    },
  };
});
