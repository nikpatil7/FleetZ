import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    jti: { type: String, index: true, required: true },
    hashedToken: { type: String, required: true },
    expiresAt: { type: Date, index: true, required: true },
    revokedAt: { type: Date, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null }
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1, jti: 1 }, { unique: true });

export const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
export default RefreshToken;


