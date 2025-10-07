import { Router } from 'express'
import Joi from 'joi'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js'

const router = Router()

router.get('/', authenticate, authorize(['admin']), listUsers)

const createSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'manager', 'driver').required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('', null),
  vehicle: Joi.object({ type: Joi.string(), plate: Joi.string() }).optional(),
})

router.post('/', authenticate, authorize(['admin']), validate(createSchema), createUser)

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(120).optional(),
  role: Joi.string().valid('admin', 'manager', 'driver').optional(),
  phone: Joi.string().allow('', null).optional(),
  vehicle: Joi.object({ type: Joi.string(), plate: Joi.string() }).optional(),
  password: Joi.string().min(6).optional(),
})

router.put('/:id', authenticate, authorize(['admin']), validate(updateSchema), updateUser)

router.delete('/:id', authenticate, authorize(['admin']), deleteUser)

export default router

