import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { Server as SocketIOServer } from 'socket.io'
import mongoose from 'mongoose'
import env from './config/env.js'
import { setupSockets } from './sockets/index.js'
import userRoutes from './routes/users.js'
import orderRoutes from './routes/orders.js'
import vehicleRoutes from './routes/vehicles.js'
import trackingRoutes from './routes/tracking.js'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.corsOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
app.use('/api/auth', authLimiter)

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

import authRoutes from './routes/auth.js'
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/tracking', trackingRoutes)

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: env.corsOrigin, credentials: true },
})
setupSockets(io)

async function start() {
  try {
    await mongoose.connect(env.mongoUri)
    server.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on http://localhost:${env.port}`)
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  start()
}

export { app, server, io }
