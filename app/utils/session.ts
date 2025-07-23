import { randomBytes } from 'crypto';

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Check if a session token is valid format
 */
export function isValidSessionToken(token: string): boolean {
  return typeof token === 'string' && 
         token.length === 64 && 
         /^[a-f0-9]+$/.test(token);
}

/**
 * Calculate session expiry time (24 hours from now)
 */
export function getSessionExpiryTime(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}