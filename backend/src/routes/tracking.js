import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.post('/location', authenticate, authorize(['driver']), async (req, res) => {
  return res.status(201).json({ ok: true })
})

router.get('/drivers', authenticate, authorize(['manager', 'admin']), async (req, res) => {
  return res.json({ ok: true, data: [] })
})

router.get('/driver/:id', authenticate, authorize(['manager', 'admin']), async (req, res) => {
  return res.json({ ok: true, data: null })
})

export default router

