import Order from '../models/Order.js'
import { io } from '../server.js'

export async function listOrders(req, res) {
  const query = {}
  if (req.user.role === 'driver') {
    query.assignedRiderId = req.user.id
  }
  const orders = await Order.find(query).sort({ createdAt: -1 }).lean()
  return res.json({ ok: true, data: orders })
}

export async function createOrder(req, res) {
  const { items, pickup, dropoff, estimatedDeliveryTime } = req.body
  const order = await Order.create({ items, pickup, dropoff, estimatedDeliveryTime })
  return res.status(201).json({ ok: true, data: { id: order._id } })
}

export async function assignOrder(req, res) {
  const { id } = req.params
  const { riderId } = req.body
  const order = await Order.findByIdAndUpdate(
    id,
    { $set: { assignedRiderId: riderId, status: 'assigned' } },
    { new: true }
  ).lean()
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' })
  io.to('managers').emit('order:assigned', { orderId: id, riderId })
  return res.json({ ok: true, data: { id } })
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params
  const { status } = req.body
  const allowed = [ 'pending', 'assigned', 'accepted', 'picked_up', 'delivered', 'cancelled' ]
  if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: 'Invalid status' })
  const order = await Order.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean()
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' })
  io.to('managers').emit('order:status', { orderId: id, status })
  return res.json({ ok: true })
}


