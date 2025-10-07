import { Router } from 'express'
import Joi from 'joi'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import Location from '../models/Location.js'
import { io } from '../server.js'

const router = Router()

const locationSchema = Joi.object({ coords: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() }).required(), speed: Joi.number().optional(), heading: Joi.number().optional() })
router.post('/location', authenticate, authorize(['driver']), validate(locationSchema), async (req, res) => {
  const payload = { riderId: req.user.id, ...req.body, ts: new Date() }
  await Location.create(payload)
  io.to('managers').emit('fleet:update', { riders: [{ riderId: req.user.id, ...req.body }] })
  return res.status(201).json({ ok: true })
})

router.get('/drivers', authenticate, authorize(['manager', 'admin']), async (req, res) => {
  const latest = await Location.aggregate([
    { $sort: { riderId: 1, ts: -1 } },
    { $group: { _id: '$riderId', doc: { $first: '$$ROOT' } } },
  ])
  return res.json({ ok: true, data: latest.map((x) => x.doc) })
})

router.get('/driver/:id', authenticate, authorize(['manager', 'admin']), async (req, res) => {
  const { id } = req.params
  const history = await Location.find({ riderId: id }).sort({ ts: -1 }).limit(100).lean()
  return res.json({ ok: true, data: history })
})

export default router

