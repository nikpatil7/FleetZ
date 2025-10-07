import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import env from '../config/env.js'
import User from '../models/User.js'

function signTokens(user) {
  const payload = { id: user._id.toString(), role: user.role, email: user.email }
  const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpire })
  const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpire })
  return { accessToken, refreshToken }
}

export async function login(req, res) {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' })
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' })
  const valid = await user.verifyPassword(password)
  if (!valid) return res.status(401).json({ ok: false, error: 'Invalid credentials' })
  const tokens = signTokens(user)
  return res.json({ ok: true, data: { user: { id: user._id, name: user.name, role: user.role, email: user.email }, ...tokens } })
}

export async function refresh(req, res) {
  const { refreshToken } = req.body || {}
  if (!refreshToken) return res.status(400).json({ ok: false, error: 'Missing refresh token' })
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret)
    const user = await User.findById(payload.id)
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid token' })
    const tokens = signTokens(user)
    return res.json({ ok: true, data: tokens })
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Invalid token' })
  }
}

export async function me(req, res) {
  if (!req.user) return res.status(401).json({ ok: false, error: 'Unauthenticated' })
  const user = await User.findById(req.user.id).lean()
  if (!user) return res.status(404).json({ ok: false, error: 'Not found' })
  return res.json({ ok: true, data: { id: user._id, name: user.name, role: user.role, email: user.email } })
}

