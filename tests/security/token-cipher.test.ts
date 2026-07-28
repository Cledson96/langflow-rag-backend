import { describe, expect, it } from 'vitest';

import { TokenCipher } from '@/shared/security/token-cipher';

describe('TokenCipher', () => {
  it('encrypts tokens with authenticated encryption and decrypts them', () => {
    const cipher = new TokenCipher('ab'.repeat(32));
    const encrypted = cipher.encrypt('refresh-token-secreto');

    expect(encrypted).not.toContain('refresh-token-secreto');
    expect(cipher.decrypt(encrypted)).toBe('refresh-token-secreto');
  });

  it('rejects a modified encrypted token', () => {
    const cipher = new TokenCipher('cd'.repeat(32));
    const encrypted = cipher.encrypt('access-token');
    const modified = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`;

    expect(() => cipher.decrypt(modified)).toThrow();
  });
});
