const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');

const router = express.Router();
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const pageData = (req, extra = {}) => { const params = new URLSearchParams(req.query); params.delete('page'); return { title: 'FashionShop', layout: 'layouts/main', queryString: params.toString(), ...extra }; };
const authPage = (extra = {}) => ({ title: 'FashionShop', layout: 'layouts/auth', ...extra });
const adminPage = (req, title, page, extra = {}) => ({ ...pageData(req), title, page, admin: req.user, layout: 'layouts/admin', ...extra });
const requireLogin = (req, res, next) => req.user ? next() : res.redirect('/login');
const requireAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.redirect(req.user ? '/' : '/login');
const pageNumber = (value) => Math.max(1, Number.parseInt(value, 10) || 1);
const pageLimit = 9;
const safeRegex = (value) => new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (req, file, done) => done(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, done) => file.mimetype.startsWith('image/') ? done(null, true) : done(new Error('Vui lòng tải lên tệp ảnh hợp lệ.'))
});

router.get('/', asyncRoute(async (req, res) => {
  const [categories, featuredProducts] = await Promise.all([Category.find({ isActive: true }).sort('name'), Product.find({ isActive: true }).populate('category', 'name').sort({ createdAt: -1 }).limit(4)]);
  res.render('client/home', pageData(req, { title: 'Trang chủ - FashionShop', categories, featuredProducts }));
}));
router.get('/shop', asyncRoute(async (req, res) => {
  const currentPage = pageNumber(req.query.page), filter = { isActive: true };
  if (req.query.category && mongoose.isValidObjectId(req.query.category)) filter.category = req.query.category;
  if (req.query.q) filter.name = safeRegex(req.query.q.slice(0, 100));
  const min = Number(req.query.minPrice), max = Number(req.query.maxPrice);
  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) { filter.price = {}; if (req.query.minPrice !== '' && Number.isFinite(min)) filter.price.$gte = min; if (req.query.maxPrice !== '' && Number.isFinite(max)) filter.price.$lte = max; }
  const sort = { price_asc: { price: 1 }, price_desc: { price: -1 }, newest: { createdAt: -1 } }[req.query.sort] || { createdAt: -1 };
  const [products, totalProducts, categories] = await Promise.all([Product.find(filter).populate('category', 'name').sort(sort).skip((currentPage - 1) * pageLimit).limit(pageLimit), Product.countDocuments(filter), Category.find({ isActive: true }).sort('name')]);
  res.render('client/shop', pageData(req, { title: 'Cửa hàng - FashionShop', products, categories, filters: req.query, totalProducts, currentPage, totalPages: Math.max(1, Math.ceil(totalProducts / pageLimit)) }));
}));
router.get('/product/:id', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('client/not-found', pageData(req));
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name');
  if (!product) return res.status(404).render('client/not-found', pageData(req));
  res.render('client/product-detail', pageData(req, { title: `${product.name} - FashionShop`, product }));
}));

router.get('/register', (req, res) => res.render('client/auth/register', authPage()));
router.post('/register', asyncRoute(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password) { req.session.flash = { error: 'Vui lòng nhập đầy đủ thông tin.' }; return res.redirect('/register'); }
  if (password.length < 8) { req.session.flash = { error: 'Mật khẩu phải có ít nhất 8 ký tự.' }; return res.redirect('/register'); }
  if (password !== confirmPassword) { req.session.flash = { error: 'Mật khẩu xác nhận không khớp.' }; return res.redirect('/register'); }
  if (await User.exists({ email: email.toLowerCase().trim() })) { req.session.flash = { error: 'Email đã được sử dụng.' }; return res.redirect('/register'); }
  const user = await User.create({ name, email, password });
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id; res.redirect('/');
}));
router.get('/login', (req, res) => res.render('client/auth/login', authPage()));
router.post('/login', asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(req.body.password || ''))) { req.session.flash = { error: 'Email hoặc mật khẩu không chính xác.' }; return res.redirect('/login'); }
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id; res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/');
}));
router.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));
router.get('/forgot-password', (req, res) => res.render('client/auth/forgot-password', authPage()));
router.post('/forgot-password', (req, res) => { req.session.flash = { error: 'Chức năng đặt lại mật khẩu chưa được cấu hình gửi email.' }; res.redirect('/forgot-password'); });

