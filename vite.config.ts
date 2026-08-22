import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
    },
    resolve: {
        extensions: ['.js', '.ts', '.json'],
    },
    base: './',
    build: {
        sourcemap: 'hidden',
    }
});
