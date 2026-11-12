# FashionShop · React + Express + MongoDB

Website bán hàng thời trang phục vụ demo PRJ/SDN. Giao diện đã chuyển từ EJS sang React; Express REST API và nghiệp vụ MongoDB/Mongoose tiếp tục xử lý xác thực, giỏ hàng, tồn kho, đơn hàng và khu vực quản trị.

## Chạy demo tại máy

Yêu cầu Node.js 20.19+ (hoặc 22.12+) và MongoDB đang chạy.

```bash
npm install
```

Tạo `.env` từ `.env.example`, kiểm tra URI MongoDB và secret, sau đó chạy ở thư mục gốc project:

```bash
npm run dev
```

Lệnh này chạy React/Vite và Express song song, tự tìm cổng trống nếu `3000` hoặc `5173` đang bận, rồi mở trình duyệt đến trang chủ. React thường ở `http://localhost:5173`; API mặc định ở `http://localhost:3000/api`. Terminal sẽ in cổng thực tế khi có cổng bị chiếm. Kiểm tra kết nối DB tại `/api/health`.

Tài khoản demo (mật khẩu `Demo1234!`):

- Admin: `admin@shop.local`
- Khách hàng: `minhanh@example.com`

Nạp 10 sản phẩm mẫu vào database đang chạy (script upsert, chạy lặp lại được):

```bash
node backend/scripts/seedSampleProducts.js
```

MongoDB Compass có bộ JSON và hướng dẫn trong [`database/compass/README.md`](database/compass/README.md).

## Build và chạy bản production local

```bash
npm run build
npm start
```

Express phục vụ React build trong `frontend/dist` và REST API cùng origin. Build lại sau khi thay đổi giao diện.

## Kịch bản demo bảo vệ

1. Mở trang chủ, giới thiệu danh mục, sản phẩm mới và giao diện responsive.
2. Mở cửa hàng; tìm theo tên, lọc danh mục/giá, sắp xếp và phân trang.
3. Mở chi tiết sản phẩm; chọn size/màu/số lượng rồi thêm vào giỏ.
4. Đăng nhập tài khoản khách hàng; cập nhật thông tin cá nhân, kiểm tra giỏ và đặt COD.
5. Đặt đơn PayOS mô phỏng, bấm nút giả lập thành công, mở lịch sử và chi tiết đơn để xem trạng thái thanh toán.
6. Đăng nhập admin; dashboard, tạo/sửa/ẩn sản phẩm, tải ảnh, quản lý danh mục, cập nhật trạng thái đơn, khóa/mở tài khoản.
7. Mở MongoDB Compass để trình bày `users`, `categories`, `products`, `carts`, `orders` và các tham chiếu.

## Phân chia trách nhiệm

- `frontend/src`: React SPA, định tuyến, biểu mẫu và trải nghiệm người dùng.
- `backend/src/routes/index.js`: REST API, xác thực JWT, phân quyền và nghiệp vụ.
- `backend/src/models`: schema Mongoose, ràng buộc và quan hệ dữ liệu.
- `backend/src/server.js`: kết nối MongoDB và khởi chạy Express.
- `frontend/dist`: artifact do `npm run build` tạo; không chỉnh tay.

Frontend gửi JWT dạng `Authorization: Bearer <token>`. Admin API yêu cầu role `admin`; backend vẫn kiểm tra quyền, không dựa vào việc ẩn/hiện nút trên giao diện.

## Các chức năng

- Khách: đăng ký/đăng nhập, hồ sơ, đổi mật khẩu, xem và lọc sản phẩm, giỏ hàng, checkout, lịch sử/chi tiết đơn.
- Catalog: tìm kiếm, lọc danh mục và khoảng giá, sắp xếp, phân trang, chi tiết sản phẩm.
- Mua hàng: kiểm tra tồn kho, lưu ảnh/tên/giá sản phẩm dạng snapshot trong đơn, COD/chuyển khoản/PayOS mô phỏng.
- Admin: thống kê, CRUD sản phẩm/danh mục, tải ảnh, tra cứu đơn, cập nhật trạng thái và khóa/mở người dùng.
- MongoDB collections: `users`, `categories`, `products`, `carts`, `orders`.

## Câu hỏi phản biện và gợi ý trả lời

