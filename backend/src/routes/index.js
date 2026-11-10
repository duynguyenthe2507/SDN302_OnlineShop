const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { authenticate, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role });
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/health', (req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

// Authentication and profile
router.post('/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Vui lòng nhập họ tên, email và mật khẩu.' });
  if (password.length < 8) return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
  if (await User.exists({ email: String(email).toLowerCase().trim() })) return res.status(409).json({ message: 'Email đã được sử dụng.' });
  const user = await User.create({ name, email, password, phone: req.body.phone, address: req.body.address });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
}));
router.post('/auth/login', asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(req.body.password || ''))) return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
  res.json({ token: tokenFor(user), user: publicUser(user) });
}));
router.get('/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/users/me', authenticate, asyncRoute(async (req, res) => {
  for (const key of ['name', 'phone', 'address']) if (req.body[key] !== undefined) req.user[key] = req.body[key];
  await req.user.save(); res.json({ user: publicUser(req.user) });
}));
router.patch('/users/me/password', authenticate, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword || ''))) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
  if (!req.body.newPassword || req.body.newPassword.length < 8) return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
  user.password = req.body.newPassword; await user.save(); res.json({ message: 'Đổi mật khẩu thành công.' });
}));

// Public catalog: search, category/price filters, sorting and pagination
router.get('/categories', asyncRoute(async (req, res) => res.json({ categories: await Category.find({ isActive: true }).sort('name') })));
router.get('/products', asyncRoute(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1), limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const filter = { isActive: true };
  if (req.query.category && validId(req.query.category)) filter.category = req.query.category;
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 100) };
  const min = Number(req.query.minPrice), max = Number(req.query.maxPrice);
  if (Number.isFinite(min) || Number.isFinite(max)) { filter.price = {}; if (Number.isFinite(min)) filter.price.$gte = min; if (Number.isFinite(max)) filter.price.$lte = max; }
  const sort = { price_asc: { price: 1 }, price_desc: { price: -1 }, newest: { createdAt: -1 } }[req.query.sort] || { createdAt: -1 };
  const [products, total] = await Promise.all([Product.find(filter).populate('category', 'name').sort(sort).skip((page - 1) * limit).limit(limit), Product.countDocuments(filter)]);
  res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));
router.get('/products/:id', asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name');
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json({ product });
}));

// Authenticated cart
router.get('/cart', authenticate, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price image stock sizes colors isActive');
  res.json({ cart: cart || { items: [] } });
}));
router.post('/cart/items', authenticate, asyncRoute(async (req, res) => {
  const { productId, quantity = 1, size = '', color = 'default' } = req.body;
  if (!validId(productId) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) return res.status(400).json({ message: 'Sản phẩm hoặc số lượng không hợp lệ.' });
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) return res.status(404).json({ message: 'Sản phẩm không tồn tại.' });
  if (Number(quantity) > product.stock) return res.status(400).json({ message: 'Số lượng vượt quá tồn kho.' });
  if (size && product.sizes.length && !product.sizes.includes(size)) return res.status(400).json({ message: 'Kích cỡ không hợp lệ.' });
  if (color !== 'default' && product.colors.length && !product.colors.includes(color)) return res.status(400).json({ message: 'Màu sắc không hợp lệ.' });
  const cart = await Cart.findOneAndUpdate({ user: req.user.id }, { $setOnInsert: { items: [] } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const item = cart.items.find((entry) => entry.product.toString() === productId && entry.size === size && entry.color === color);
  if (item) item.quantity += Number(quantity); else cart.items.push({ product: productId, quantity: Number(quantity), size, color });
  if (cart.items.some((entry) => entry.product.toString() === productId && entry.quantity > product.stock)) return res.status(400).json({ message: 'Tổng số lượng trong giỏ vượt quá tồn kho.' });
  await cart.save(); await cart.populate('items.product', 'name price image stock'); res.status(201).json({ cart });
}));
router.patch('/cart/items/:itemId', authenticate, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống.' });
  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  const qty = Number(req.body.quantity), product = await Product.findById(item.product);
  if (!Number.isInteger(qty) || qty < 1 || !product || qty > product.stock) return res.status(400).json({ message: 'Số lượng không hợp lệ hoặc vượt tồn kho.' });
  item.quantity = qty; await cart.save(); await cart.populate('items.product', 'name price image stock'); res.json({ cart });
}));
router.delete('/cart/items/:itemId', authenticate, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }); if (!cart) return res.status(404).json({ message: 'Giỏ hàng trống.' });
  const item = cart.items.id(req.params.itemId); if (!item) return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong giỏ.' });
  item.deleteOne(); await cart.save(); res.json({ cart });
}));
router.delete('/cart', authenticate, asyncRoute(async (req, res) => { await Cart.findOneAndUpdate({ user: req.user.id }, { $set: { items: [] } }); res.json({ message: 'Đã xóa giỏ hàng.' }); }));

