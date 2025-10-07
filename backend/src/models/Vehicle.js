import mongoose from 'mongoose'

const VehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['bike', 'car', 'van'], required: true },
    capacity: { type: Number, default: 0 },
    currentDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    isActive: { type: Boolean, default: true },
    trackingEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Vehicle = mongoose.model('Vehicle', VehicleSchema)
export default Vehicle

