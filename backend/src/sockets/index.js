import jwt from 'jsonwebtoken'
import env from '../config/env.js'

export function setupSockets(io) {
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

    socket.on('rider:location', (payload) => {
      // TODO store/update last-known location, then broadcast aggregate
      io.to('managers').emit('fleet:update', { riders: [{ riderId: socket.user.id, ...payload }] })
    })

    socket.on('disconnect', () => {})
  })
}

export default setupSockets

