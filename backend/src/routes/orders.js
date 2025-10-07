import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  return res.json({ ok: true, data: [] })
})

router.post('/', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  return res.status(201).json({ ok: true, data: { id: 'new_order_id' } })
})

router.put('/:id', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  return res.json({ ok: true })
})

router.put('/:id/assign', authenticate, authorize(['manager', 'admin']), async (req, res) => {
  return res.json({ ok: true })
})

router.put('/:id/status', authenticate, authorize(['driver', 'manager', 'admin']), async (req, res) => {
  return res.json({ ok: true })
})

export default router

