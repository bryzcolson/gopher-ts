import { createServer } from 'net';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute, resolve, normalize, sep } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@iarna/toml';

type ConfigType = {
  server: {
    port: number;
    rootDirectory: string;
  };
};

const loadConfig = (): ConfigType => {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'config.toml');
  const content = readFileSync(path, 'utf8');
  return parse(content) as unknown as ConfigType;
};

const config = loadConfig();
const PORT = config.server.port;
const ROOT = isAbsolute(config.server.rootDirectory)
  ? config.server.rootDirectory
  : join(dirname(fileURLToPath(import.meta.url)), '..', config.server.rootDirectory);

const serve = (path: string): string => {
  const cleanPath = path === '' || path === '/' ? '' : path;

  const requestedPath = normalize(join(ROOT, cleanPath));
  const resolvedRoot = resolve(ROOT);
  const resolvedRequest = resolve(requestedPath);
  if (!resolvedRequest.startsWith(resolvedRoot + sep) && resolvedRequest !== resolvedRoot) {
    return '3Access denied\t\terror.host\t1\r\n.\r\n';
  }

  const gophermapPath = join(requestedPath, 'gophermap');
  if (existsSync(gophermapPath)) {
    return readFileSync(gophermapPath, 'utf8') + '\r\n.\r\n';
  }

  if (existsSync(requestedPath)) {
    return readFileSync(requestedPath, 'utf8') + '\r\n.\r\n';
  }

  return '3File not found\t\terror.host\t1\r\n.\r\n';
};

const server = createServer((socket: any) => {
  socket.on('data', (data: any) => {
    const request = data.toString().trim();
    const content = serve(request);
    socket.write(content);
    socket.end();
  });
});

server.listen(PORT);