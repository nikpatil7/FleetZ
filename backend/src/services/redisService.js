// redisService.js
import Redis from 'ioredis'
import env from '../config/env.js'

const redis = new Redis(env.redisUrl || 'redis://localhost:6379')

export async function cacheSet(key, value, ttl = 60) {
  await redis.set(key, JSON.stringify(value), 'EX', ttl)
}

export async function cacheGet(key) {
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

export async function cacheDel(key) {
  await redis.del(key)
}

export default redis
