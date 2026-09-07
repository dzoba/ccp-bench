import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: [react()],
  build: {
    outDir: fileURLToPath(
      new URL('../../../.cache/review-build', import.meta.url),
    ),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(
        new URL('../src/calibration-review/main.tsx', import.meta.url),
      ),
      formats: ['iife'],
      name: 'CalibrationReview',
      fileName: () => 'review.js',
      cssFileName: 'review',
    },
  },
});
