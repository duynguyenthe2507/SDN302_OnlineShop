const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const path = require('path');

const app = express();
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], scriptSrc: ["'self'"], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', 'https:'], connectSrc: ["'self'"] } } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((value) => value.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', routes);
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Không tìm thấy endpoint.' });
  res.sendFile(path.join(frontendDist, 'index.html'), (error) => error && next(error));
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : error.code === 11000 ? 409 : 500);
  if (process.env.NODE_ENV !== 'production') console.error(error);
  if (!req.path.startsWith('/api')) return res.status(status).send('Đã xảy ra lỗi. Vui lòng thử lại.');
  res.status(status).json({ message: status >= 500 ? 'Đã xảy ra lỗi máy chủ.' : error.message, ...(process.env.NODE_ENV === 'development' && status >= 500 ? { detail: error.message } : {}) });
});
module.exports = app;
