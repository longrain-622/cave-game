import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            'test/craftingRecipe.test.ts',
            'test/math.test.ts',
        ],
        setupFiles: ['./test/setup/globals.ts'],
    },
});
