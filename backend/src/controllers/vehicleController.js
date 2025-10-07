import Vehicle from '../models/Vehicle.js'
import User from '../models/User.js'

export async function listVehicles(req, res) {
  const vehicles = await Vehicle.find({}).lean()
  return res.json({ ok: true, data: vehicles })
}

export async function createVehicle(req, res) {
  const { vehicleNumber, type, capacity, currentDriver, isActive, trackingEnabled } = req.body
  const exists = await Vehicle.findOne({ vehicleNumber })
  if (exists) return res.status(409).json({ ok: false, error: 'Vehicle number exists' })
  const doc = await Vehicle.create({ vehicleNumber, type, capacity, currentDriver, isActive, trackingEnabled })
  return res.status(201).json({ ok: true, data: { id: doc._id } })
}

export async function updateVehicle(req, res) {
  const { id } = req.params
  const { type, capacity, currentDriver, isActive, trackingEnabled } = req.body
  await Vehicle.updateOne({ _id: id }, { $set: { type, capacity, currentDriver, isActive, trackingEnabled } })
  return res.json({ ok: true })
}

export async function deleteVehicle(req, res) {
  const { id } = req.params
  await Vehicle.deleteOne({ _id: id })
  return res.json({ ok: true })
}

export async function assignDriver(req, res) {
  const { id } = req.params
  const { driverId } = req.body
  const driver = await User.findOne({ _id: driverId, role: 'driver' })
  if (!driver) return res.status(404).json({ ok: false, error: 'Driver not found' })

  // Ensure the driver is not assigned to another vehicle
  await Vehicle.updateMany({ currentDriver: driverId }, { $set: { currentDriver: null } })
  await Vehicle.updateOne({ _id: id }, { $set: { currentDriver: driverId } })
  return res.json({ ok: true })
}


