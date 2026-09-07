const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    admin: { type: String, required: true },
    action: { type: String, required: true },
    type: { type: String, enum: ['inventory', 'payment', 'user', 'admin'], default: 'admin' },
    time: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

activitySchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    if (ret.time instanceof Date) ret.time = ret.time.toISOString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Activity', activitySchema);
