import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Vehicle from '../models/Vehicle.js'

const router = Router()

router.get('/dashboard', authenticate, authorize(['admin']), async (req, res) => {
  const [totalOrders, delivered, failed, assigned, drivers, activeDrivers, vehicles] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: 'cancelled' }),
    Order.countDocuments({ status: 'assigned' }),
    User.countDocuments({ role: 'driver' }),
    User.countDocuments({ role: 'driver', status: { $in: ['active', 'on_trip'] } }),
    Vehicle.countDocuments({}),
  ])

  return res.json({
    ok: true,
    data: {
      totalOrders,
      delivered,
      failed,
      assigned,
      drivers,
      activeDrivers,
      vehicles,
    },
  })
})

export default router


