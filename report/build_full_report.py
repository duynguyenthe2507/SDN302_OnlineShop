from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(__file__).with_name('Bao_cao_day_du_Online_Shop.docx')
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.59), Cm(27.94)
sec.top_margin = sec.bottom_margin = Cm(2.54)
sec.left_margin = sec.right_margin = Cm(2.54)
sec.header_distance = sec.footer_distance = Cm(1.27)
NAVY='18324B'; PALE='F1F4F7'; BLACK='000000'; GRAY='5B6570'

def font(run, size=10.5, bold=False, italic=False, color=BLACK):
    run.font.name='Times New Roman'; run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'Times New Roman')
    run.font.size=Pt(size); run.bold=bold; run.italic=italic; run.font.color.rgb=RGBColor.from_string(color)
    return run

styles=doc.styles
for name,size in [('Normal',10.5),('Title',23),('Heading 1',14),('Heading 2',12.5),('Heading 3',11.5)]:
    s=styles[name]; s.font.name='Times New Roman'; s._element.rPr.rFonts.set(qn('w:eastAsia'),'Times New Roman'); s.font.size=Pt(size); s.font.bold=(name!='Normal'); s.font.color.rgb=RGBColor(0,0,0)
    s.paragraph_format.space_before=Pt(12 if name=='Heading 1' else 8); s.paragraph_format.space_after=Pt(5); s.paragraph_format.keep_with_next=True
styles['Normal'].paragraph_format.line_spacing=1.15; styles['Normal'].paragraph_format.space_after=Pt(5)

hdr=sec.header.paragraphs[0]; hdr.alignment=WD_ALIGN_PARAGRAPH.RIGHT; font(hdr.add_run('SDN302  |  ONLINE SHOP'),8.5,True,color=GRAY)
f=sec.footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(f.add_run('BÁO CÁO DỰ ÁN  •  '),8.5,color=GRAY)
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); f._p.append(fld)

def para(text='', boldlead=None, italic=False, align=None):
    p=doc.add_paragraph(); p.paragraph_format.widow_control=True
    if align is not None: p.alignment=align
    if boldlead and text.startswith(boldlead): font(p.add_run(boldlead),bold=True); font(p.add_run(text[len(boldlead):]),italic=italic)
    else: font(p.add_run(text),italic=italic)
    return p
def heading(text,level=1):
    p=doc.add_paragraph(style=f'Heading {level}'); font(p.add_run(text),{1:14,2:12.5,3:11.5}[level],True); return p
def bullet(text):
    p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(3); font(p.add_run(text),10.2); return p
def table(headers,rows,widths=None,size=9.2):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    tPr=t._tbl.tblPr; borders=OxmlElement('w:tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        e=OxmlElement('w:'+edge); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'5'); e.set(qn('w:color'),'C9D1D8'); borders.append(e)
    tPr.append(borders)
    for i,h in enumerate(headers):
        c=t.rows[0].cells[i]; c.text=''; c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),NAVY); c._tc.get_or_add_tcPr().append(sh)
        font(c.paragraphs[0].add_run(h),size,True,color='FFFFFF')
    trPr=t.rows[0]._tr.get_or_add_trPr(); trPr.append(OxmlElement('w:tblHeader'))
    for ri,row in enumerate(rows):
        cells=t.add_row().cells
        for i,val in enumerate(row):
            c=cells[i]; c.text=''; c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ri%2:
                sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),PALE); c._tc.get_or_add_tcPr().append(sh)
            p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(1); p.paragraph_format.line_spacing=1.02; font(p.add_run(str(val)),size)
    if widths:
        for i,w in enumerate(widths):
            t.columns[i].width=Cm(w)
            for row in t.rows: row.cells[i].width=Cm(w)
    doc.add_paragraph().paragraph_format.space_after=Pt(0)
    return t
def page(): doc.add_page_break()

