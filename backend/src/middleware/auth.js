import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import { errorResponse } from '../utils/response.js';
import httpStatus from 'http-status';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return errorResponse(res, 'No token provided', httpStatus.UNAUTHORIZED);
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: 'smart-delivery-api',
      audience: 'smart-delivery-clients'
    });
    // Validate tokenVersion live
    const user = await User.findById(payload.id).select('tokenVersion isActive role');
    if (!user || !user.isActive) {
      return errorResponse(res, 'Invalid token', httpStatus.UNAUTHORIZED);
    }
    if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== user.tokenVersion) {
      return errorResponse(res, 'Token expired', httpStatus.UNAUTHORIZED);
    }
    req.user = { id: String(user._id), role: user.role, tokenVersion: user.tokenVersion };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', httpStatus.UNAUTHORIZED);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', httpStatus.UNAUTHORIZED);
    }
    return errorResponse(res, 'Token verification failed', httpStatus.UNAUTHORIZED);
  }
}

export function authorize(roles = []) {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Access denied. No user found.', httpStatus.UNAUTHORIZED);
    }

    if (roles.length === 0) return next();
    
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied. Insufficient permissions.', httpStatus.FORBIDDEN);
    }

    return next();
  };
}

export async function attachUser(req, res, next) {
  if (!req.user?.id) return next();
  
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    
    if (!user) {
      return errorResponse(res, 'User not found', httpStatus.UNAUTHORIZED);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', httpStatus.UNAUTHORIZED);
    }

    req.userDoc = user;
    return next();
  } catch (error) {
    return errorResponse(res, 'User verification failed', httpStatus.UNAUTHORIZED);
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.id).select('-passwordHash');
    
    if (user && user.isActive) {
      req.user = payload;
      req.userDoc = user;
    }
    
    return next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    return next();
  }
}