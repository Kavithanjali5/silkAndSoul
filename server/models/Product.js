const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, lowercase: true, trim: true },
    fabric: { type: String, default: 'silk', trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null },
    image: { type: String, default: 'images/products/saree-01.svg' },
    images: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    occasion: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    description: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    new: { type: Boolean, default: false },
    sku: { type: String, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 8, min: 0 },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'out_of_stock'
    },
    inStock: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.pre('save', function syncStatus(next) {
  if (this.stock <= 0) {
    this.status = 'out_of_stock';
    this.inStock = false;
  } else if (this.stock <= this.reorderLevel) {
    this.status = 'low_stock';
    this.inStock = true;
  } else {
    this.status = 'in_stock';
    this.inStock = true;
  }
  if (!this.images?.length && this.image) this.images = [this.image];
  if (!this.sku) this.sku = `SS-${Date.now().toString().slice(-6)}`;
  next();
});

productSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Product', productSchema);
