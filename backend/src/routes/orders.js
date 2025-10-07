import { Router } from 'express'
import Joi from 'joi'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { listOrders, createOrder, assignOrder, updateOrderStatus } from '../controllers/orderController.js'

const router = Router()

router.get('/', authenticate, listOrders)

const createSchema = Joi.object({
  items: Joi.array().items(Joi.object({ title: Joi.string().required(), qty: Joi.number().min(1).required(), price: Joi.number().min(0).required() })).min(1).required(),
  pickup: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required(), address: Joi.string().allow('').optional() }).required(),
  dropoff: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required(), address: Joi.string().allow('').optional() }).required(),
  estimatedDeliveryTime: Joi.date().optional(),
})

router.post('/', authenticate, authorize(['admin', 'manager']), validate(createSchema), createOrder)

router.put('/:id', authenticate, authorize(['admin', 'manager']), (req, res) => res.json({ ok: true }))

const assignSchema = Joi.object({ riderId: Joi.string().required() })
router.put('/:id/assign', authenticate, authorize(['manager', 'admin']), validate(assignSchema), assignOrder)

const statusSchema = Joi.object({ status: Joi.string().valid('pending','assigned','accepted','picked_up','delivered','cancelled').required() })
router.put('/:id/status', authenticate, authorize(['driver', 'manager', 'admin']), validate(statusSchema), updateOrderStatus)

export default router

