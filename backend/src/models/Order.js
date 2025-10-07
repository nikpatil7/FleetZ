import mongoose from 'mongoose'

const AddressSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    address: String,
  },
  { _id: false }
)

const OrderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{ title: String, qty: Number, price: Number }],
    pickup: AddressSchema,
    dropoff: AddressSchema,
    assignedRiderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'accepted', 'picked_up', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    estimatedDeliveryTime: Date,
  },
  { timestamps: true }
)

OrderSchema.index({ createdAt: -1 })

export const Order = mongoose.model('Order', OrderSchema)
export default Order

