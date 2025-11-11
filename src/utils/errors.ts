import { GOPHER_ERROR_TYPE, GOPHER_TERMINATOR } from "../constants.js";

export const isUnexpectedError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  if (!('code' in error)) {
    return false;
  }
  const errorCode = error.code;
  return errorCode !== 'ENOENT' && errorCode !== 'EACCES';
};

export const isFileSystemError = (error: unknown, code: string): boolean => {
  return error instanceof Error && 'code' in error && error.code === code;
};

export const createGopherError = (
  message: string,
  hostname: string,
  port: number
): string => {
  return `${GOPHER_ERROR_TYPE}${message}\t\t${hostname}\t${port}${GOPHER_TERMINATOR}`;
};

// Gopher error response helpers
export const accessDenied = (hostname: string, port: number): string => {
  return createGopherError('Access denied', hostname, port);
};

export const fileNotFound = (hostname: string, port: number): string => {
  return createGopherError('File not found', hostname, port);
};

export const fileTooLarge = (hostname: string, port: number): string => {
  return createGopherError('File too large', hostname, port);
};

export const internalError = (hostname: string, port: number): string => {
  return createGopherError('Internal server error', hostname, port);
};

export const noDirectoryIndex = (hostname: string, port: number): string => {
  return createGopherError('No directory index', hostname, port);
};
