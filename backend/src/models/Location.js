import mongoose from 'mongoose'

const LocationSchema = new mongoose.Schema(
  {
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    coords: { lat: Number, lng: Number },
    speed: Number,
    heading: Number,
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

LocationSchema.index({ riderId: 1, ts: -1 })

export const Location = mongoose.model('Location', LocationSchema)
export default Location

