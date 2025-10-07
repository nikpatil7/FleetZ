import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  return res.json({ ok: true, data: [] })
})

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  return res.status(201).json({ ok: true, data: { id: 'new_vehicle_id' } })
})

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  return res.json({ ok: true })
})

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  return res.json({ ok: true })
})

export default router