# Cover
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(58); font(p.add_run('FPT UNIVERSITY'),16,True)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(64); font(p.add_run('MÔN HỌC SDN302'),12,True,color=GRAY)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(p.add_run('BÁO CÁO DỰ ÁN'),20,True)
p=doc.add_paragraph(style='Title'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(10); font(p.add_run('XÂY DỰNG WEBSITE BÁN HÀNG ONLINE SHOP'),23,True)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(55); font(p.add_run('Phân tích, thiết kế và xây dựng hệ thống thương mại điện tử'),11,italic=True,color=GRAY)
for s in ['Sinh viên / Nhóm:  ........................................................................','Mã sinh viên:  ................................................................................','Lớp:  ............................................................................................','Giảng viên hướng dẫn:  ................................................................']:
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(11); font(p.add_run(s),11)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(30); font(p.add_run('NĂM 2026'),11,True)

# Contents and introduction (Chapter 1 intentionally omitted per request)
page(); heading('MỤC LỤC',1)
for s in ['LỜI MỞ ĐẦU','CHƯƠNG 2. KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG','2.1. Khảo sát hiện trạng và mục tiêu','2.2. Phạm vi, tác nhân và yêu cầu','2.3. Phân tích nghiệp vụ','2.4. Kiến trúc hệ thống','2.5. Thiết kế cơ sở dữ liệu MongoDB','2.6. Bảo mật và ràng buộc dữ liệu','CHƯƠNG 3. XÂY DỰNG WEBSITE','3.1. Công nghệ và cấu trúc dự án','3.2. Giao diện và các phân hệ','3.3. Backend, route và API','3.4. Luồng xử lý nghiệp vụ','3.5. Cài đặt và vận hành','3.6. Kịch bản kiểm thử đề xuất','3.7. Giới hạn và hướng phát triển','KẾT LUẬN','TÀI LIỆU THAM KHẢO']:
    p=doc.add_paragraph(); p.paragraph_format.left_indent=Cm(0.4 if s[:1].isdigit() else 0); p.paragraph_format.space_after=Pt(4); font(p.add_run(s),10.5,bold=s.startswith('CHƯƠNG') or s in ('KẾT LUẬN','LỜI MỞ ĐẦU','TÀI LIỆU THAM KHẢO'))
heading('LỜI MỞ ĐẦU',1)
para('Mua sắm trực tuyến giúp khách hàng tiếp cận sản phẩm nhanh và cho phép cửa hàng quản lý danh mục, đơn hàng tập trung. Dự án Online Shop xây dựng website bán hàng thời trang với giao diện EJS, backend Express và dữ liệu MongoDB. Báo cáo trình bày từ Chương 2 theo yêu cầu, tập trung vào khảo sát, phân tích, thiết kế và hiện thực hệ thống.')
para('Mục tiêu là cung cấp luồng mua hàng cơ bản gồm xem/tìm sản phẩm, quản lý giỏ, đặt hàng và theo dõi đơn; đồng thời có khu vực quản trị để duy trì sản phẩm, danh mục, người dùng và trạng thái đơn. Nội dung mô tả hiện trạng mã nguồn, không khẳng định các chức năng chưa có hoặc chưa được xác minh vận hành.')

# Chapter 2
page(); heading('CHƯƠNG 2. KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG',1)
heading('2.1. Khảo sát hiện trạng và mục tiêu',2)
para('Ở quy trình bán hàng thủ công, thông tin sản phẩm, tồn kho và đơn có thể nằm rải rác; khách phải liên hệ trực tiếp để hỏi hàng và nhân viên cập nhật trạng thái bằng tay. Hệ thống cần cung cấp một nguồn dữ liệu tập trung, hiển thị sản phẩm nhất quán và hỗ trợ quản trị đơn từ lúc tiếp nhận đến khi hoàn tất.')
para('Online Shop được xây dựng như website demo thương mại điện tử. Mục tiêu cụ thể:')
for x in ['Cho khách xem danh mục, tìm kiếm, lọc giá, sắp xếp, phân trang và xem chi tiết sản phẩm.','Cho người dùng đăng ký/đăng nhập, cập nhật hồ sơ, lưu giỏ theo tài khoản, đặt hàng và xem lịch sử.','Cho quản trị viên quản lý sản phẩm, danh mục, tài khoản và trạng thái đơn.','Dùng MongoDB để lưu dữ liệu; áp dụng kiểm tra đầu vào, hash mật khẩu, phân quyền và ghi nhận snapshot đơn hàng.'] : bullet(x)
heading('2.2. Phạm vi, tác nhân và yêu cầu',2)
table(['Tác nhân','Vai trò và chức năng'],[
('Khách chưa đăng nhập','Xem trang chủ, danh mục, danh sách/chi tiết sản phẩm; đăng ký hoặc đăng nhập.'),
('Khách hàng đã đăng nhập','Cập nhật hồ sơ/đổi mật khẩu; thêm, sửa, xóa mặt hàng trong giỏ; checkout; xem đơn và trạng thái.'),
('Quản trị viên','Xem dashboard; quản lý sản phẩm/danh mục; tra cứu và khóa tài khoản; xem đơn, cập nhật trạng thái.'),
('Ứng dụng','Xác thực và phân quyền, kiểm tra dữ liệu và tồn kho, tính tổng tiền, lưu đơn và snapshot sản phẩm.')],[4,12.5])
heading('Yêu cầu chức năng',3)
table(['Mã','Yêu cầu'],[
('FR-01','Duyệt sản phẩm theo danh mục; tìm theo từ khóa; lọc khoảng giá; sắp xếp và phân trang.'),
('FR-02','Đăng ký, đăng nhập, đăng xuất; xem/sửa thông tin cá nhân và đổi mật khẩu.'),
('FR-03','Quản lý giỏ hàng theo user, gồm sản phẩm, size, màu và số lượng.'),
('FR-04','Đặt hàng với thông tin người nhận và COD/chuyển khoản; xem danh sách và chi tiết đơn.'),
('FR-05','Quản trị thêm/sửa/ẩn sản phẩm, danh mục; quản lý người dùng và đơn hàng.'),
('FR-06','Cung cấp REST API cho các chức năng tài khoản, catalog, giỏ, đơn và admin.')],[2,14.5])
heading('Yêu cầu phi chức năng',3)
for x in ['Mật khẩu không lưu dạng rõ; route riêng tư phải xác thực và route admin phải kiểm tra role.','Mongoose schema kiểm tra kiểu, enum và ràng buộc; email/tên danh mục có tính duy nhất.','Giao diện dùng Bootstrap responsive; secret và chuỗi kết nối tách qua biến môi trường.','Xóa mềm sản phẩm/danh mục để dữ liệu đơn cũ vẫn tham chiếu được.'] : bullet(x)

heading('2.3. Phân tích nghiệp vụ',2)
table(['Nghiệp vụ','Luồng chính','Ngoại lệ/kiểm soát'],[
('Đăng ký/đăng nhập','Nhập thông tin → kiểm tra → hash/so khớp mật khẩu → tạo session hoặc JWT.','Email trùng, thông tin không hợp lệ, tài khoản bị vô hiệu hóa.'),
('Duyệt hàng','Chọn tiêu chí → truy vấn sản phẩm đang hoạt động → phân trang → xem chi tiết.','Không tìm thấy sản phẩm hoặc danh mục đã ẩn.'),
('Giỏ hàng','Chọn size/màu/số lượng → server xác thực user và sản phẩm → lưu item trong cart.','Số lượng không hợp lệ, sản phẩm hết hàng/không còn hoạt động.'),
('Checkout','Kiểm tra người nhận và giỏ → kiểm tồn → tạo Order snapshot → trừ kho và xóa giỏ.','Nếu xử lý thất bại, luồng hoàn tác tồn kho được áp dụng.'),
('Quản trị đơn','Mở đơn → kiểm tra quyền → cập nhật trạng thái.','Khi hủy đơn, kho được cộng lại theo chi tiết đơn.')],[3,7.5,6])
para('Giỏ hàng yêu cầu đăng nhập, do đó phiên bản hiện tại không lưu giỏ khách vãng lai. Phương thức chuyển khoản chỉ được ghi nhận trên đơn, chưa có xác nhận giao dịch tự động.')

heading('2.4. Kiến trúc hệ thống',2)
table(['Tầng','Thành phần','Trách nhiệm'],[
('Giao diện','EJS, HTML, Bootstrap','Render server-side, hiển thị dữ liệu, nhận form và gửi yêu cầu.'),
('Ứng dụng','Node.js, Express 4, web routes, REST routes','Định tuyến, xác thực session/JWT, phân quyền, kiểm tra đầu vào và nghiệp vụ.'),
('Data access','Mongoose models','Schema, validate, truy vấn, populate và cập nhật collection.'),
('Lưu trữ','MongoDB','users, categories, products, carts, orders; sessions dùng connect-mongo.'),
('Tệp','Multer, backend/uploads','Nhận và lưu ảnh sản phẩm trên máy chủ hiện tại.')],[3,5,9])
para('Luồng giao diện: Trình duyệt → Express web route → middleware → Mongoose → MongoDB → EJS view. Luồng API dùng chung models nhưng trả JSON; API bảo vệ bằng Bearer JWT, còn website EJS sử dụng session lưu trong MongoDB. Tổ chức này cho phép tái sử dụng nghiệp vụ và mở rộng thêm ứng dụng client.')
heading('Phân quyền truy cập',3)
table(['Nhóm tài nguyên','Quyền'],[('Danh mục/sản phẩm công khai','Không cần đăng nhập để xem.'),('Giỏ, hồ sơ, checkout, đơn cá nhân','Yêu cầu user đăng nhập; chỉ đọc/sửa dữ liệu thuộc tài khoản.'),('Trang /admin và API /api/admin','Chỉ role admin; tài khoản đăng ký công khai có role user.'),('Cấp quyền admin','Được thực hiện bởi thao tác quản trị dữ liệu; không có endpoint tự nâng quyền.')],[6,11])

page(); heading('2.5. Thiết kế cơ sở dữ liệu MongoDB',2)
para('Mỗi collection biểu diễn thực thể độc lập. Trường tham chiếu dùng ObjectId; các document có timestamps để ghi nhận createdAt/updatedAt. Các item giỏ và chi tiết đơn được nhúng vì thường được đọc cùng document cha.')
table(['Collection','Trường tiêu biểu','Ràng buộc / quan hệ'],[
('users','name, email, password, phone, address, role, isActive','email unique/lowercase; password hash bcrypt; role user/admin.'),
('categories','name, description, isActive','name unique; sản phẩm tham chiếu category.'),
('products','name, category, price, description, image/images, sizes, colors, stock, isActive','category → categories; giá và stock không âm; enum biến thể.'),
('carts','user, items[{product,size,color,quantity}]','một cart/user; item tham chiếu Product, lưu lựa chọn và số lượng.'),
('orders','user, items snapshot, recipient/address, paymentMethod, paymentStatus, status, totalPrice','user → users; items nhúng snapshot và giữ product ref để xử lý hoàn kho.'),
('sessions','session data, expiration','Được connect-mongo dùng để lưu session đăng nhập web.')],[2.5,7.1,7.4],8.8)
heading('Quan hệ và lựa chọn nhúng/tham chiếu',3)
for x in ['Category 1–N Product: mỗi sản phẩm thuộc một danh mục; danh mục có thể có nhiều sản phẩm.','User 1–1 Cart: cart gắn với user; items nằm trong document cart để đọc/cập nhật cùng nhau.','User 1–N Order: mỗi đơn thuộc user; items của đơn được nhúng để giữ snapshot tên, ảnh, giá và biến thể lúc mua.','Order item vẫn lưu product ref nhằm hỗ trợ nghiệp vụ hoàn tồn kho khi hủy đơn; dữ liệu snapshot bảo toàn lịch sử khi sản phẩm đổi tên/giá.'] : bullet(x)
heading('Chỉ mục, dữ liệu và tính toàn vẹn',3)
table(['Đối tượng','Biện pháp'],[
('User / Category','Unique index cho email và tên category.'),('Product','Index tìm kiếm tên; index category/trạng thái/ngày tạo theo truy vấn danh sách.'),('Order','Tra cứu theo user, trạng thái và thời gian; validate enum trạng thái/thanh toán.'),('Cart / Order items','Validate quantity dương, size/màu hợp lệ; tính tiền theo số lượng và giá.'),('Tồn kho','Checkout kiểm tồn trước khi tạo đơn; cập nhật giảm tồn; hủy đơn hoàn kho.')],[4,13])
para('Giá trong giỏ được lấy từ sản phẩm hiện tại khi tính tổng. Khi tạo đơn, giá và thông tin hiển thị sản phẩm được sao chép vào order item để lịch sử giao dịch không đổi. Giá tiền hiện dùng Number theo VND nguyên; khi mở rộng nhiều loại tiền cần chuẩn hóa tiền tệ và cách làm tròn.')

heading('2.6. Bảo mật và ràng buộc dữ liệu',2)
for x in ['bcryptjs dùng để hash và kiểm tra mật khẩu; JWT dùng cho REST API, session dùng cho trang EJS.','Helmet thiết lập HTTP security headers; CORS và rate limit được cấu hình cho API; giới hạn kích thước tệp ảnh upload.','Middleware xác thực và kiểm tra quyền admin bảo vệ route nhạy cảm; dữ liệu đầu vào cần được validate trước khi ghi DB.','Biến MONGODB_URI, JWT_SECRET, SESSION_SECRET lưu trong .env; không commit secret vào repository.','Các form EJS hiện chưa có CSRF protection; trước triển khai công khai cần bổ sung CSRF và rà soát cấu hình cookie/HTTPS.'] : bullet(x)

# Chapter 3
page(); heading('CHƯƠNG 3. XÂY DỰNG WEBSITE',1)
heading('3.1. Công nghệ và cấu trúc dự án',2)
table(['Công nghệ','Mục đích sử dụng'],[
('Node.js, Express 4','Server JavaScript, web routing và REST endpoints.'),('EJS, Bootstrap','Render giao diện phía server; bố cục responsive.'),('MongoDB, Mongoose 8','Lưu collection, schema/validation và truy vấn.'),('bcryptjs, jsonwebtoken','Hash mật khẩu và phát hành token API.'),('express-session, connect-mongo','Quản lý đăng nhập website và lưu phiên trong MongoDB.'),('Multer, Helmet, CORS, express-rate-limit','Upload ảnh và middleware an toàn cho request.')],[5,12])
table(['Thư mục/tệp','Vai trò'],[
('backend/src/server.js, app.js','Khởi tạo kết nối, middleware và server Express.'),('backend/src/web.js','Route render EJS và xử lý form website.'),('backend/src/routes/index.js','REST API cho tài khoản, danh mục/sản phẩm, giỏ, đơn và admin.'),('backend/src/models/*.js','Mongoose models cho User, Category, Product, Cart, Order.'),('backend/src/middleware/auth.js','Xác thực và phân quyền route.'),('frontend/views','Template EJS trang khách hàng và quản trị.'),('database/compass','JSON mẫu và hướng dẫn import bằng MongoDB Compass.'),('backend/uploads','Ảnh sản phẩm được lưu cục bộ trong bản demo.')],[6,11])

heading('3.2. Giao diện và các phân hệ',2)
table(['Phân hệ','Nội dung chức năng'],[
('Trang chủ','Hiển thị nội dung và sản phẩm nổi bật, điều hướng vào cửa hàng.'),('Cửa hàng','Danh sách sản phẩm; tìm kiếm, lọc theo danh mục/giá, sắp xếp và phân trang.'),('Chi tiết sản phẩm','Mô tả, giá, hình ảnh, tình trạng kho; lựa chọn size/màu và số lượng.'),('Tài khoản','Đăng ký/đăng nhập/đăng xuất; hồ sơ và đổi mật khẩu.'),('Giỏ hàng','Xem các mặt hàng, sửa số lượng hoặc xóa mặt hàng.'),('Thanh toán/đơn hàng','Nhập người nhận/địa chỉ; đặt COD/chuyển khoản; xem đơn và trạng thái.'),('Quản trị','Dashboard; danh sách/thêm/sửa/ẩn sản phẩm, danh mục; tìm user; quản lý đơn và trạng thái.')],[4.2,12.8])
para('Các trang EJS chia sẻ layout điều hướng và footer. Form website gửi trực tiếp tới Express nên không cần frontend server riêng. Trang quản trị được bảo vệ bằng session và role admin. Ảnh upload hiện lưu trên máy chủ và được phục vụ qua đường dẫn /uploads.')

heading('3.3. Backend, route và API',2)
table(['Nhóm','Endpoint/route tiêu biểu','Quyền'],[
('Website catalog','GET /, /shop, /product/:id','Công khai'),('Website auth','GET/POST /register, /login; POST /logout; /profile','Một số thao tác yêu cầu đăng nhập'),('Website cart/order','/cart, /cart/add, /checkout, /order-history, /order/:id','Đăng nhập'),('Website admin','/admin/dashboard, /admin/products, /admin/categories, /admin/orders, /admin/users','Admin'),('REST auth/user','POST /api/auth/register, /login; GET /api/auth/me; PATCH /api/users/me','JWT theo endpoint'),('REST catalog','GET /api/categories, /api/products, /api/products/:id','Công khai'),('REST cart/order','/api/cart, /api/orders, /api/orders/my','Đăng nhập bằng Bearer JWT'),('REST admin','/api/admin/products, /categories, /orders, /users, /dashboard','Admin bằng Bearer JWT')],[3.5,9.5,4])
para('API trả JSON và lỗi theo dạng message; danh sách có thể kèm pagination. Web routes render template EJS và chuyển hướng sau khi xử lý form. Cả hai nhóm dùng chung Mongoose models để tránh tách đôi dữ liệu nghiệp vụ.')

heading('3.4. Luồng xử lý nghiệp vụ',2)
heading('Luồng checkout',3)
for x in ['Người dùng đăng nhập, chọn biến thể và số lượng; server kiểm tra sản phẩm còn hoạt động và dữ liệu hợp lệ.','Server tải giỏ, đối chiếu tồn kho từng sản phẩm và tính tổng theo giá hiện hành.','Server tạo order với thông tin người nhận, phương thức thanh toán và snapshot tên/ảnh/giá/biến thể.','Tồn kho được cập nhật giảm; giỏ được làm sạch khi giao dịch thành công. Nếu có lỗi giữa các bước, code thực hiện hoàn tác phần tồn kho đã giảm.','Quản trị viên cập nhật trạng thái; khi hủy, hệ thống cộng lại số lượng theo các order item.'] : bullet(x)
heading('Trạng thái đơn và thanh toán',3)
para('Đơn hàng sử dụng các trạng thái pending, confirmed, shipping, delivered, cancelled. Phương thức COD/bank được lưu như lựa chọn thanh toán; paymentStatus phản ánh trạng thái ghi nhận trong ứng dụng. Bản hiện tại chưa kết nối cổng thanh toán nên không tự xác nhận giao dịch ngân hàng.')

heading('3.5. Cài đặt và vận hành',2)
para('Yêu cầu môi trường: Node.js 18 trở lên và MongoDB 6 trở lên. Các bước dưới đây dựa trên README trong repository:')
for x in ['Cài dependency tại thư mục dự án bằng npm install.','Sao chép .env.example thành .env; cấu hình MONGODB_URI, JWT_SECRET và SESSION_SECRET bằng giá trị riêng. Không chia sẻ file .env.','Khởi động server với npm run dev; truy cập website tại http://localhost:3000. REST API ở http://localhost:3000/api; kiểm tra trạng thái qua GET /api/health.','Dùng MongoDB Compass kết nối cùng URI; import JSON mẫu trong database/compass theo hướng dẫn README. Import danh mục trước sản phẩm và tránh import lặp dữ liệu có unique key.','Tạo user bằng trang đăng ký; cấp role admin thủ công cho tài khoản được tin cậy qua MongoDB. Không có endpoint công khai để tự nâng quyền.'] : bullet(x)
para('Dữ liệu import demo giúp trình diễn giao diện nhưng không thay thế backup. Cấu hình triển khai cần đặt secret thật, HTTPS, CORS theo domain và chính sách backup phù hợp.')

heading('3.6. Kịch bản kiểm thử đề xuất',2)
para('Các trường hợp dưới đây là kịch bản cần thực hiện; báo cáo không đánh dấu đã chạy thành công vì chưa có bằng chứng kiểm thử runtime với MongoDB được kết nối.')
table(['Mã','Tình huống','Kết quả mong đợi'],[
('TC-01','Đăng ký với email mới và email trùng','Tạo user hợp lệ; email trùng bị từ chối.'),('TC-02','Khách chưa đăng nhập truy cập cart/admin','Được yêu cầu đăng nhập; user thường không vào được admin.'),('TC-03','Tìm/lọc/sắp xếp sản phẩm','Danh sách khớp tiêu chí và phân trang chính xác.'),('TC-04','Thêm giỏ với biến thể và số lượng sai','Dữ liệu đúng được lưu; số lượng không hợp lệ bị từ chối.'),('TC-05','Checkout đủ kho và vượt kho','Đơn hợp lệ tạo snapshot và trừ kho; vượt kho bị chặn.'),('TC-06','Admin hủy đơn','Trạng thái đổi và tồn kho được hoàn theo đơn.'),('TC-07','Ẩn sản phẩm/danh mục đã có đơn','Không hiện trong catalog mới nhưng dữ liệu đơn cũ vẫn đọc được.'),('TC-08','Upload tệp quá giới hạn','Request bị từ chối và ứng dụng không lưu tệp vượt giới hạn.')],[1.5,6.5,9])

heading('3.7. Giới hạn và hướng phát triển',2)
table(['Giới hạn hiện tại','Hướng hoàn thiện'],[
('Chuyển khoản chưa xác nhận tự động; chưa tích hợp payment gateway.','Tích hợp cổng thanh toán, webhook, đối soát và xử lý idempotent.'),('Quên mật khẩu chưa có quy trình gửi email đặt lại.','Thêm token một lần, hạn sử dụng, email và lưu vết thay đổi.'),('Ảnh lưu trên local disk.','Dùng object storage/CDN, kiểm tra MIME, đổi tên và dọn tệp không còn tham chiếu.'),('Chưa có CSRF protection cho form EJS; chưa xác minh test tự động.','Bổ sung CSRF, test unit/integration, logging, giám sát và kiểm thử bảo mật.'),('Tồn kho là số tổng, chưa tách size/màu.','Thiết kế inventory variant để quản lý tồn độc lập theo biến thể.'),('Chưa xác nhận vận hành đa instance và backup định kỳ.','Dùng storage dùng chung, backup/restore thử nghiệm và triển khai HTTPS.')],[7.2,9.8])

# Conclusion & references
page(); heading('KẾT LUẬN',1)
para('Dự án Online Shop hiện thực một website bán hàng thời trang với giao diện EJS, ứng dụng Express và MongoDB thông qua Mongoose. Phạm vi đã mô tả gồm xem/tìm sản phẩm, tài khoản, giỏ hàng, đặt hàng, lịch sử đơn và trang quản trị. Thiết kế tách collection theo thực thể, nhúng giỏ/chi tiết đơn ở nơi phù hợp, giữ snapshot giá sản phẩm trong đơn và áp dụng phân quyền cho khu vực quản trị.')
para('Bản báo cáo tổng hợp hiện trạng mã nguồn ở mức phục vụ trình diễn và phát triển tiếp. Các bước ưu tiên tiếp theo là kiểm thử toàn luồng với cơ sở dữ liệu, tăng cường CSRF và bảo mật vận hành, tích hợp thanh toán/email, chuyển ảnh sang object storage và bổ sung backup/giám sát. Kết quả cần được xác nhận qua chạy thực tế trước khi triển khai cho người dùng.')
heading('TÀI LIỆU THAM KHẢO',1)
for x in [
'[1] HE173401_GiangTT_PRJ301.docx, tài liệu mẫu do người dùng cung cấp; tham khảo bố cục, cách chia chương và trình bày báo cáo.',
'[2] Mã nguồn dự án Online Shop: backend/src, frontend/views, database/compass, README.md và package.json.',
'[3] Express Documentation, https://expressjs.com/.',
'[4] Mongoose Documentation, https://mongoosejs.com/docs/.',
'[5] MongoDB Manual, https://www.mongodb.com/docs/manual/.',
'[6] EJS Documentation, https://ejs.co/.'
]: para(x)

doc.core_properties.title='Báo cáo đầy đủ dự án Online Shop'
doc.core_properties.subject='Khảo sát, phân tích, thiết kế và xây dựng website thương mại điện tử'
doc.core_properties.author='Sinh viên SDN302'
doc.save(OUT)
print(OUT)
