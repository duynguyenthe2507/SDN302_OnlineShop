# Online Shop backend

Backend Express + MongoDB/Mongoose cho giao diện EJS trong `frontend/views`, đồng thời cung cấp REST API tại `/api`.

## Chức năng suy ra từ giao diện

- Khách hàng: đăng ký, đăng nhập, xem/cập nhật hồ sơ, đổi mật khẩu.
- Danh mục và sản phẩm: xem danh sách/chi tiết, tìm kiếm, lọc theo danh mục/khoảng giá, sắp xếp, phân trang.
- Mua hàng: giỏ hàng theo tài khoản, chọn size/màu, đặt hàng với COD/chuyển khoản, xem lịch sử/trạng thái đơn.
- Quản trị: thống kê dashboard, CRUD sản phẩm và danh mục (xóa mềm), xem/tìm người dùng, khóa/mở tài khoản, xem/cập nhật đơn hàng.

## Cài đặt

Yêu cầu Node.js 18+ và MongoDB 6+.

```sh
npm install
```

Sao chép `.env.example` thành `.env`, đặt `MONGODB_URI`, `JWT_SECRET` và `SESSION_SECRET` thành các chuỗi ngẫu nhiên dài, sau đó chạy:

```sh
npm run dev
```

Dữ liệu mẫu tương thích MongoDB Compass nằm trong [`database/compass`](database/compass/README.md).

Website EJS chạy tại `http://localhost:3000`; REST API ở `http://localhost:3000/api`, trạng thái kết nối tại `GET /api/health`. Đăng nhập bằng tài khoản mẫu trong `database/compass/README.md` hoặc đăng ký tài khoản mới. Để cấp quyền quản trị cho user khác, cập nhật role thủ công trong MongoDB, ví dụ Mongo shell:

```js
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

Không có endpoint tự nâng quyền admin. Trước khi triển khai thật, hãy dùng HTTPS, đặt secret riêng, giới hạn CORS vào domain frontend và cấu hình backup MongoDB.

## Thiết kế MongoDB

| Collection | Nội dung và quan hệ |
| --- | --- |
| `users` | Hồ sơ, email unique, mật khẩu bcrypt, role `user/admin`, trạng thái hoạt động. |
| `categories` | Tên unique, mô tả, trạng thái hoạt động. |
| `products` | Giá, mô tả, ảnh, kho, sizes/colors, tham chiếu `category`; index tìm kiếm tên và danh mục/ngày tạo. |
| `carts` | Một giỏ cho mỗi user; items tham chiếu sản phẩm và chứa size/màu/số lượng. |
| `orders` | User, thông tin giao nhận, trạng thái/thanh toán; items lưu snapshot tên/ảnh/giá lúc đặt và tham chiếu sản phẩm để hoàn kho khi hủy. |

Giỏ được nhúng theo từng document user-cart vì nó chỉ thuộc một người và thường được đọc/cập nhật cùng nhau. Items đơn hàng lưu snapshot để lịch sử không đổi khi quản trị sửa sản phẩm. Giá tiền dùng Number theo VND nguyên; không lưu tổng giỏ vì giá được tính từ sản phẩm mới nhất.

## API chính

Gửi JSON với `Content-Type: application/json`. Endpoint yêu cầu đăng nhập nhận header `Authorization: Bearer <token>`.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Công khai |
| GET | `/api/auth/me`; PATCH `/api/users/me`, `/api/users/me/password` | Đăng nhập |
| GET | `/api/categories`; GET `/api/products?q=&category=&minPrice=&maxPrice=&sort=&page=&limit=` | Công khai |
| GET | `/api/products/:id` | Công khai |
| GET/POST/DELETE | `/api/cart`, `/api/cart/items` | Đăng nhập |
| PATCH/DELETE | `/api/cart/items/:itemId` | Đăng nhập |
| POST | `/api/orders`; GET `/api/orders/my`, `/api/orders/my/:id` | Đăng nhập |
| GET/POST/PATCH/DELETE | `/api/admin/products`, `/api/admin/categories` | Admin |
| GET | `/api/admin/orders`, `/api/admin/orders/:id`, `/api/admin/users`, `/api/admin/dashboard` | Admin |
| PATCH | `/api/admin/orders/:id/status`, `/api/admin/users/:id/status` | Admin |

Các API danh sách trả kết quả trong object như `{ products, pagination }`; lỗi trả `{ message }`. API ẩn sản phẩm/danh mục dùng xóa mềm để giữ tham chiếu lịch sử.

## EJS frontend

Các form EJS gọi trực tiếp tới Express routes, không cần chạy frontend server riêng. Session đăng nhập được lưu trong MongoDB collection `sessions`; ảnh tải trong trang quản trị lưu tại `backend/uploads` và phục vụ dưới `/uploads`.

Luồng quên mật khẩu có màn hình nhưng chưa được bật vì dự án chưa có cấu hình gửi email hoặc cơ chế xác minh đặt lại mật khẩu.
