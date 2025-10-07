import bcrypt from 'bcryptjs'
import User from '../models/User.js'

export async function listUsers(req, res) {
  const users = await User.find({}).select('-passwordHash').lean()
  return res.json({ ok: true, data: users })
}

export async function createUser(req, res) {
  const { name, email, role, password, phone, vehicle } = req.body
  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ ok: false, error: 'Email already exists' })
  const passwordHash = await bcrypt.hash(password, 10)
  const doc = await User.create({ name, email, role, passwordHash, phone, vehicle })
  return res.status(201).json({ ok: true, data: { id: doc._id } })
}

export async function updateUser(req, res) {
  const { id } = req.params
  const { name, role, phone, vehicle, password } = req.body
  const update = { name, role, phone, vehicle }
  if (password) update.passwordHash = await bcrypt.hash(password, 10)
  await User.updateOne({ _id: id }, { $set: update })
  return res.json({ ok: true })
}

export async function deleteUser(req, res) {
  const { id } = req.params
  await User.deleteOne({ _id: id })
  return res.json({ ok: true })
}


