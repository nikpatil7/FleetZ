import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import User from '../models/User.js'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.user = payload
    return next()
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Invalid token' })
  }
}

export function authorize(roles = []) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
    if (roles.length === 0) return next()
    if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, error: 'Forbidden' })
    return next()
  }
}

export async function attachUser(req, res, next) {
  if (!req.user?.id) return next()
  const user = await User.findById(req.user.id).lean()
  req.userDoc = user || null
  return next()
}

