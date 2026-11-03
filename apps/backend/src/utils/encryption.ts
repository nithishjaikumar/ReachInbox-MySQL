import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be configured as 64 hexadecimal characters (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
}

export function isEncryptedPayload(payload: string): boolean {
  const parts = payload.split(':');
  return parts.length === 3 && /^(?:[a-fA-F0-9]{24}|[a-fA-F0-9]{32})$/.test(parts[0]) && /^[a-fA-F0-9]+$/.test(parts[1]) && /^[a-fA-F0-9]{32}$/.test(parts[2]);
}

export function decrypt(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
  const [ivHex, encryptedHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  if (![12, 16].includes(iv.length) || authTag.length !== 16) throw new Error('Invalid encrypted payload');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
