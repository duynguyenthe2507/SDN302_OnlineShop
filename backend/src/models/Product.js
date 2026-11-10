const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 180, index: 'text' },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  images: [{ type: String }],
  sizes: [{ type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'] }],
  colors: [{ type: String, trim: true }],
  stock: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
productSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Product', productSchema);
