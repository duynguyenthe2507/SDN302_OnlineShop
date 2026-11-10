require('dotenv').config();
const mongoose = require('mongoose');
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  throw new Error('Thiếu MONGODB_URI hoặc JWT_SECRET. Hãy tạo file .env từ .env.example trước khi chạy server.');
}
const app = require('./app');

const port = Number(process.env.PORT) || 3000;
async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`Online shop API đang chạy tại http://localhost:${port}/api`));
}
start().catch((error) => { console.error('Không thể khởi động server:', error.message); process.exit(1); });
