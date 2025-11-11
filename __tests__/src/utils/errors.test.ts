import { describe, expect, test } from '@jest/globals';
import {
  isUnexpectedError,
  isFileSystemError,
  createGopherError,
  accessDenied,
  fileNotFound,
  fileTooLarge,
  internalError,
  noDirectoryIndex,
} from '../../../src/utils/errors.js';
import { GOPHER_ERROR_TYPE, GOPHER_TERMINATOR } from '../../../src/constants.js';

describe('isUnexpectedError', () => {
  test('should return false for non-Error objects', () => {
    expect(isUnexpectedError('string error')).toBe(false);
    expect(isUnexpectedError(123)).toBe(false);
    expect(isUnexpectedError(null)).toBe(false);
    expect(isUnexpectedError(undefined)).toBe(false);
  });

  test('should return false for Error without code property', () => {
    const error = new Error('Simple error');
    expect(isUnexpectedError(error)).toBe(false);
  });

  test('should return false for ENOENT errors', () => {
    const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
    expect(isUnexpectedError(error)).toBe(false);
  });

  test('should return false for EACCES errors', () => {
    const error = Object.assign(new Error('Access denied'), { code: 'EACCES' });
    expect(isUnexpectedError(error)).toBe(false);
  });

  test('should return true for other error codes', () => {
    const error = Object.assign(new Error('Unknown error'), { code: 'EUNKNOWN' });
    expect(isUnexpectedError(error)).toBe(true);
  });

  test('should return true for system errors like EISDIR', () => {
    const error = Object.assign(new Error('Is directory'), { code: 'EISDIR' });
    expect(isUnexpectedError(error)).toBe(true);
  });
});

describe('isFileSystemError', () => {
  test('should return true for matching error code', () => {
    const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
    expect(isFileSystemError(error, 'ENOENT')).toBe(true);
  });

  test('should return false for non-matching error code', () => {
    const error = Object.assign(new Error('File not found'), { code: 'ENOENT' });
    expect(isFileSystemError(error, 'EACCES')).toBe(false);
  });

  test('should return false for non-Error objects', () => {
    expect(isFileSystemError('error', 'ENOENT')).toBe(false);
    expect(isFileSystemError(null, 'ENOENT')).toBe(false);
  });

  test('should return false for Error without code', () => {
    const error = new Error('Simple error');
    expect(isFileSystemError(error, 'ENOENT')).toBe(false);
  });
});

describe('createGopherError', () => {
  test('should create properly formatted gopher error', () => {
    const message = 'Test error';
    const hostname = 'localhost';
    const port = 70;
    const result = createGopherError(message, hostname, port);
    const expected = `${GOPHER_ERROR_TYPE}${message}\t\t${hostname}\t${port}${GOPHER_TERMINATOR}`;
    expect(result).toBe(expected);
  });

  test('should handle empty message', () => {
    const message = '';
    const hostname = 'gopher.example.com';
    const port = 7070;
    const result = createGopherError(message, hostname, port);
    expect(result).toContain(GOPHER_ERROR_TYPE);
    expect(result).toContain(hostname);
    expect(result).toContain('7070');
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should include proper tab separators', () => {
    const result = createGopherError('Error', 'localhost', 70);
    const tabs = result.match(/\t/g);
    expect(tabs).toHaveLength(3);
  });

  test('should start with error type character', () => {
    const result = createGopherError('Error', 'localhost', 70);
    expect(result.startsWith(GOPHER_ERROR_TYPE)).toBe(true);
  });

  test('should end with terminator', () => {
    const result = createGopherError('Error', 'localhost', 70);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});

describe('accessDenied', () => {
  test('should return access denied error message', () => {
    const hostname = 'localhost';
    const port = 70;
    const result = accessDenied(hostname, port);
    expect(result).toContain('Access denied');
    expect(result).toContain(hostname);
    expect(result).toContain('70');
  });

  test('should be properly formatted gopher error', () => {
    const result = accessDenied('test.com', 7070);
    expect(result.startsWith(GOPHER_ERROR_TYPE)).toBe(true);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});

describe('fileNotFound', () => {
  test('should return file not found error message', () => {
    const hostname = 'localhost';
    const port = 70;
    const result = fileNotFound(hostname, port);
    expect(result).toContain('File not found');
    expect(result).toContain(hostname);
    expect(result).toContain('70');
  });

  test('should be properly formatted gopher error', () => {
    const result = fileNotFound('test.com', 7070);
    expect(result.startsWith(GOPHER_ERROR_TYPE)).toBe(true);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});

describe('fileTooLarge', () => {
  test('should return file too large error message', () => {
    const hostname = 'localhost';
    const port = 70;
    const result = fileTooLarge(hostname, port);
    expect(result).toContain('File too large');
    expect(result).toContain(hostname);
    expect(result).toContain('70');
  });

  test('should be properly formatted gopher error', () => {
    const result = fileTooLarge('test.com', 7070);
    expect(result.startsWith(GOPHER_ERROR_TYPE)).toBe(true);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});

describe('internalError', () => {
  test('should return internal server error message', () => {
    const hostname = 'localhost';
    const port = 70;
    const result = internalError(hostname, port);
    expect(result).toContain('Internal server error');
    expect(result).toContain(hostname);
    expect(result).toContain('70');
  });

  test('should be properly formatted gopher error', () => {
    const result = internalError('test.com', 7070);
    expect(result.startsWith(GOPHER_ERROR_TYPE)).toBe(true);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});

describe('noDirectoryIndex', () => {
  test('should return no directory index error message', () => {
    const hostname = 'localhost';
    const port = 70;
    const result = noDirectoryIndex(hostname, port);
    expect(result).toContain('No directory index');
    expect(result).toContain(hostname);
    expect(result).toContain('70');
  });

  test('should be properly formatted gopher error', () => {
    const result = noDirectoryIndex('test.com', 7070);
    expect(result.startsWith(GOPHER_ERROR_TYPE)).toBe(true);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});
