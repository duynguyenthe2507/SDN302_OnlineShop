from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from pathlib import Path

OUT = Path(__file__).with_name('Bao_cao_du_an_Online_Shop.docx')
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.top_margin, sec.bottom_margin = Cm(1.8), Cm(1.8)
sec.left_margin, sec.right_margin = Cm(2.1), Cm(2.1)
sec.different_first_page_header_footer = True

NAVY = '18324B'
BLUE = 'DCE7F0'
PALE = 'F3F6F8'
GRAY = '5B6570'
BLACK = '000000'

def set_font(run, size=10.2, bold=None, color=BLACK, italic=None):
    run.font.name = 'Times New Roman'
    run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    if bold is not None: run.bold = bold
    if italic is not None: run.italic = italic
    return run

styles = doc.styles
normal = styles['Normal']
normal.font.name = 'Times New Roman'; normal._element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
normal.font.size = Pt(10.2); normal.font.color.rgb = RGBColor(0,0,0)
normal.paragraph_format.space_after = Pt(4)
normal.paragraph_format.line_spacing = 1.08
for name, size in [('Title', 24), ('Heading 1', 16), ('Heading 2', 12.2), ('Heading 3', 10.8)]:
    st = styles[name]
    st.font.name = 'Times New Roman'; st._element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    st.font.size = Pt(size); st.font.bold = True; st.font.color.rgb = RGBColor(0,0,0)
    st.paragraph_format.space_before = Pt(7 if name != 'Title' else 0)
    st.paragraph_format.space_after = Pt(4)
    st.paragraph_format.keep_with_next = True

def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr(); shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), fill); tcPr.append(shd)

def cell_margins(cell, top=75, start=95, bottom=75, end=95):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr(); mar = OxmlElement('w:tcMar')
    for side, val in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        node=OxmlElement('w:'+side); node.set(qn('w:w'),str(val)); node.set(qn('w:type'),'dxa'); mar.append(node)
    tcPr.append(mar)

