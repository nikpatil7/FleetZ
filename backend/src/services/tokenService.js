import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import RefreshToken from '../models/RefreshToken.js';

export function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpire || '15m',
    issuer: 'smart-delivery-api',
    audience: 'smart-delivery-clients'
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpire || '7d',
    issuer: 'smart-delivery-api',
    audience: 'smart-delivery-clients'
  });
}

export async function persistRefreshToken({ userId, jti, refreshToken, expiresInMs, ip, userAgent }) {
  const hashedToken = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + expiresInMs);
  await RefreshToken.create({ userId, jti, hashedToken, expiresAt, ip, userAgent });
}

export async function revokeRefreshTokenByJti(userId, jti) {
  await RefreshToken.updateOne({ userId, jti, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllUserRefreshTokens(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function isRefreshTokenValid({ userId, jti, token }) {
  const hashed = hashToken(token);
  const doc = await RefreshToken.findOne({ userId, jti });
  if (!doc) return { valid: false, reason: 'not_found' };
  if (doc.revokedAt) return { valid: false, reason: 'revoked' };
  if (doc.hashedToken !== hashed) return { valid: false, reason: 'hash_mismatch' };
  if (doc.expiresAt <= new Date()) return { valid: false, reason: 'expired' };
  return { valid: true };
}

export function msFromJwtExp(expiresIn) {
  // Rough conversion for common strings; fallback to 7d
  if (typeof expiresIn === 'number') return expiresIn * 1000;
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return val * multipliers[unit];
}


