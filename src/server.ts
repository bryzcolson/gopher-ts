import { createServer, Socket } from 'net';
import { readFile, access, constants, stat } from 'fs/promises';
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

const serve = async (path: string, root: string, hostname: string, port: number, maxFileSize: number): Promise<string> => {
  const cleanPath = path === '' || path === '/' ? '' : path;

  const requestedPath = normalize(join(root, cleanPath));
  const resolvedRoot = resolve(root);
  const resolvedRequest = resolve(requestedPath);
  if (!resolvedRequest.startsWith(resolvedRoot + sep) && resolvedRequest !== resolvedRoot) {
    return createGopherError('Access denied', hostname, port);
  }

  try {
    await access(requestedPath, constants.R_OK);
    const stats = await stat(requestedPath);

    // If it's a directory, look for gophermap
    if (stats.isDirectory()) {
      const gophermapPath = join(requestedPath, 'gophermap');
      try {
        await access(gophermapPath, constants.R_OK);
        const gophermapStats = await stat(gophermapPath);

        // Check gophermap file size
        if (gophermapStats.size > maxFileSize) {
          console.error(`Gophermap too large: ${gophermapPath} (${gophermapStats.size} bytes)`);
          return createGopherError('File too large', hostname, port);
        }

        const content = await readFile(gophermapPath, 'utf8');
        return content + GOPHER_TERMINATOR;
      } catch (error) {
        if (isUnexpectedError(error)) {
          console.error(`Error reading gophermap ${gophermapPath}:`, error);
          return createGopherError('Internal server error', hostname, port);
        }
        // No gophermap in directory
        return createGopherError('No directory index', hostname, port);
      }
    }

    // It's a file, check size before reading
    if (stats.size > maxFileSize) {
      console.error(`File too large: ${requestedPath} (${stats.size} bytes, max: ${maxFileSize})`);
      return createGopherError('File too large', hostname, port);
    }

    // Read and return the file
    const content = await readFile(requestedPath, 'utf8');
    return content + GOPHER_TERMINATOR;
  } catch (error) {
    // Path doesn't exist or isn't accessible
    if (isUnexpectedError(error)) {
      console.error(`Error accessing ${requestedPath}:`, error);
      return createGopherError('Internal server error', hostname, port);
    }
    return createGopherError('File not found', hostname, port);
  }
};

const startServer = async () => {
  const config = await loadConfig();
  const PORT = config.server.port;
  const HOSTNAME = config.server.hostname!;
  const MAX_FILE_SIZE = config.server.maxFileSize!;
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
        const content = await serve(request, ROOT, HOSTNAME, PORT, MAX_FILE_SIZE);
        socket.write(content);
        socket.end();
      } catch (error) {
        console.error('Error handling request:', error);
        try {
          socket.write(createGopherError('Internal server error', HOSTNAME, PORT));
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
    console.log(`Gopher server listening on ${HOSTNAME}:${PORT}`);
  });

  // Graceful shutdown handler
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}, starting graceful shutdown...`);

    server.close((error) => {
      if (error) {
        console.error('Error during server shutdown:', error);
        process.exit(1);
      }
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after timeout
    const shutdownTimeout = setTimeout(() => {
      console.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 10000);

    // Don't keep the process alive just for the timeout
    shutdownTimeout.unref();
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
