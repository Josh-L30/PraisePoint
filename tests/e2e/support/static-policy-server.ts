import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join, sep, extname } from 'node:path';
/** Local renderer rehearsal applies the committed Firebase headers; official emulator tests verify Hosting behavior. */
export async function staticPolicyServer() {
  const root = resolve('dist'),
    rules = JSON.parse(await readFile('firebase.json', 'utf8')).hosting.headers as {
      source?: string;
      regex?: string;
      headers: { key: string; value: string }[];
    }[];
  const types: Record<string, string> = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.ttf': 'font/ttf',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
  };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      let path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (
        (path !== root && !path.startsWith(root + sep)) ||
        ['/_headers', '/_redirects'].includes(url.pathname)
      ) {
        response.writeHead(404).end();
        return;
      }
      let body: Buffer;
      try {
        body = await readFile(path);
      } catch {
        if (extname(path)) {
          response.writeHead(404).end();
          return;
        }
        path = join(root, 'index.html');
        body = await readFile(path);
      }
      response.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
      response.setHeader('Cache-Control', 'no-cache');
      for (const rule of rules)
        if (rule.regex && new RegExp(rule.regex).test(url.pathname))
          for (const { key, value } of rule.headers) response.setHeader(key, value);
      response.end(body);
    } catch {
      response.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No policy test host');
  return {
    baseURL: 'http://127.0.0.1:' + address.port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
