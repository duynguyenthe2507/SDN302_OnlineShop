const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const routes = require('./routes');
const webRoutes = require('./web');
const User = require('./models/User');
const Cart = require('./models/Cart');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../frontend/views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'], scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'], imgSrc: ["'self'", 'data:', 'https:'], connectSrc: ["'self'"] } } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((value) => value.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(session({
  name: 'fashion.sid', secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false, saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions' }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(async (req, res, next) => {
  try {
    req.user = req.session.userId ? await User.findById(req.session.userId) : null;
    if (!req.user || !req.user.isActive) { req.user = null; req.session.userId = null; }
    const cart = req.user ? await Cart.findOne({ user: req.user.id }) : null;
    res.locals.user = req.user;
    res.locals.admin = req.user?.role === 'admin' ? req.user : null;
    res.locals.cartCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    res.locals.query = req.query.q || '';
    res.locals.error = req.session.flash?.error || null;
    res.locals.success = req.session.flash?.success || null;
    req.session.flash = null;
    next();
  } catch (error) { next(error); }
});
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', routes);
app.use('/', webRoutes);
app.use((req, res) => req.path.startsWith('/api') ? res.status(404).json({ message: 'Không tìm thấy endpoint.' }) : res.status(404).render('client/not-found', { title: 'Không tìm thấy trang', layout: 'layouts/main' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : error.code === 11000 ? 409 : 500);
  if (!req.path.startsWith('/api')) {
    req.session.flash = { error: status >= 500 ? 'Đã xảy ra lỗi. Vui lòng thử lại.' : error.message };
    return res.redirect('back');
  }
  res.status(status).json({ message: status >= 500 ? 'Đã xảy ra lỗi máy chủ.' : error.message, ...(process.env.NODE_ENV === 'development' && status >= 500 ? { detail: error.message } : {}) });
});
module.exports = app;
