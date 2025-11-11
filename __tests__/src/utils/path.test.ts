import { describe, expect, test } from '@jest/globals';
import { validatePath, resolveSafePath } from '../../../src/utils/path.js';
import { join, sep } from 'path';

describe('validatePath', () => {
  test('should allow path within root directory', () => {
    const root = '/var/gopher';
    const requestedPath = '/var/gopher/test.txt';
    expect(validatePath(requestedPath, root)).toBe(true);
  });

  test('should allow path equal to root directory', () => {
    const root = '/var/gopher';
    const requestedPath = '/var/gopher';
    expect(validatePath(requestedPath, root)).toBe(true);
  });

  test('should reject path outside root directory', () => {
    const root = '/var/gopher';
    const requestedPath = '/var/other';
    expect(validatePath(requestedPath, root)).toBe(false);
  });

  test('should reject path attempting directory traversal', () => {
    const root = '/var/gopher';
    const requestedPath = '/var/gopher/../../../etc/passwd';
    expect(validatePath(requestedPath, root)).toBe(false);
  });

  test('should handle nested directories within root', () => {
    const root = '/var/gopher';
    const requestedPath = '/var/gopher/sub/dir/file.txt';
    expect(validatePath(requestedPath, root)).toBe(true);
  });

  test('should handle relative root paths', () => {
    const root = './public';
    const requestedPath = join(process.cwd(), 'public', 'test.txt');
    expect(validatePath(requestedPath, root)).toBe(true);
  });
});

describe('resolveSafePath', () => {
  test('should resolve empty path to root', () => {
    const root = '/var/gopher';
    const result = resolveSafePath('', root);
    expect(result).toBe(root);
  });

  test('should resolve "/" to root', () => {
    const root = '/var/gopher';
    const result = resolveSafePath('/', root);
    expect(result).toBe(root);
  });

  test('should resolve valid path within root', () => {
    const root = '/var/gopher';
    const path = 'test.txt';
    const result = resolveSafePath(path, root);
    expect(result).toBe(join(root, path));
  });

  test('should return null for path traversal attempts', () => {
    const root = '/var/gopher';
    const path = '../../../etc/passwd';
    const result = resolveSafePath(path, root);
    expect(result).toBeNull();
  });

  test('should normalize paths with multiple slashes', () => {
    const root = '/var/gopher';
    const path = 'sub//dir///file.txt';
    const result = resolveSafePath(path, root);
    expect(result).toBe(join(root, 'sub', 'dir', 'file.txt'));
  });

  test('should handle paths with dots correctly within bounds', () => {
    const root = '/var/gopher';
    const path = 'sub/./dir/file.txt';
    const result = resolveSafePath(path, root);
    expect(result).toBe(join(root, 'sub', 'dir', 'file.txt'));
  });

  test('should return null for paths attempting to escape root', () => {
    const root = '/var/gopher';
    const path = 'sub/../../outside';
    const result = resolveSafePath(path, root);
    expect(result).toBeNull();
  });

  test('should handle nested directory structures', () => {
    const root = '/var/gopher';
    const path = 'level1/level2/level3/file.txt';
    const result = resolveSafePath(path, root);
    expect(result).toBe(join(root, 'level1', 'level2', 'level3', 'file.txt'));
  });
});
