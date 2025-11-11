import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { serveDirectory } from '../../../src/handlers/directory.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { GOPHER_TERMINATOR } from '../../../src/constants.js';

describe('serveDirectory', () => {
  const hostname = 'localhost';
  const port = 70;
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `gopher-test-dir-${Date.now()}-${Math.random()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should serve gophermap successfully', async () => {
    const gophermapContent = 'iWelcome to my gopher hole\t\tlocalhost\t70\r\n0About\tabout.txt\tlocalhost\t70';
    await writeFile(join(testDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(testDir, hostname, port, maxFileSize);

    expect(result).toBe(gophermapContent + GOPHER_TERMINATOR);
  });

  test('should return error for gophermap too large', async () => {
    const smallMaxSize = 10;
    const gophermapContent = 'This content is larger than 10 bytes';
    await writeFile(join(testDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(testDir, hostname, port, smallMaxSize);

    expect(result).toContain('File too large');
    expect(result).toContain(hostname);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should return no directory index when gophermap does not exist', async () => {
    // testDir exists but has no gophermap
    const result = await serveDirectory(testDir, hostname, port, maxFileSize);

    expect(result).toContain('No directory index');
    expect(result).toContain(hostname);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should handle empty gophermap', async () => {
    await writeFile(join(testDir, 'gophermap'), '', 'utf8');

    const result = await serveDirectory(testDir, hostname, port, maxFileSize);

    expect(result).toBe(GOPHER_TERMINATOR);
  });

  test('should handle gophermap at exact max size', async () => {
    const exactSize = 100;
    const gophermapContent = 'i'.repeat(exactSize);
    await writeFile(join(testDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(testDir, hostname, port, exactSize);

    expect(result).toBe(gophermapContent + GOPHER_TERMINATOR);
  });

  test('should handle gophermap one byte over max size', async () => {
    const maxSize = 100;
    const gophermapContent = 'i'.repeat(maxSize + 1);
    await writeFile(join(testDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(testDir, hostname, port, maxSize);

    expect(result).toContain('File too large');
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should handle multiline gophermap content', async () => {
    const gophermapContent = 'iLine 1\t\tlocalhost\t70\r\niLine 2\t\tlocalhost\t70\r\niLine 3\t\tlocalhost\t70';
    await writeFile(join(testDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(testDir, hostname, port, maxFileSize);

    expect(result).toBe(gophermapContent + GOPHER_TERMINATOR);
  });

  test('should look for gophermap in correct directory', async () => {
    // Create nested directory
    const nestedDir = join(testDir, 'subdir');
    await mkdir(nestedDir, { recursive: true });

    const gophermapContent = 'iNested gophermap\t\tlocalhost\t70';
    await writeFile(join(nestedDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(nestedDir, hostname, port, maxFileSize);

    expect(result).toBe(gophermapContent + GOPHER_TERMINATOR);
  });

  test('should handle gophermap with special characters', async () => {
    const gophermapContent = 'iSpecial chars: !@#$%^&*()\t\tlocalhost\t70';
    await writeFile(join(testDir, 'gophermap'), gophermapContent, 'utf8');

    const result = await serveDirectory(testDir, hostname, port, maxFileSize);

    expect(result).toContain(gophermapContent);
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });

  test('should handle directory with other files but no gophermap', async () => {
    // Create some files but no gophermap
    await writeFile(join(testDir, 'file1.txt'), 'content1', 'utf8');
    await writeFile(join(testDir, 'file2.txt'), 'content2', 'utf8');

    const result = await serveDirectory(testDir, hostname, port, maxFileSize);

    expect(result).toContain('No directory index');
    expect(result.endsWith(GOPHER_TERMINATOR)).toBe(true);
  });
});
