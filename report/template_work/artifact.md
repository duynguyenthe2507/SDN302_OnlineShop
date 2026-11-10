# Báo cáo Online Shop — quy ước nội dung và mẫu

- Mẫu tham chiếu: `F:\FPT\FA24\PRJ301\PRJ301_HE173401_ASSIGNMENT\HE173401_GiangTT_PRJ301.docx` (bản chỉ đọc; SHA-256 `F4624EBBB499B210E5FFC55A65928507C2401D5A8DD38FCD9F6C7578ED7EDEE8`).
- Bản làm việc để đối chiếu: `report/template_work/reference.docx`.
- Mẫu có 36 trang, khổ Letter, lề xấp xỉ 1 inch, Times New Roman, có trang bìa, mục lục, lời mở đầu, các chương, kết luận và tài liệu tham khảo. Hệ thống tiêu đề: chương/Heading 1 đậm cỡ khoảng 14pt, mục con/Heading 2 đậm khoảng 13pt. Mẫu chứa hình chụp giao diện và sơ đồ.
- Yêu cầu của người dùng: báo cáo đầy đủ cho Online Shop, không giới hạn số trang; yêu cầu trước đó vẫn áp dụng: bỏ toàn bộ Chương 1, bắt đầu từ Chương 2. Không lấy tên/mã sinh viên cá nhân trong mẫu; để trống thông tin trên bìa.
- Nội dung dựa trên mã nguồn tại `backend/src`, `frontend/views`, `database/compass`, README và package manifest. Chỉ mô tả những chức năng có trong mã. Phân biệt giới hạn/đề xuất với chức năng đã triển khai. Không khẳng định hệ thống đã qua kiểm thử chạy thực tế.
- Hướng trình bày: tiếng Việt, khổ Letter và TNR theo mẫu; giữ các phần chính như khảo sát, phân tích, thiết kế, xây dựng, kết luận, tham khảo. Báo cáo mới có thể rút gọn số chương nhưng không rút gọn nội dung quan trọng.
- Các sự thật kỹ thuật trọng yếu: Node.js/Express/EJS, MongoDB/Mongoose; User, Category, Product, Cart, Order; website dùng session MongoDB; REST API xác thực JWT; bcryptjs; checkout kiểm tồn và lưu snapshot dòng đơn; tiền COD/chuyển khoản chỉ ghi nhận lựa chọn, chưa tích hợp cổng thanh toán; quên mật khẩu chưa có quy trình email; ảnh lưu local; chưa xác nhận kiểm thử runtime/DB.
