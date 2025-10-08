import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import Location from '../models/Location.js'

export function setupSockets(io) {
  const latestByRider = new Map()
  let broadcastTimer = null
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('unauthorized'))
      const payload = jwt.verify(token, env.jwtSecret)
      // eslint-disable-next-line no-param-reassign
      socket.user = payload
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