router.get('/cart', requireLogin, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price image stock');
  const cartItems = (cart?.items || []).filter((item) => item.product);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  res.render('client/cart', pageData(req, { title: 'Giỏ hàng', cartItems, totalPrice }));
}));
router.post('/cart/add', requireLogin, asyncRoute(async (req, res) => {
  const { productId, size = '', color = 'default', quantity = 1 } = req.body;
  if (!mongoose.isValidObjectId(productId) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) { req.session.flash = { error: 'Thông tin sản phẩm không hợp lệ.' }; return res.redirect('back'); }
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) { req.session.flash = { error: 'Sản phẩm không tồn tại.' }; return res.redirect('/shop'); }
  if (Number(quantity) > product.stock || (size && product.sizes.length && !product.sizes.includes(size)) || (color !== 'default' && product.colors.length && !product.colors.includes(color))) { req.session.flash = { error: 'Size, màu hoặc số lượng không hợp lệ.' }; return res.redirect(`/product/${productId}`); }
  const cart = await Cart.findOneAndUpdate({ user: req.user.id }, { $setOnInsert: { items: [] } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const line = cart.items.find((item) => String(item.product) === productId && item.size === size && item.color === color);
  if (line) line.quantity += Number(quantity); else cart.items.push({ product: productId, size, color, quantity: Number(quantity) });
  if (cart.items.some((item) => String(item.product) === productId && item.quantity > product.stock)) { req.session.flash = { error: 'Số lượng trong giỏ vượt quá tồn kho.' }; return res.redirect(`/product/${productId}`); }
  await cart.save(); req.session.flash = { success: 'Đã thêm sản phẩm vào giỏ hàng.' }; res.redirect('/cart');
}));
router.post('/cart/remove/:itemId', requireLogin, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }); const item = cart?.items.id(req.params.itemId);
  if (item) { item.deleteOne(); await cart.save(); }
  res.redirect('/cart');
}));

router.get('/checkout', requireLogin, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price image stock');
  const cartItems = (cart?.items || []).filter((item) => item.product);
  if (!cartItems.length) return res.redirect('/cart');
  const totalPrice = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  res.render('client/checkout', pageData(req, { title: 'Thanh toán', cartItems, totalPrice }));
}));
router.post('/checkout', requireLogin, asyncRoute(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  if (!cart?.items.length) { req.session.flash = { error: 'Giỏ hàng đang trống.' }; return res.redirect('/cart'); }
  const { name, phone, address, paymentMethod = 'cod' } = req.body;
  if (!name || !phone || !address || !['cod', 'bank'].includes(paymentMethod)) { req.session.flash = { error: 'Vui lòng kiểm tra thông tin giao hàng.' }; return res.redirect('/checkout'); }
  const changedStock = [];
  try {
    const items = [];
    for (const row of cart.items) {
      const product = row.product;
      const updated = product && await Product.findOneAndUpdate({ _id: product.id, isActive: true, stock: { $gte: row.quantity } }, { $inc: { stock: -row.quantity } }, { new: true });
      if (!updated) throw Object.assign(new Error(`Sản phẩm ${product?.name || ''} không đủ tồn kho.`), { status: 409 });
      changedStock.push({ id: product.id, quantity: row.quantity });
      items.push({ product: product.id, productName: product.name, image: product.image, size: row.size, color: row.color, quantity: row.quantity, price: product.price });
    }
    const order = await Order.create({ user: req.user.id, items, name, phone, address, paymentMethod, totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0) });
    cart.items = []; await cart.save(); return res.redirect(`/order-success/${order.id}`);
  } catch (error) {
    await Promise.all(changedStock.map((entry) => Product.updateOne({ _id: entry.id }, { $inc: { stock: entry.quantity } })));
    req.session.flash = { error: error.message || 'Không thể tạo đơn hàng.' }; res.redirect('/checkout');
  }
}));
router.get('/order-success/:id', requireLogin, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.redirect('/order-history');
  res.render('client/order-success', pageData(req, { title: 'Đặt hàng thành công', order }));
}));
router.get('/order-history', requireLogin, asyncRoute(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.render('client/order-history', pageData(req, { title: 'Đơn hàng của tôi', orders }));
}));
router.get('/order/:id', requireLogin, asyncRoute(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).populate('items.product', 'image');
  if (!order) return res.redirect('/order-history');
  res.render('client/order-detail', pageData(req, { title: 'Chi tiết đơn hàng', order }));
}));

