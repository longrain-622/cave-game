// vitest 配置文件（单元测试）
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // 旧的手写测试脚本（check/main 风格，用 npx tsx 直接运行）不包含 vitest 套件，排除掉
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            'test/craftingRecipe.test.ts',
            'test/math.test.ts',
        ],
        setupFiles: ['./test/setup/globals.ts'],
    },
});
