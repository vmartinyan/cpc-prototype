import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Հավաքվում է մեկ ինքնաբավ dist/index.html ֆայլի մեջ (JS, CSS, տառատեսակներ),
// որպեսզի նախատիպը բացվի առանց սերվերի և առանց ինտերնետի (ԿԿՀ ներքին ցանց)։
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 },
});
