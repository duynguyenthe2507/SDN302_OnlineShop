# Import dữ liệu mẫu bằng MongoDB Compass

Bộ dữ liệu gồm 4 danh mục, 15 sản phẩm (5 sản phẩm ban đầu và 10 sản phẩm bổ sung), 2 tài khoản và 2 đơn hàng mẫu. Các file dùng Extended JSON, có thể import trực tiếp trong Compass.

## Cách import

1. Kết nối Compass tới cùng MongoDB URI trong `.env` (mặc định `mongodb://127.0.0.1:27017/online_shop`).
2. Mở database `online_shop` và tạo collection `categories` nếu chưa có.
3. Tạo lần lượt các collection `categories`, `products`, `users`, `orders`.
4. Chọn từng collection → **Add Data** → **Import JSON or CSV**, chọn file JSON cùng tên, định dạng JSON, rồi import theo thứ tự: `categories.json` → `products.json` → `products_additional_10.json` → `users.json` → `orders.json`.
5. Gọi `GET http://localhost:3000/api/products` để xem danh sách; đăng nhập qua `POST http://localhost:3000/api/auth/login`.

Import theo thứ tự trên vì sản phẩm tham chiếu danh mục, còn đơn hàng tham chiếu user và sản phẩm. Nếu collection đã có dữ liệu trùng `_id` hoặc email/tên danh mục (unique), hãy dùng database trống hoặc xóa dữ liệu cũ trước khi import. Không import lặp lại cùng một bộ dữ liệu.

Tài khoản mẫu dùng mật khẩu `Demo1234!`:

- Admin: `admin@shop.local`
- Khách hàng: `minhanh@example.com`

Đây là thông tin phát triển; đổi/xóa các tài khoản mẫu trước khi đưa dữ liệu lên môi trường thật. Các đơn hàng mẫu không trừ tồn kho sản phẩm khi import.

## Thêm 10 sản phẩm vào database đang chạy

Tại thư mục dự án, chạy `node backend/scripts/seedSampleProducts.js`. Script upsert theo `_id`: tự bổ sung 4 danh mục nền còn thiếu và thêm 10 sản phẩm mới mà không ghi đè dữ liệu sản phẩm hiện có. Có thể chạy lại an toàn.
