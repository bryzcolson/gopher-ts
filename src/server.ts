import { createServer } from 'net';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
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

  const gophermapPath = join(ROOT, cleanPath, 'gophermap');
  if (existsSync(gophermapPath)) {
    return readFileSync(gophermapPath, 'utf8') + '\r\n.\r\n';
  }

  const directPath = join(ROOT, cleanPath);
  if (existsSync(directPath)) {
    return readFileSync(directPath, 'utf8') + '\r\n.\r\n';
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