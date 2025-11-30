/**
 * Cryptographic Utilities
 * Functions for encryption, hashing, and secure operations
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @param key - 32-byte hex encryption key
 * @returns Encrypted string in format: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, key: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyBuffer = Buffer.from(key, 'hex');

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param ciphertext - Encrypted string in format: iv:authTag:ciphertext
 * @param key - 32-byte hex encryption key
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid ciphertext format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const keyBuffer = Buffer.from(key, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash a string using SHA-256
 * @param input - String to hash
 * @returns Hex-encoded hash
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a cryptographically secure random string
 * @param length - Number of random bytes (output will be hex, so 2x length)
 * @returns Random hex string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create an HMAC-SHA256 signature
 * @param payload - Data to sign
 * @param secret - Secret key
 * @returns Hex-encoded signature
 */
export function hmacSha256(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Timing-safe string comparison
 * @param a - First string
 * @param b - Second string
 * @returns Whether strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
