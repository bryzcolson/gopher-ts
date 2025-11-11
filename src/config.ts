import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@iarna/toml';

export type ConfigType = {
  server: {
    port: number;
    rootDirectory: string;
  };
};

export const loadConfig = async (): Promise<ConfigType> => {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'config.toml');

  try {
    const content = await readFile(path, 'utf8');
    const config = parse(content) as unknown as ConfigType;

    if (!config.server) {
      throw new Error('Config missing [server] section');
    }
    if (typeof config.server.port !== 'number') {
      throw new Error('Config missing or invalid server.port');
    }
    if (config.server.port < 1 || config.server.port > 65535) {
      throw new Error(`Invalid port number: ${config.server.port}. Must be between 1 and 65535`);
    }
    if (typeof config.server.rootDirectory !== 'string') {
      throw new Error('Config missing or invalid server.rootDirectory');
    }

    return config;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Config file not found at ${path}`);
    }
    throw error;
  }
};