**1. Vì sao chuyển EJS sang React?**
React tổ chức giao diện thành component, tái sử dụng header, form, bảng và card; định tuyến phía client giúp chuyển trang mượt. Backend Express vẫn cung cấp API và giữ nghiệp vụ nên UI và dữ liệu tách biệt.

**2. React và Express giao tiếp thế nào?**
React gọi REST API JSON dưới `/api`. Ở dev, Vite proxy `/api` sang Express; khi build, Express phục vụ file React và API cùng origin. JWT được gửi ở header Bearer.

**3. Quyền admin được bảo vệ ở đâu?**
Giao diện chặn route admin để trải nghiệm rõ ràng, nhưng ranh giới bảo mật là middleware `authenticate` và `adminOnly` ở backend. Người dùng thường gọi thẳng admin API vẫn nhận 403.

**4. Mật khẩu được lưu ra sao?**
Mongoose hook băm mật khẩu bằng bcrypt trước khi lưu. API không trả trường password; đăng nhập so sánh mật khẩu nhập với hash.

**5. Vì sao giỏ hàng tách collection còn items đơn hàng là snapshot?**
Giỏ hàng thuộc một user và thay đổi thường xuyên nên lưu thành document riêng tham chiếu sản phẩm. Đơn hàng cần giữ lịch sử chính xác, nên lưu tên, ảnh, giá, size, màu và số lượng tại thời điểm mua.

**6. Hệ thống hạn chế bán vượt tồn kho thế nào?**
API kiểm tra tồn kho khi thêm/cập nhật giỏ. Khi checkout, backend giảm tồn kho bằng điều kiện `stock >= quantity`; nếu tạo đơn lỗi, số lượng đã giảm được hoàn lại.

**7. Vì sao giá đơn hàng được tính ở backend?**
Không tin giá do trình duyệt gửi lên. Backend tải giá hiện tại từ MongoDB, tính tổng và tạo snapshot cho từng dòng hàng.

**8. PayOS đã kết nối cổng thanh toán thật chưa?**
Chưa. Đây là mô phỏng để trình diễn trạng thái unpaid → paid và mã tham chiếu `SIM-*`; không tạo QR PayOS thật, không gửi webhook và không thu tiền. Tính năng tự tắt ở production.

**9. Đơn hàng có những trạng thái nào?**
`pending`, `confirmed`, `shipping`, `delivered`, `cancelled`. Admin cập nhật trạng thái; hủy đơn sẽ hoàn tồn kho và đơn đã trả được đánh dấu refunded.

**10. Tại sao MongoDB phù hợp với dự án?**
Dữ liệu sản phẩm và đơn hàng có trường linh hoạt như size/màu và danh sách items. Mongoose bổ sung schema validation, tham chiếu, index và hook để duy trì quy tắc dữ liệu.

**11. Tìm kiếm và phân trang được thực hiện ở đâu?**
Frontend gửi query params; API dựng filter/sort/skip/limit trong MongoDB và trả metadata pagination. Không tải toàn bộ catalog về browser.

**12. Nếu sản phẩm bị ẩn sau khi đã bán thì lịch sử thế nào?**
Sản phẩm và danh mục dùng soft delete qua `isActive=false`. Đơn hàng vẫn giữ snapshot nên lịch sử mua không phụ thuộc tên/giá hiện tại.

**13. Quên mật khẩu đã hoạt động chưa?**
Chưa có dịch vụ email và cơ chế xác minh danh tính. Giao diện thông báo rõ và không giả lập một quy trình đổi mật khẩu thiếu an toàn.

**14. Ảnh sản phẩm được lưu thế nào?**
Admin tải file ảnh tối đa 5 MB qua endpoint được bảo vệ, Express lưu trong `backend/uploads` và trả URL. Có thể nhập URL ảnh sẵn có; khi triển khai thật nên dùng object storage.

**15. Hướng phát triển tiếp theo là gì?**
Tích hợp PayOS thật với tạo payment link và xác minh webhook chữ ký; thêm email đặt lại mật khẩu, lịch sử audit, kiểm thử tự động, phân quyền chi tiết và lưu ảnh cloud.

## Biến môi trường chính

Xem `.env.example`: `PORT`, `VITE_PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `PAYOS_SIMULATION_ENABLED`. Không commit `.env` hoặc secret thật. Chỉ bật PayOS mô phỏng ở môi trường demo.
