import request from 'supertest'
import mongoose from 'mongoose'
import { app, server } from '../src/server.js'
import env from '../src/config/env.js'
import User from '../src/models/User.js'
import bcrypt from 'bcryptjs'

describe('Auth API', () => {
  beforeAll(async () => {
    await mongoose.connect(env.mongoUri)
    await User.deleteMany({})
    const hash = await bcrypt.hash('password123', 10)
    await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', passwordHash: hash })
  })

  afterAll(async () => {
    await mongoose.disconnect()
    server.close()
  })

  it('should login and get tokens', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.data.accessToken).toBeTruthy()
  })
})

