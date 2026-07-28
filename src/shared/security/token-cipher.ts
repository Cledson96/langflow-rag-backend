import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const algorithm = 'aes-256-gcm';
const version = 'v1';

export class TokenCipher {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    this.key = Buffer.from(hexKey, 'hex');
    if (this.key.length !== 32) throw new Error('Google token encryption key must contain 32 bytes');
  }

  encrypt(value: string): string {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(algorithm, this.key, initializationVector);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authenticationTag = cipher.getAuthTag();

    return [
      version,
      initializationVector.toString('base64url'),
      authenticationTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [payloadVersion, encodedIv, encodedTag, encodedValue] = value.split('.');
    if (payloadVersion !== version || !encodedIv || !encodedTag || !encodedValue) {
      throw new Error('Invalid encrypted token');
    }

    const decipher = createDecipheriv(algorithm, this.key, Buffer.from(encodedIv, 'base64url'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encodedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
