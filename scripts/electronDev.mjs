// 开发入口：启动 Vite dev server，再把地址交给 Electron 主进程。
import { spawn } from 'node:child_process';
import electronPath from 'electron';
import { createServer } from 'vite';

function waitForExit(child) {
    return new Promise((resolve) => {
        child.once('exit', (code) => resolve(code ?? 0));
        child.once('error', () => resolve(1));
    });
}

function attachShutdownHandlers(child, server) {
    const shutdown = () => {
        if (!child.killed) {
            child.kill();
        }
        server.close().finally(() => {
            process.exit(0);
        });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}

async function main() {
    const server = await createServer();
    await server.listen();
    server.printUrls();

    const devUrl = server.resolvedUrls?.local?.[0];
    if (!devUrl) {
        await server.close();
        throw new Error('Vite dev server did not expose a local URL.');
    }

    const child = spawn(electronPath, ['.'], {
        stdio: 'inherit',
        env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
    });
    attachShutdownHandlers(child, server);

    const exitCode = await waitForExit(child);
    await server.close();
    process.exitCode = exitCode;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