def table_borders(table):
    tblPr=table._tbl.tblPr; borders=OxmlElement('w:tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        el=OxmlElement('w:'+edge); el.set(qn('w:val'),'single'); el.set(qn('w:sz'),'5'); el.set(qn('w:color'),'D9E0E5'); borders.append(el)
    tblPr.append(borders)

def add_table(headers, rows, widths=None, font=9.0):
    t=doc.add_table(rows=1, cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    table_borders(t)
    for i,h in enumerate(headers):
        c=t.rows[0].cells[i]; c.text=''; shade(c,NAVY); cell_margins(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.alignment=WD_ALIGN_PARAGRAPH.LEFT
        set_font(p.add_run(h),font,bold=True,color='FFFFFF')
    trPr=t.rows[0]._tr.get_or_add_trPr(); trPr.append(OxmlElement('w:tblHeader'))
    for ri,row in enumerate(rows):
        cells=t.add_row().cells
        for i,val in enumerate(row):
            c=cells[i]; c.text=''; cell_margins(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ri%2: shade(c,PALE)
            p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.02
            set_font(p.add_run(str(val)),font,color=BLACK)
        if widths:
            for i,w in enumerate(widths): cells[i].width=Cm(w)
    if widths:
        for i,w in enumerate(widths): t.columns[i].width=Cm(w); t.rows[0].cells[i].width=Cm(w)
    doc.add_paragraph().paragraph_format.space_after=Pt(0)
    return t

def para(text='', bold_lead=None, italic=False, align=None, size=10.2, after=4):
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(after); p.paragraph_format.line_spacing=1.08
    if align is not None: p.alignment=align
    if bold_lead and text.startswith(bold_lead):
        set_font(p.add_run(bold_lead),size,bold=True)
        set_font(p.add_run(text[len(bold_lead):]),size,italic=italic)
    else: set_font(p.add_run(text),size,italic=italic)
    return p

def bullet(text, level=0):
    p=doc.add_paragraph(style='List Bullet' if level==0 else 'List Bullet 2')
    p.paragraph_format.space_after=Pt(2); p.paragraph_format.line_spacing=1.04
    set_font(p.add_run(text),9.8)
    return p

def heading(text, level=1):
    p=doc.add_paragraph(style=f'Heading {level}')
    set_font(p.add_run(text), {1:15,2:11.8,3:10.5}[level], bold=True, color=BLACK)
    return p

def pagebreak(): doc.add_page_break()

# Running header and page-number footer. The cover uses the separate first-page footer.
header=sec.header.paragraphs[0]
header.alignment=WD_ALIGN_PARAGRAPH.RIGHT
set_font(header.add_run('SDN302  |  ONLINE SHOP'),8.5,bold=True,color=GRAY)
footer=sec.footer.paragraphs[0]
footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
set_font(footer.add_run('BÁO CÁO DỰ ÁN  •  '),8.5,color=GRAY)
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); footer._p.append(fld)

# Cover page
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(52); p.paragraph_format.space_after=Pt(6)
set_font(p.add_run('FPT UNIVERSITY'),15,bold=True)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(62)
set_font(p.add_run('MÔN HỌC SDN302'),11,bold=True,color=GRAY)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(13)
set_font(p.add_run('BÁO CÁO DỰ ÁN'),19,bold=True)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(8)
set_font(p.add_run('XÂY DỰNG WEBSITE BÁN HÀNG ONLINE SHOP'),23,bold=True)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(62)
set_font(p.add_run('Phân tích, thiết kế và xây dựng hệ thống thương mại điện tử'),11,italic=True,color=GRAY)
for label in ['Sinh viên / Nhóm:  ........................................................................', 'Mã sinh viên:  ................................................................................', 'Giảng viên hướng dẫn:  ................................................................']:
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(12)
    set_font(p.add_run(label),11)
p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(45)
set_font(p.add_run('NĂM 2026'),11,bold=True)

# Chapter 2, page 2
pagebreak(); heading('CHƯƠNG 2. KHẢO SÁT, PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG',1)
heading('2.1. Khảo sát và mục tiêu',2)
para('Online Shop là website bán sản phẩm thời trang, cho phép khách xem danh mục, tìm và lọc sản phẩm, chọn kích cỡ/màu sắc, đặt hàng và theo dõi đơn. Nhân viên quản trị cập nhật danh mục, sản phẩm, người dùng và trạng thái đơn hàng. Báo cáo mô tả hiện trạng mã nguồn trong dự án SDN302_OnlineShop.')
para('Mục tiêu là xây dựng một luồng mua sắm chạy trên trình duyệt, lưu dữ liệu tập trung trên MongoDB và tách quyền khách hàng với quản trị viên. Hệ thống dùng các trang EJS được render bởi Express; cùng ứng dụng cung cấp REST API cho khả năng tích hợp thêm client.')
heading('2.2. Tác nhân và yêu cầu chức năng',2)
add_table(['Tác nhân','Chức năng chính'],[
 ('Khách / thành viên','Duyệt, tìm kiếm, lọc và xem chi tiết sản phẩm; đăng ký, đăng nhập, sửa hồ sơ/đổi mật khẩu; quản lý giỏ và đặt hàng COD hoặc chuyển khoản; xem lịch sử đơn.'),
 ('Quản trị viên','Xem thống kê; thêm, sửa, ẩn sản phẩm/danh mục; tra cứu và khóa tài khoản; xem đơn hàng và cập nhật trạng thái.'),
 ('Hệ thống','Xác thực tài khoản, kiểm tra dữ liệu và tồn kho, lưu snapshot giá khi đặt hàng, trừ kho và hoàn kho khi hủy đơn.')
], [3.2,13.3], 9.1)
heading('2.3. Yêu cầu phi chức năng',2)
bullet('Bảo mật thông tin đăng nhập bằng bcrypt; phân quyền quản trị; cookie session có HttpOnly và SameSite; giới hạn kích thước tệp ảnh và request JSON.')
bullet('Dữ liệu có kiểm tra kiểu/ràng buộc; sản phẩm và danh mục được ẩn mềm để giữ liên kết lịch sử đơn.')
bullet('Giao diện dùng Bootstrap, hỗ trợ bố cục co giãn; cấu hình database và secret được tách khỏi mã nguồn qua .env.')
para('Phạm vi bản hiện tại: thanh toán ghi nhận COD/chuyển khoản, chưa tích hợp cổng thanh toán; đặt lại mật khẩu cần bổ sung dịch vụ email.',bold_lead='Phạm vi bản hiện tại:',size=9.4,after=0)

# Chapter 2, page 3
pagebreak(); heading('2.4. Phân tích luồng và kiến trúc',1)
heading('Luồng mua hàng',2)
add_table(['Bước','Xử lý'],[
 ('1. Duyệt','Khách xem sản phẩm, lọc theo danh mục/khoảng giá, tìm theo tên, sắp xếp và phân trang.'),
 ('2. Chọn hàng','Mở chi tiết, chọn size/màu/số lượng. Người dùng đăng nhập để lưu giỏ hàng theo tài khoản.'),
 ('3. Đặt hàng','Nhập người nhận, điện thoại, địa chỉ và phương thức thanh toán. Server kiểm tra tồn kho và tạo đơn.'),
 ('4. Hoàn tất','Đơn giữ snapshot tên/ảnh/giá; tồn kho giảm. Khi quản trị hủy đơn, số lượng được cộng lại.')
], [3.0,13.5], 9.2)
heading('Kiến trúc triển khai',2)
add_table(['Tầng','Thành phần','Vai trò'],[
 ('Giao diện','EJS, Bootstrap','Các trang khách hàng và quản trị; form gửi request tới Express.'),
 ('Ứng dụng','Express 4, web routes, REST routes','Render trang, xử lý form, xác thực session/JWT, kiểm tra quyền và nghiệp vụ.'),
 ('Truy cập dữ liệu','Mongoose','Schema, validate, truy vấn, populate quan hệ và cập nhật tồn kho.'),
 ('Lưu trữ','MongoDB','users, categories, products, carts, orders và sessions.')
], [2.8,4.3,9.4], 8.9)
para('Luồng tổng quát: Trình duyệt → Express (EJS hoặc /api) → Mongoose → MongoDB. Session web lưu trong collection sessions; REST API dùng Bearer JWT.',bold_lead='Luồng tổng quát:',size=9.6,after=3)
heading('Quyền truy cập',2)
para('Danh mục/sản phẩm công khai cho phép khách truy cập. Giỏ hàng, hồ sơ và đơn hàng yêu cầu đăng nhập. Các route /admin yêu cầu role admin; đăng ký công khai luôn tạo role user. Tài khoản admin được cấp quyền bởi thao tác quản trị cơ sở dữ liệu.')

# Chapter 2, page 4
pagebreak(); heading('2.5. Thiết kế cơ sở dữ liệu MongoDB',1)
para('Mỗi thực thể là một collection. Khóa tham chiếu dùng ObjectId; các schema bật timestamps để lưu createdAt/updatedAt.')
add_table(['Collection','Trường tiêu biểu','Quan hệ / mục đích'],[
 ('users','name, email, password, phone, address, role, isActive','email duy nhất; password bcrypt; role user/admin.'),
 ('categories','name, description, isActive','name duy nhất; phân loại sản phẩm.'),
 ('products','name, category, price, image, sizes, colors, stock, isActive','category tham chiếu categories; thông tin và tồn kho.'),
 ('carts','user, items[{product,size,color,quantity}]','Một giỏ/user; item tham chiếu products và nhúng lựa chọn.'),
 ('orders','user, items snapshot, người nhận, paymentMethod, status, totalPrice','user tham chiếu users; item giữ product ref cùng tên/ảnh/giá tại thời điểm mua.')
], [2.3,7.0,7.2], 8.5)
heading('Quan hệ dữ liệu',2)
bullet('Category 1–N Product: mỗi sản phẩm thuộc một danh mục; một danh mục có nhiều sản phẩm.')
bullet('User 1–1 Cart: giỏ là một document theo user, chứa danh sách sản phẩm và biến thể.')
bullet('User 1–N Order; Order 1–N OrderItem: chi tiết đơn nhúng trong orders để giữ snapshot và giảm truy vấn.')
heading('Chỉ mục và toàn vẹn',2)
para('Email user và tên category có unique index; product có text index cho tên, index danh mục/ngày tạo; order index user, trạng thái và ngày tạo. Mongoose kiểm tra enum/giá/số lượng. Checkout chỉ trừ kho khi stock đủ; hủy đơn cộng kho lại. Xóa sản phẩm/danh mục là chuyển isActive=false, không xóa tham chiếu lịch sử.')
para('Giỏ không giữ giá cố định: tổng tiền được tính theo giá sản phẩm hiện tại. Ngược lại, đơn hàng chốt giá tại thời điểm đặt.',bold_lead='Giỏ không giữ giá cố định:',size=9.4,after=0)

# Chapter 3, page 5
pagebreak(); heading('CHƯƠNG 3. XÂY DỰNG WEBSITE',1)
heading('3.1. Công nghệ sử dụng',2)
add_table(['Công nghệ','Ứng dụng trong dự án'],[
 ('Node.js, Express','Khởi chạy server, định tuyến trang EJS và REST API.'),
 ('EJS, Bootstrap','Render HTML phía server; bố cục responsive và component giao diện.'),
 ('MongoDB, Mongoose','Lưu collection, định nghĩa model, validate và truy vấn dữ liệu.'),
 ('bcryptjs, JWT, session','Hash mật khẩu; cấp token cho API; session web lưu bằng connect-mongo.'),
 ('Multer, Helmet, CORS, rate limit','Nhận tệp ảnh; thiết lập HTTP security headers, CORS và giới hạn request API.')
], [4.0,12.5], 9.1)
heading('3.2. Các phân hệ đã xây dựng',2)
add_table(['Phân hệ','Tệp / chức năng tiêu biểu'],[
 ('Cửa hàng','home, shop, product-detail: danh mục, tìm/lọc/sắp xếp, phân trang, chi tiết và biến thể.'),
 ('Tài khoản','register, login, profile: bcrypt, session, cập nhật thông tin và đổi mật khẩu.'),
 ('Giỏ và đơn hàng','cart, checkout, order-history: kiểm tồn, tạo đơn và theo dõi trạng thái.'),
 ('Quản trị','dashboard, products, categories, orders, users: thống kê, CRUD/ẩn và cập nhật trạng thái.'),
 ('Backend/API','backend/src/app.js, web.js, routes/index.js và models: EJS web routes, REST API và Mongoose.')
], [3.1,13.4], 8.9)
heading('3.3. Bố cục giao diện',2)
para('Giao diện khách hàng dùng layout chung có thanh điều hướng, tìm kiếm, giỏ hàng và footer; trang đăng nhập/đăng ký có layout riêng. Quản trị dùng sidebar với các mục dashboard, sản phẩm, danh mục, đơn hàng và người dùng. Form quản trị nhận ảnh tối đa 5 MB và lưu tại backend/uploads.')

# Chapter 3, page 6
pagebreak(); heading('3.4. Tổ chức route và tích hợp',1)
add_table(['Nhóm route','Ví dụ','Cách tích hợp'],[
 ('Trang EJS','/, /shop, /product/:id','Express truy vấn model và render view với dữ liệu.'),
 ('Tài khoản','/register, /login, /profile','Form POST; session MongoDB nhận diện user và kiểm soát quyền.'),
 ('Mua hàng','/cart/add, /checkout, /order-history','Cart/Order lưu MongoDB; checkout chốt snapshot giá và tồn kho.'),
 ('Quản trị','/admin/products, /admin/orders','Middleware kiểm tra session và role admin trước khi render/ghi dữ liệu.'),
 ('REST API','/api/auth, /api/products, /api/cart, /api/orders','JSON endpoints; xác thực Bearer token; dùng chung model Mongoose.')
], [3.0,5.2,8.3], 8.6)
heading('3.5. Cài đặt và chạy',2)
para('Yêu cầu Node.js và MongoDB. Tạo .env từ .env.example, cấu hình MONGODB_URI, JWT_SECRET và SESSION_SECRET; import dữ liệu mẫu theo thứ tự categories → products → users → orders trong database/compass; chạy npm install, npm run dev và mở http://localhost:3000. API có health endpoint tại /api/health.')
heading('3.6. Giới hạn hiện tại',2)
bullet('Phương thức bank chỉ ghi nhận lựa chọn; chưa kết nối ngân hàng/cổng thanh toán. Quên mật khẩu chưa gửi email đặt lại.')
bullet('Ảnh lưu trên ổ đĩa máy chủ; triển khai nhiều instance cần chuyển sang object storage dùng chung.')
bullet('Nên bổ sung CSRF protection cho form, kiểm thử tự động, log nghiệp vụ, backup và phân quyền chi tiết trước khi triển khai thật.')
para('Các file JSON mẫu trong database/compass có thể import bằng MongoDB Compass để dựng dữ liệu demo. Không import lặp vì các khóa và tên danh mục được đặt cố định.',bold_lead='Các file JSON mẫu',size=9.4,after=0)

# Conclusion / references, page 7
pagebreak(); heading('KẾT LUẬN',1)
para('Dự án Online Shop đã hình thành một website bán hàng thời trang gồm giao diện EJS, backend Express và dữ liệu MongoDB qua Mongoose. Các luồng chính bao gồm duyệt sản phẩm, đăng nhập, giỏ hàng, đặt hàng, quản trị sản phẩm/danh mục và xử lý trạng thái đơn. Thiết kế tách dữ liệu tài khoản, danh mục, sản phẩm, giỏ và đơn; snapshot giá trong đơn giúp giữ lịch sử giao dịch.')
heading('Kết quả và hướng phát triển',2)
bullet('Đã có cấu trúc model, route server-rendered và REST API; mật khẩu được hash, trang admin có phân quyền, checkout có kiểm tra tồn kho.')
bullet('Bước tiếp theo: tích hợp thanh toán thật và email đặt lại mật khẩu; thêm CSRF, upload cloud, bộ kiểm thử, triển khai HTTPS và backup MongoDB.')
para('Hệ thống phù hợp làm nền tảng demo và tiếp tục mở rộng. Trước vận hành thực tế cần kiểm thử đầy đủ với MongoDB triển khai, rà soát bảo mật và cấu hình lưu trữ ảnh bền vững.')
heading('TÀI LIỆU THAM KHẢO',2)
para('[1] Báo cáo PRJ301_DEMO.pdf, tài liệu mẫu do người dùng cung cấp; tham khảo bố cục Chương 2, Chương 3 và phần kết luận.',size=9.5,after=3)
para('[2] Mã nguồn dự án SDN302_OnlineShop: backend/src/models, backend/src/routes, backend/src/web.js và frontend/views.',size=9.5,after=3)
para('[3] Express Documentation, https://expressjs.com/; Mongoose Documentation, https://mongoosejs.com/docs/.',size=9.5,after=3)

doc.core_properties.title='Báo cáo dự án Online Shop'
doc.core_properties.subject='Phân tích, thiết kế và xây dựng website bán hàng thời trang'
doc.core_properties.author='Sinh viên SDN302'
doc.save(OUT)
print(OUT)
