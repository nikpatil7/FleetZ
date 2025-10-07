import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    role: { type: String, enum: ['admin', 'manager', 'driver'], required: true, index: true },
    passwordHash: { type: String, required: true },
    vehicle: {
      type: { type: String },
      plate: { type: String },
    },
    status: { type: String, enum: ['active', 'inactive', 'on_trip'], default: 'active' },
    lastSeen: { type: Date },
  },
  { timestamps: true }
)

UserSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash)
}

export const User = mongoose.model('User', UserSchema)
export default User

