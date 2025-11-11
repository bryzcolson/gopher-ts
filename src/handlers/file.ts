import { readFile, stat, access, constants } from 'fs/promises';
import { formatGopherResponse } from '../constants.js';
import { isUnexpectedError, fileTooLarge, internalError, fileNotFound } from '../utils/errors.js';

export const serveFile = async (
  filePath: string,
  hostname: string,
  port: number,
  maxFileSize: number
): Promise<string> => {
  try {
    await access(filePath, constants.R_OK);
    const stats = await stat(filePath);

    // Check file size before reading
    if (stats.size > maxFileSize) {
      console.error(`File too large: ${filePath} (${stats.size} bytes, max: ${maxFileSize})`);
      return fileTooLarge(hostname, port);
    }

    // Read and return the file
    const content = await readFile(filePath, 'utf8');
    return formatGopherResponse(content);
  } catch (error) {
    if (isUnexpectedError(error)) {
      console.error(`Error reading file ${filePath}:`, error);
      return internalError(hostname, port);
    }
    return fileNotFound(hostname, port);
  }
};
