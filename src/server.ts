import { createServer, Socket } from 'net';
import { readFile, access, constants } from 'fs/promises';
import { join, dirname, isAbsolute, resolve, normalize, sep } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { createGopherError, GOPHER_TERMINATOR } from './error.js';

const isUnexpectedError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  if (!('code' in error)) {
    return false;
  }
  const errorCode = error.code;
  return errorCode !== 'ENOENT' && errorCode !== 'EACCES';
};

const serve = async (path: string, root: string): Promise<string> => {
  const cleanPath = path === '' || path === '/' ? '' : path;

  const requestedPath = normalize(join(root, cleanPath));
  const resolvedRoot = resolve(root);
  const resolvedRequest = resolve(requestedPath);
  if (!resolvedRequest.startsWith(resolvedRoot + sep) && resolvedRequest !== resolvedRoot) {
    return createGopherError('Access denied');
  }

  const gophermapPath = join(requestedPath, 'gophermap');
  try {
    await access(gophermapPath, constants.R_OK);
    const content = await readFile(gophermapPath, 'utf8');
    return content + GOPHER_TERMINATOR;
  } catch (error) {
    if (isUnexpectedError(error)) {
      console.error(`Error reading gophermap ${gophermapPath}:`, error);
    }
    // gophermap doesn't exist or isn't readable, try direct file
  }

  try {
    await access(requestedPath, constants.R_OK);
    const content = await readFile(requestedPath, 'utf8');
    return content + GOPHER_TERMINATOR;
  } catch (error) {
    // file doesn't exist or isn't readable
    if (isUnexpectedError(error)) {
      console.error(`Error reading file ${requestedPath}:`, error);
      return createGopherError('Internal server error');
    }
  }

  return createGopherError('File not found');
};

const startServer = async () => {
  const config = await loadConfig();
  const PORT = config.server.port;
  const ROOT = isAbsolute(config.server.rootDirectory)
    ? config.server.rootDirectory
    : join(dirname(fileURLToPath(import.meta.url)), '..', config.server.rootDirectory);

  try {
    await access(ROOT, constants.R_OK);
  } catch (error) {
    throw new Error(`Root directory not accessible: ${ROOT}`);;
  }

  const server = createServer((socket: Socket) => {
    socket.on('data', async (data: Buffer) => {
      try {
        const request = data.toString('utf8').trim();
        const content = await serve(request, ROOT);
        socket.write(content);
        socket.end();
      } catch (error) {
        console.error('Error handling request:', error);
        try {
          socket.write(createGopherError('Internal server error'));
          socket.end();
        } catch (writeError) {
          console.error('Error writing error response:', writeError);
        }
      }
    });

    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  });

  server.on('error', (error: Error) => {
    console.error('Server error:', error);
    if ('code' in error && error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`Gopher server listening on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
