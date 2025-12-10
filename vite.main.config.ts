import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
    rollupOptions: {
      // 1. Add this 'external' section
      external: [
        'pg', 
        'pg-hstore', // Often needed if you use Sequelize, but good to include just in case
      ], 
    },
  },
});
