import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { login, refresh, me } from '../controllers/authController.js'

const router = Router()

router.post('/login', login)
router.post('/refresh', refresh)
router.get('/me', authenticate, me)

export default router

