import { createServer } from 'net';
import { readFile, access, constants } from 'fs/promises';
import { join, dirname, isAbsolute, resolve, normalize, sep } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@iarna/toml';

type ConfigType = {
  server: {
    port: number;
    rootDirectory: string;
  };
};

const loadConfig = async (): Promise<ConfigType> => {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'config.toml');
  const content = await readFile(path, 'utf8');
  return parse(content) as unknown as ConfigType;
};

const serve = async (path: string, root: string): Promise<string> => {
  const cleanPath = path === '' || path === '/' ? '' : path;

  const requestedPath = normalize(join(root, cleanPath));
  const resolvedRoot = resolve(root);
  const resolvedRequest = resolve(requestedPath);
  if (!resolvedRequest.startsWith(resolvedRoot + sep) && resolvedRequest !== resolvedRoot) {
    return '3Access denied\t\terror.host\t1\r\n.\r\n';
  }

  const gophermapPath = join(requestedPath, 'gophermap');
  try {
    await access(gophermapPath, constants.R_OK);
    const content = await readFile(gophermapPath, 'utf8');
    return content + '\r\n.\r\n';
  } catch (error) {
    // gophermap doesn't exist or isn't readable, try direct file
  }

  try {
    await access(requestedPath, constants.R_OK);
    const content = await readFile(requestedPath, 'utf8');
    return content + '\r\n.\r\n';
  } catch (error) {
    // file doesn't exist or isn't readable
  }

  return '3File not found\t\terror.host\t1\r\n.\r\n';
};

const startServer = async () => {
  const config = await loadConfig();
  const PORT = config.server.port;
  const ROOT = isAbsolute(config.server.rootDirectory)
    ? config.server.rootDirectory
    : join(dirname(fileURLToPath(import.meta.url)), '..', config.server.rootDirectory);

  const server = createServer((socket: any) => {
    socket.on('data', async (data: any) => {
      const request = data.toString().trim();
      const content = await serve(request, ROOT);
      socket.write(content);
      socket.end();
    });
  });

  server.listen(PORT, () => {
    console.log(`Gopher server listening on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
