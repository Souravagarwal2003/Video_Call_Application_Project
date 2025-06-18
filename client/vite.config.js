import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
   // include: ['buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis'  // Correct polyfill for 'global'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true
        }),
        NodeModulesPolyfillPlugin()  // Required for `stream`, `crypto`, etc.
      ]
    }
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      events: 'events/',
    //  buffer: 'buffer'
    }
  },
  define: {
    global: "window" // Critical fix for `global is not defined`
  }
})
