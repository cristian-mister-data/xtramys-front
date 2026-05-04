import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// Plugin: fuerza JSX loader en node_modules para paquetes RN/Expo que distribuyen JSX en .js
function rnJsxPlugin() {
  const packagesNeedingJsx = [
    'react-native-web',
    'react-native-svg',
    'react-native-safe-area-context',
    'react-native-gesture-handler',
    '@expo/vector-icons',
    '@react-native-async-storage/async-storage',
  ];
  const matcher = new RegExp(`node_modules[\\\\/](?:${packagesNeedingJsx.map((p) => p.replace(/[/@-]/g, '[\\\\/@-]')).join('|')})[\\\\/].*\\.js$`);
  return {
    name: 'rn-jsx-loader',
    enforce: 'pre',
    async load(id) {
      const cleanId = id.split('?')[0];
      if (!matcher.test(cleanId)) return null;
      const code = await fs.promises.readFile(cleanId, 'utf-8');
      return { code, map: null };
    },
    async transform(code, id) {
      const cleanId = id.split('?')[0];
      if (!matcher.test(cleanId)) return null;
      const esbuild = await import('esbuild');
      const result = await esbuild.transform(code, {
        loader: 'jsx',
        jsx: 'automatic',
        sourcefile: cleanId,
        target: 'es2020',
      });
      return { code: result.code, map: result.map || null };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [
    rnJsxPlugin(),
    react({
      include: [/\.[jt]sx?$/],
      babel: {
        // Vendor files (copia literal del source RN) dependen del transform
        // const/let → var de Metro: sin él TDZ rompe field.js (standardSize, etc.).
        // Aplicado globalmente porque el test regex de overrides no siempre
        // resuelve rutas absolutas en Windows con @vitejs/plugin-react.
        plugins: ['@babel/plugin-transform-block-scoping'],
      },
    }),
  ],
  resolve: {
    extensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // RN → wrapper local que re-exporta RNW con TouchableOpacity/Pressable
      // parcheados (onClick nativo para evitar el bug del primer click).
      { find: /^react-native$/, replacement: path.resolve(__dirname, './src/shims/react-native.js') },
      // Shims (web stubs para módulos sin compat)
      { find: 'react-native-view-shot', replacement: path.resolve(__dirname, './src/shims/react-native-view-shot.js') },
      { find: 'expo-screen-orientation', replacement: path.resolve(__dirname, './src/shims/expo-screen-orientation.js') },
      { find: /^expo-file-system(\/legacy)?$/, replacement: path.resolve(__dirname, './src/shims/expo-file-system.js') },
      { find: 'expo-asset', replacement: path.resolve(__dirname, './src/shims/expo-asset.js') },
      { find: 'react-native-fs', replacement: path.resolve(__dirname, './src/shims/react-native-fs.js') },
      { find: 'expo-linear-gradient', replacement: path.resolve(__dirname, './src/shims/expo-linear-gradient.js') },
      { find: 'expo-media-library', replacement: path.resolve(__dirname, './src/shims/expo-media-library.js') },
      { find: 'expo-sharing', replacement: path.resolve(__dirname, './src/shims/expo-sharing.js') },
      { find: 'expo-video', replacement: path.resolve(__dirname, './src/shims/expo-video.js') },
      { find: 'expo-font', replacement: path.resolve(__dirname, './src/shims/expo-font.js') },
      { find: '@react-native/assets-registry/registry', replacement: path.resolve(__dirname, './src/shims/rn-assets-registry.js') },
      { find: '@react-navigation/native', replacement: path.resolve(__dirname, './src/shims/react-navigation-native.js') },
      { find: '@react-navigation/native-stack', replacement: path.resolve(__dirname, './src/shims/react-navigation-stack.jsx') },
      { find: '@react-navigation/drawer', replacement: path.resolve(__dirname, './src/shims/react-navigation-drawer.jsx') },
      { find: '@react-navigation/stack', replacement: path.resolve(__dirname, './src/shims/react-navigation-stack.jsx') },
      { find: 'expo-image-picker', replacement: path.resolve(__dirname, './src/shims/expo-image-picker.js') },
      { find: 'expo-print', replacement: path.resolve(__dirname, './src/shims/expo-print.js') },
      { find: 'expo-clipboard', replacement: path.resolve(__dirname, './src/shims/expo-clipboard.js') },
      { find: 'react-native-image-pan-zoom', replacement: path.resolve(__dirname, './src/shims/react-native-image-pan-zoom.jsx') },
      { find: 'react-native-chart-kit', replacement: path.resolve(__dirname, './src/shims/react-native-chart-kit.jsx') },
      { find: 'react-native-modal-datetime-picker', replacement: path.resolve(__dirname, './src/shims/react-native-modal-datetime-picker.jsx') },
      { find: '@react-native-community/datetimepicker', replacement: path.resolve(__dirname, './src/shims/react-native-modal-datetime-picker.jsx') },
      { find: '@react-native-picker/picker', replacement: path.resolve(__dirname, './src/shims/rn-picker.jsx') },
      // react-native-vector-icons subpaths → @expo/vector-icons (mismo set)
      { find: /^react-native-vector-icons\/(.*)$/, replacement: '@expo/vector-icons/$1' },
    ],
  },
  define: {
    __DEV__: mode !== 'production',
    'process.env.NODE_ENV': JSON.stringify(mode),
    global: 'globalThis',
  },
  esbuild: {
    // Vendor RN files in src/vendor are .js but contain JSX.
    loader: 'jsx',
    include: /src[\\/].*\.[jt]sx?$/,
    exclude: [],
    logOverride: {
      'duplicate-object-key': 'warning',
    },
  },
  // NOTA: COEP/COOP eliminados — bloqueaban imágenes de R2 (sin header CORP).
  // Si en el futuro se necesita ffmpeg.wasm con SharedArrayBuffer, aplicarlos
  // condicionalmente o servir R2 vía proxy con Cross-Origin-Resource-Policy.
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    include: [
      'react-native-web',
      'react-native-svg',
      'react-native-safe-area-context',
      'react-native-gesture-handler',
      '@expo/vector-icons',
      '@react-native-async-storage/async-storage',
    ],
    esbuildOptions: {
      // RNW y libs RN distribuyen JSX en .js
      loader: { '.js': 'jsx' },
      resolveExtensions: ['.web.js', '.web.jsx', '.js', '.jsx'],
    },
  },
  build: {
    sourcemap: mode !== 'production',
    chunkSizeWarningLimit: 1500,
    commonjsOptions: { transformMixedEsModules: true },
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          konva: ['konva', 'react-konva'],
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          rnw: ['react-native-web', 'react-native-svg', 'react-native-safe-area-context', 'react-native-gesture-handler', '@expo/vector-icons'],
        },
      },
    },
  },
}));
