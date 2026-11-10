const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Tài khoản không hợp lệ.' });
    req.user = user;
    next();
  } catch (error) { next(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? Object.assign(new Error('Token không hợp lệ hoặc đã hết hạn.'), { status: 401 }) : error); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này.' });
  next();
}
module.exports = { authenticate, adminOnly };
