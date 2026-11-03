import { afterEach, describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../utils/encryption';

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const originalKey = process.env.ENCRYPTION_KEY;

function setTestKey() { process.env.ENCRYPTION_KEY = TEST_KEY; }

afterEach(() => {
  if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalKey;
});

describe('AES-256-GCM credential encryption', () => {
  it('round-trips SMTP and OAuth credentials', () => {
    setTestKey();
    const secret = 'xoxb-test-token-or-smtp-password';
    const encrypted = encrypt(secret);
    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decrypt(encrypted)).toBe(secret);
  });

  it('rejects tampered ciphertext', () => {
    setTestKey();
    const encrypted = encrypt('sensitive-value');
    const [iv, data, tag] = encrypted.split(':');
    const changedData = `${data[0] === '0' ? '1' : '0'}${data.slice(1)}`;
    const tampered = `${iv}:${changedData}:${tag}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('rejects a missing or malformed encryption key', () => {
    process.env.ENCRYPTION_KEY = 'not-a-key';
    expect(() => encrypt('value')).toThrow(/ENCRYPTION_KEY/);
  });
});