router.get('/profile', requireLogin, (req, res) => res.render('client/profile', pageData(req, { title: 'Tài khoản' })));
router.post('/profile', requireLogin, asyncRoute(async (req, res) => {
  req.user.name = req.body.name; req.user.phone = req.body.phone || ''; req.user.address = req.body.address || '';
  await req.user.save(); req.session.flash = { success: 'Đã cập nhật thông tin tài khoản.' }; res.redirect('/profile');
}));
router.post('/profile/change-password', requireLogin, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(currentPassword || ''))) req.session.flash = { error: 'Mật khẩu hiện tại không đúng.' };
  else if (!newPassword || newPassword.length < 8) req.session.flash = { error: 'Mật khẩu mới phải có ít nhất 8 ký tự.' };
  else if (newPassword !== confirmPassword) req.session.flash = { error: 'Mật khẩu xác nhận không khớp.' };
  else { user.password = newPassword; await user.save(); req.session.flash = { success: 'Đã đổi mật khẩu.' }; }
  res.redirect('/profile');
}));

// Admin dashboard and catalog management
router.use('/admin', requireLogin, requireAdmin);
router.get('/admin', (req, res) => res.redirect('/admin/dashboard'));
router.get('/admin/dashboard', asyncRoute(async (req, res) => {
  const [totalProducts, totalUsers, totalOrders, recentOrders, revenue] = await Promise.all([Product.countDocuments({ isActive: true }), User.countDocuments(), Order.countDocuments(), Order.find().populate('user', 'name').sort({ createdAt: -1 }).limit(5), Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, sum: { $sum: '$totalPrice' } } }])]);
  res.render('admin/dashboard', adminPage(req, 'Dashboard', 'dashboard', { stats: { totalProducts, totalUsers, totalOrders, revenue: revenue[0]?.sum || 0 }, recentOrders }));
}));
router.get('/admin/products', asyncRoute(async (req, res) => {
  const currentPage = pageNumber(req.query.page), filter = { isActive: true };
  if (req.query.q) filter.name = safeRegex(req.query.q.slice(0, 100));
  const [products, total] = await Promise.all([Product.find(filter).populate('category', 'name').sort({ createdAt: -1 }).skip((currentPage - 1) * pageLimit).limit(pageLimit), Product.countDocuments(filter)]);
  res.render('admin/products/index', adminPage(req, 'Quản lý sản phẩm', 'products', { products, query: req.query.q || '', currentPage, totalPages: Math.max(1, Math.ceil(total / pageLimit)) }));
}));
router.get('/admin/products/create', asyncRoute(async (req, res) => res.render('admin/products/create', adminPage(req, 'Thêm sản phẩm', 'products', { categories: await Category.find({ isActive: true }) }))));
router.post('/admin/products/create', upload.single('image'), asyncRoute(async (req, res) => {
  await Product.create({ name: req.body.name, category: req.body.category || undefined, price: Number(req.body.price), stock: Number(req.body.stock) || 0, colors: String(req.body.colors || '').split(',').map((x) => x.trim()).filter(Boolean), sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: req.body.description || '', image: req.file ? `/uploads/${req.file.filename}` : '' });
  req.session.flash = { success: 'Đã tạo sản phẩm.' }; res.redirect('/admin/products');
}));
router.get('/admin/products/edit/:id', asyncRoute(async (req, res) => {
  const [product, categories] = await Promise.all([Product.findById(req.params.id).populate('category', 'name'), Category.find({ isActive: true })]);
  if (!product) return res.redirect('/admin/products');
  res.render('admin/products/edit', adminPage(req, 'Chỉnh sửa sản phẩm', 'products', { product, categories }));
}));
router.post('/admin/products/edit/:id', upload.single('image'), asyncRoute(async (req, res) => {
  const update = { name: req.body.name, category: req.body.category || null, price: Number(req.body.price), stock: Number(req.body.stock), colors: String(req.body.colors || '').split(',').map((x) => x.trim()).filter(Boolean), description: req.body.description || '' };
  if (req.file) update.image = `/uploads/${req.file.filename}`;
  await Product.findByIdAndUpdate(req.params.id, update, { runValidators: true }); req.session.flash = { success: 'Đã cập nhật sản phẩm.' }; res.redirect('/admin/products');
}));
router.post('/admin/products/delete/:id', asyncRoute(async (req, res) => { await Product.findByIdAndUpdate(req.params.id, { isActive: false }); req.session.flash = { success: 'Đã ẩn sản phẩm.' }; res.redirect('/admin/products'); }));
router.get('/admin/categories', asyncRoute(async (req, res) => {
  const [categories, counts] = await Promise.all([Category.find({ isActive: true }).sort('name').lean(), Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }])]);
  const countByCategory = new Map(counts.map((item) => [String(item._id), item.count]));
  res.render('admin/categories/index', adminPage(req, 'Quản lý danh mục', 'categories', { categories: categories.map((item) => ({ ...item, productCount: countByCategory.get(String(item._id)) || 0 })) }));
}));
router.post('/admin/categories/create', asyncRoute(async (req, res) => { await Category.create({ name: req.body.name, description: req.body.description || '' }); req.session.flash = { success: 'Đã thêm danh mục.' }; res.redirect('/admin/categories'); }));
router.post('/admin/categories/delete/:id', asyncRoute(async (req, res) => { await Category.findByIdAndUpdate(req.params.id, { isActive: false }); req.session.flash = { success: 'Đã ẩn danh mục.' }; res.redirect('/admin/categories'); }));
router.get('/admin/orders', asyncRoute(async (req, res) => {
  const filter = {}; if (['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
  const orders = await Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 });
  res.render('admin/orders/index', adminPage(req, 'Quản lý đơn hàng', 'orders', { orders, filter: req.query.status || '', currentPage: 1, totalPages: 1 }));
}));
router.get('/admin/orders/:id', asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.product', 'image name');
  if (!order) return res.redirect('/admin/orders');
  res.render('admin/orders/detail', adminPage(req, 'Chi tiết đơn hàng', 'orders', { order }));
}));
router.post('/admin/orders/:id/status', asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id);
  const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  if (!order || !statuses.includes(req.body.status)) { req.session.flash = { error: 'Đơn hàng hoặc trạng thái không hợp lệ.' }; return res.redirect('/admin/orders'); }
  if (order.status !== 'cancelled' && req.body.status === 'cancelled') for (const item of order.items) if (item.product) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  order.status = req.body.status; await order.save(); req.session.flash = { success: 'Đã cập nhật trạng thái đơn hàng.' }; res.redirect(`/admin/orders/${order.id}`);
}));
router.get('/admin/users', asyncRoute(async (req, res) => {
  const currentPage = pageNumber(req.query.page), q = String(req.query.q || '').slice(0, 100), filter = q ? { $or: [{ name: safeRegex(q) }, { email: safeRegex(q) }] } : {};
  const [users, total] = await Promise.all([User.find(filter).select('-password').sort({ createdAt: -1 }).skip((currentPage - 1) * pageLimit).limit(pageLimit), User.countDocuments(filter)]);
  res.render('admin/users/index', adminPage(req, 'Quản lý người dùng', 'users', { users, query: q, currentPage, totalPages: Math.max(1, Math.ceil(total / pageLimit)) }));
}));
router.post('/admin/users/delete/:id', asyncRoute(async (req, res) => {
  if (String(req.user.id) === req.params.id) { req.session.flash = { error: 'Không thể khóa tài khoản đang sử dụng.' }; return res.redirect('/admin/users'); }
  await User.findByIdAndUpdate(req.params.id, { isActive: false }); req.session.flash = { success: 'Đã khóa tài khoản.' }; res.redirect('/admin/users');
}));

module.exports = router;