// Checkout stores a price/name/image snapshot so order history remains stable.
router.post('/orders', authenticate, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  if (!cart || !cart.items.length) return res.status(400).json({ message: 'Giỏ hàng đang trống.' });
  const { name, phone, address, paymentMethod = 'cod' } = req.body;
  if (!name || !phone || !address || !['cod', 'bank'].includes(paymentMethod)) return res.status(400).json({ message: 'Thông tin nhận hàng hoặc phương thức thanh toán không hợp lệ.' });
  const decremented = [];
  try {
    const items = [];
    for (const row of cart.items) {
      const product = row.product;
      if (!product || !product.isActive) throw Object.assign(new Error('Một sản phẩm trong giỏ không còn kinh doanh.'), { status: 409 });
      const changed = await Product.findOneAndUpdate({ _id: product.id, isActive: true, stock: { $gte: row.quantity } }, { $inc: { stock: -row.quantity } }, { new: true });
      if (!changed) throw Object.assign(new Error(`Sản phẩm "${product.name}" không đủ tồn kho.`), { status: 409 });
      decremented.push({ id: product.id, quantity: row.quantity });
      items.push({ product: product.id, productName: product.name, image: product.image, size: row.size, color: row.color, quantity: row.quantity, price: product.price });
    }
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await Order.create({ user: req.user.id, items, name, phone, address, paymentMethod, totalPrice });
    cart.items = []; await cart.save(); res.status(201).json({ order });
  } catch (error) {
    await Promise.all(decremented.map((entry) => Product.updateOne({ _id: entry.id }, { $inc: { stock: entry.quantity } })));
    throw error;
  }
}));
router.get('/orders/my', authenticate, asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(50, Number(req.query.limit) || 10);
  const [orders, total] = await Promise.all([Order.find({ user: req.user.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Order.countDocuments({ user: req.user.id })]);
  res.json({ orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));
router.get('/orders/my/:id', authenticate, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id }); if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' }); res.json({ order });
}));

// Admin catalog and order management
router.use('/admin', authenticate, adminOnly);
router.get('/admin/products', asyncRoute(async (req, res) => res.json({ products: await Product.find().populate('category', 'name').sort({ createdAt: -1 }) })));
router.post('/admin/products', asyncRoute(async (req, res) => { const product = await Product.create(req.body); res.status(201).json({ product }); }));
router.patch('/admin/products/:id', asyncRoute(async (req, res) => { const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' }); res.json({ product }); }));
router.delete('/admin/products/:id', asyncRoute(async (req, res) => { const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' }); res.json({ message: 'Đã ẩn sản phẩm.' }); }));
router.get('/admin/categories', asyncRoute(async (req, res) => { const categories = await Category.find().sort('name').lean(); const counts = await Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }]); const map = new Map(counts.map((row) => [String(row._id), row.count])); res.json({ categories: categories.map((cat) => ({ ...cat, productCount: map.get(String(cat._id)) || 0 })) }); }));
router.post('/admin/categories', asyncRoute(async (req, res) => { const category = await Category.create(req.body); res.status(201).json({ category }); }));
router.patch('/admin/categories/:id', asyncRoute(async (req, res) => { const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục.' }); res.json({ category }); }));
router.delete('/admin/categories/:id', asyncRoute(async (req, res) => { const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục.' }); res.json({ message: 'Đã ẩn danh mục.' }); }));
router.get('/admin/orders', asyncRoute(async (req, res) => { const filter = {}; if (req.query.status) filter.status = req.query.status; const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }); res.json({ orders }); }));
router.get('/admin/orders/:id', asyncRoute(async (req, res) => { const order = await Order.findById(req.params.id).populate('user', 'name email'); if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' }); res.json({ order }); }));
router.patch('/admin/orders/:id/status', asyncRoute(async (req, res) => {
  const allowed = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']; if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
  const order = await Order.findById(req.params.id); if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
  if (order.status === 'cancelled' && req.body.status !== 'cancelled') return res.status(409).json({ message: 'Đơn hàng đã hủy không thể mở lại.' });
  if (req.body.status === 'cancelled' && order.status !== 'cancelled') { for (const item of order.items) if (item.product) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }); }
  order.status = req.body.status; if (req.body.paymentStatus && ['unpaid', 'paid', 'refunded'].includes(req.body.paymentStatus)) order.paymentStatus = req.body.paymentStatus;
  await order.save(); res.json({ order });
}));
router.get('/admin/users', asyncRoute(async (req, res) => { const q = String(req.query.q || '').slice(0, 100); const filter = q ? { $or: [{ name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] } : {}; const users = await User.find(filter).sort({ createdAt: -1 }).select('-password'); res.json({ users }); }));
router.patch('/admin/users/:id/status', asyncRoute(async (req, res) => { if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive phải là true hoặc false.' }); const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('-password'); if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' }); res.json({ user }); }));
router.get('/admin/dashboard', asyncRoute(async (req, res) => { const [products, users, orders, revenue] = await Promise.all([Product.countDocuments({ isActive: true }), User.countDocuments(), Order.countDocuments(), Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }])]); res.json({ stats: { products, users, orders, revenue: revenue[0]?.total || 0 } }); }));

module.exports = router;
