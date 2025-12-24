import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // This helps bundling commonjs libraries like Express
    commonjsOptions: {
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      external: [
        // ⚠️ ONLY Native Modules go here
        // Do NOT put 'pg' or 'express' here. They must be bundled.
        'sharp',
        'onnxruntime-node',
        'opencv.js',
        'pg-native', 
        'mock-aws-s3', 'aws-sdk', 'nock'
      ], 
    },
  },
});