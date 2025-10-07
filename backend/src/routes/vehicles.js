import { Router } from 'express'
import Joi from 'joi'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { listVehicles, createVehicle, updateVehicle, deleteVehicle, assignDriver } from '../controllers/vehicleController.js'

const router = Router()

router.get('/', authenticate, authorize(['admin', 'manager']), listVehicles)

const createSchema = Joi.object({
  vehicleNumber: Joi.string().required(),
  type: Joi.string().valid('bike','car','van').required(),
  capacity: Joi.number().min(0).optional(),
  currentDriver: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  trackingEnabled: Joi.boolean().optional(),
})
router.post('/', authenticate, authorize(['admin']), validate(createSchema), createVehicle)

const updateSchema = Joi.object({
  type: Joi.string().valid('bike','car','van').optional(),
  capacity: Joi.number().min(0).optional(),
  currentDriver: Joi.string().allow(null,'').optional(),
  isActive: Joi.boolean().optional(),
  trackingEnabled: Joi.boolean().optional(),
})
router.put('/:id', authenticate, authorize(['admin']), validate(updateSchema), updateVehicle)

router.delete('/:id', authenticate, authorize(['admin']), deleteVehicle)

const assignSchema = Joi.object({ driverId: Joi.string().required() })
router.post('/:id/assign', authenticate, authorize(['admin', 'manager']), validate(assignSchema), assignDriver)

export default router

