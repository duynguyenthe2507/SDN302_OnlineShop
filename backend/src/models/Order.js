const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true }, image: { type: String, default: '' },
    size: { type: String, default: '' }, color: { type: String, default: 'default' },
    quantity: { type: Number, required: true, min: 1 }, price: { type: Number, required: true, min: 0 }
  }],
  name: { type: String, required: true, trim: true }, phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  paymentMethod: { type: String, enum: ['cod', 'bank'], default: 'cod' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  status: { type: String, enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'], default: 'pending', index: true },
  totalPrice: { type: Number, required: true, min: 0 }
}, { timestamps: true });
orderSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Order', orderSchema);
