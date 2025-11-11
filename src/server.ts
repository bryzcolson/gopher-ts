import { createServer, Socket } from 'net';
import { stat, access, constants } from 'fs/promises';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './config.js';
import { resolveSafePath } from './utils/path.js';
import { accessDenied, fileNotFound, internalError } from './utils/errors.js';
import { serveFile } from './handlers/file.js';
import { serveDirectory } from './handlers/directory.js';
import { SHUTDOWN_TIMEOUT } from './constants.js';

const serve = async (
  path: string,
  root: string,
  hostname: string,
  port: number,
  maxFileSize: number
): Promise<string> => {
  const requestedPath = resolveSafePath(path, root);

  if (!requestedPath) {
    return accessDenied(hostname, port);
  }

  try {
    await access(requestedPath, constants.R_OK);
    const stats = await stat(requestedPath);

    if (stats.isDirectory()) {
      return serveDirectory(requestedPath, hostname, port, maxFileSize);
    } else {
      return serveFile(requestedPath, hostname, port, maxFileSize);
    }
  } catch (error) {
    return fileNotFound(hostname, port);
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

  // Validate root directory exists and is accessible
  try {
    await access(ROOT, constants.R_OK);
  } catch (error) {
    throw new Error(`Root directory not accessible: ${ROOT}`);
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
          socket.write(internalError(HOSTNAME, PORT));
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
    }, SHUTDOWN_TIMEOUT);

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
