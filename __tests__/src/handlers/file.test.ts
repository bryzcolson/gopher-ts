import { describe, expect, test } from '@jest/globals';
import { serveFile } from '../../../src/handlers/file.js';
import { writeFile, mkdir, rm, chmod } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { GOPHER_TERMINATOR } from '../../../src/constants.js';

describe('serveFile', () => {
  const hostname = 'localhost';
  const port = 70;
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gopher-test-${Date.now()}-${Math.random()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should serve file successfully', async () => {
    const filePath = join(testDir, 'test.txt');
    const fileContent = 'Hello, Gopher!';
    await writeFile(filePath, fileContent, 'utf8');

    const result = await serveFile(filePath, hostname, port, maxFileSize);

    expect(result).toBe(fileContent + GOPHER_TERMINATOR);
  });

  test('should return error for file too large', async () => {
    const filePath = join(testDir, 'large.txt');
    const smallMaxSize = 10;
    const fileContent = 'This content is larger than 10 bytes';
    await writeFile(filePath, fileContent, 'utf8');

    const result = await serveFile(filePath, hostname, port, smallMaxSize);

    expect(result).toContain('File too large');
    expect(result).toContain(hostname);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should return file not found for non-existent file', async () => {
    const filePath = join(testDir, 'nonexistent.txt');

    const result = await serveFile(filePath, hostname, port, maxFileSize);

    expect(result).toContain('File not found');
    expect(result).toContain(hostname);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should handle empty files', async () => {
    const filePath = join(testDir, 'empty.txt');
    await writeFile(filePath, '', 'utf8');

    const result = await serveFile(filePath, hostname, port, maxFileSize);

    expect(result).toBe(GOPHER_TERMINATOR);
  });

  test('should handle multiline content', async () => {
    const filePath = join(testDir, 'multiline.txt');
    const fileContent = 'Line 1\r\nLine 2\r\nLine 3';
    await writeFile(filePath, fileContent, 'utf8');

    const result = await serveFile(filePath, hostname, port, maxFileSize);

    expect(result).toBe(fileContent + GOPHER_TERMINATOR);
  });

  test('should handle file at exact max size', async () => {
    const filePath = join(testDir, 'exact.txt');
    const exactSize = 100;
    const fileContent = 'A'.repeat(exactSize);
    await writeFile(filePath, fileContent, 'utf8');

    const result = await serveFile(filePath, hostname, port, exactSize);

    expect(result).toBe(fileContent + GOPHER_TERMINATOR);
  });

  test('should handle file one byte over max size', async () => {
    const filePath = join(testDir, 'oversize.txt');
    const maxSize = 100;
    const fileContent = 'A'.repeat(maxSize + 1);
    await writeFile(filePath, fileContent, 'utf8');

    const result = await serveFile(filePath, hostname, port, maxSize);

    expect(result).toContain('File too large');
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should serve file with special characters', async () => {
    const filePath = join(testDir, 'special.txt');
    const fileContent = 'Special: !@#$%^&*()_+-=[]{}|;:\'",./<>?`~';
    await writeFile(filePath, fileContent, 'utf8');

    const result = await serveFile(filePath, hostname, port, maxFileSize);

    expect(result).toContain(fileContent);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});
