// 开发入口：启动 Vite dev server，再把地址交给 Electron 主进程。
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer, type ViteDevServer } from 'vite';

function resolveElectronPath(): string {
    const require = createRequire(import.meta.url);
    return require('electron') as string;
}

function waitForExit(child: ChildProcess): Promise<number> {
    return new Promise((resolve) => {
        child.once('exit', (code) => resolve(code ?? 0));
        child.once('error', () => resolve(1));
    });
}

function attachShutdownHandlers(child: ChildProcess, server: ViteDevServer): void {
    const shutdown = (): void => {
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

async function main(): Promise<void> {
    const server: ViteDevServer = await createServer();
    await server.listen();
    server.printUrls();

    const devUrl: string | undefined = server.resolvedUrls?.local?.[0];
    if (devUrl === undefined) {
        await server.close();
        throw new Error('Vite dev server did not expose a local URL.');
    }

    const child: ChildProcess = spawn(resolveElectronPath(), ['.'], {
        stdio: 'inherit',
        env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
    });
    attachShutdownHandlers(child, server);

    const exitCode: number = await waitForExit(child);
    await server.close();
    process.exitCode = exitCode;
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
