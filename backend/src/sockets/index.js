import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import Location from '../models/Location.js'
import User from '../models/User.js'

export function setupSockets(io) {
  const latestByRider = new Map()
  let broadcastTimer = null
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('unauthorized'))
      const payload = jwt.verify(token, env.jwtSecret, {
        issuer: 'smart-delivery-api',
        audience: 'smart-delivery-clients'
      })
      const user = await User.findById(payload.id).select('tokenVersion isActive role')
      if (!user || !user.isActive) return next(new Error('unauthorized'))
      if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== user.tokenVersion) {
        return next(new Error('unauthorized'))
      }
      // eslint-disable-next-line no-param-reassign
      socket.user = { id: String(user._id), role: user.role, tokenVersion: user.tokenVersion }
      return next()
    } catch (e) {
      return next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    if (socket.user.role === 'manager' || socket.user.role === 'admin') {
      socket.join('managers')
    }
    if (socket.user.role === 'driver') {
      socket.join(`rider:${socket.user.id}`)
    }

    socket.on('rider:location', async (payload) => {
      try {
        const coords = payload?.coords
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return
        const doc = { riderId: socket.user.id, coords, speed: payload?.speed, heading: payload?.heading, ts: new Date() }
        latestByRider.set(String(socket.user.id), doc)
        await Location.create(doc)
        // lazy start broadcaster
        if (!broadcastTimer) {
          broadcastTimer = setInterval(() => {
            if (latestByRider.size === 0) return
            const riders = Array.from(latestByRider.values())
            io.to('managers').emit('fleet:update', { riders })
          }, 5000)
        }
      } catch {
        // swallow errors
      }
    })

    socket.on('disconnect', () => {})
  })
}

export default setupSockets

