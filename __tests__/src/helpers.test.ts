import { describe, expect, test } from '@jest/globals';
import { formatGopherResponse } from '../../src/helpers.js';
import { GOPHER_TERMINATOR } from '../../src/constants.js';

describe('formatGopherResponse', () => {
  test('should append gopher terminator to content', () => {
    const content = 'Hello, Gopher!';
    const expected = `Hello, Gopher!${GOPHER_TERMINATOR}`;
    const result = formatGopherResponse(content);
    expect(result).toBe(expected);
  });

  test('should handle empty string', () => {
    const content = '';
    const expected = GOPHER_TERMINATOR;
    const result = formatGopherResponse(content);
    expect(result).toBe(expected);
  });

  test('should handle multiline content', () => {
    const content = 'Line 1\r\nLine 2\r\nLine 3';
    const expected = `Line 1\r\nLine 2\r\nLine 3${GOPHER_TERMINATOR}`;
    const result = formatGopherResponse(content);
    expect(result).toBe(expected);
  });

  test('should verify terminator format', () => {
    const content = 'Test content';
    const result = formatGopherResponse(content);
    expect(result.endsWith('\r\n.\r\n')).toBe(true);
  });

  test('should not modify the original content before terminator', () => {
    const content = 'Original content';
    const result = formatGopherResponse(content);
    expect(result.slice(0, -GOPHER_TERMINATOR.length)).toBe(content);
  });
});
