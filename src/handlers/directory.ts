import { readFile, stat, access, constants } from 'fs/promises';
import { join } from 'path';
import { formatGopherResponse } from '../helpers.js';
import { isUnexpectedError, fileTooLarge, internalError, noDirectoryIndex } from '../utils/errors.js';

export const serveDirectory = async (
  dirPath: string,
  hostname: string,
  port: number,
  maxFileSize: number
): Promise<string> => {
  const gophermapPath = join(dirPath, 'gophermap');

  try {
    await access(gophermapPath, constants.R_OK);
    const stats = await stat(gophermapPath);

    // Check gophermap file size
    if (stats.size > maxFileSize) {
      console.error(`Gophermap too large: ${gophermapPath} (${stats.size} bytes)`);
      return fileTooLarge(hostname, port);
    }

    // Read and return the gophermap
    const content = await readFile(gophermapPath, 'utf8');
    return formatGopherResponse(content);
  } catch (error) {
    if (isUnexpectedError(error)) {
      console.error(`Error reading gophermap ${gophermapPath}:`, error);
      return internalError(hostname, port);
    }
    // No gophermap in directory
    return noDirectoryIndex(hostname, port);
  }
};
