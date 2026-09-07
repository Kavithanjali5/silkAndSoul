const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    orders: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    avatar: { type: String, default: '' },
    joined: { type: String, default: () => new Date().toISOString().slice(0, 10) }
  },
  { timestamps: true }
);

userSchema.pre('save', function setAvatar(next) {
  if (!this.avatar && this.name) {
    this.avatar = this.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  next();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
