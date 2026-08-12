import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            // test/math.test.ts 为待开发占位文件,暂不纳入测试运行
            'test/math.test.ts',
        ],
        setupFiles: ['./test/setup/globals.ts'],
    },
});
