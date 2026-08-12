// 临时静态服务器:仅用于本地验证 dist 产物(勿入库)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.argv[2] || '.';
const PORT = Number(process.argv[3] || 8080);
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
};

createServer(async (req, res) => {
    try {
        let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        if (urlPath.endsWith('/')) {urlPath += 'index.html';}
        const filePath = normalize(join(ROOT, urlPath));
        if (!filePath.startsWith(normalize(ROOT))) {
            res.writeHead(403); res.end('Forbidden'); return;
        }
        const info = await stat(filePath);
        if (!info.isFile()) {
            console.log(`[404] ${req.url}`);
            res.writeHead(404); res.end('Not Found'); return;
        }
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        console.log(`[200] ${req.url}`);
        res.end(body);
    } catch {
        console.log(`[404] ${req.url}`);
        res.writeHead(404);
        res.end('Not Found');
    }
}).listen(PORT, () => console.log(`static server on http://127.0.0.1:${PORT} root=${ROOT}`));
