const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, unique: true },
    orderId: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['UPI', 'Card', 'Net Banking', 'COD'], default: 'UPI' },
    status: {
      type: String,
      enum: ['completed', 'pending', 'processing', 'failed', 'refunded'],
      default: 'pending'
    },
    product: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

paymentSchema.pre('save', function ensureIds(next) {
  if (!this.paymentId) this.paymentId = `PAY-${Date.now().toString().slice(-8)}`;
  if (!this.orderId) this.orderId = `ORD-${Date.now().toString().slice(-8)}`;
  next();
});

paymentSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret.paymentId || ret._id.toString();
    ret._mongoId = ret._id.toString();
    if (ret.userId) ret.userId = ret.userId.toString();
    if (ret.date instanceof Date) ret.date = ret.date.toISOString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
