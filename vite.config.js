import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: './static/js/index.js',
        game: './static/js/game.js',
        multiplayer: './static/js/multiplayer/multiplayer_game.js',
        leaderboard: './static/js/leaderboard/leaderboard.js',
        admin: './static/js/admin_js_modules/adminMain.js'
      },
      output: {
        dir: 'static/js/dist',
        entryFileNames: '[name].bundle.js',
        chunkFileNames: '[name]-[hash].js'
      }
    },
    outDir: 'static/js/dist',
    emptyOutDir: true
  }
});