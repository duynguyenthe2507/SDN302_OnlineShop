require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = 'admin@shop.local';

(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Không cấp role demo admin trong môi trường production.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI chưa được cấu hình.');

  await mongoose.connect(process.env.MONGODB_URI);
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name: 'Quản trị viên mẫu', email, password: 'Demo1234!', role: 'admin', isActive: true });
    console.log(`Đã tạo ${email} với mật khẩu demo Demo1234!.`);
  } else {
    const changed = user.role !== 'admin' || !user.isActive;
    user.role = 'admin';
    user.isActive = true;
    if (changed) await user.save();
    console.log(`Đã xác nhận quyền admin cho ${email}; giữ nguyên mật khẩu hiện tại.`);
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
