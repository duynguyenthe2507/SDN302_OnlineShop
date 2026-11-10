from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree

OUT = Path(__file__).parent / 'diagrams' / 'Online_Shop_Diagrams.drawio'
OUT.parent.mkdir(parents=True, exist_ok=True)

mxfile = Element('mxfile', {'host':'app.diagrams.net','modified':'2026-11-10T03:00:00.000Z','agent':'Codex','version':'24.7.17','type':'device'})

def page(name, pid, width=1500, height=1000):
    diagram=SubElement(mxfile,'diagram',{'id':pid,'name':name})
    model=SubElement(diagram,'mxGraphModel',{'dx':str(width),'dy':str(height),'grid':'1','gridSize':'10','guides':'1','tooltips':'1','connect':'1','arrows':'1','fold':'1','page':'1','pageScale':'1','pageWidth':str(width),'pageHeight':str(height),'math':'0','shadow':'0'})
    root=SubElement(model,'root'); SubElement(root,'mxCell',{'id':'0'}); SubElement(root,'mxCell',{'id':'1','parent':'0'})
    return root

def vertex(root, cid, value, x,y,w,h, style, parent='1'):
    c=SubElement(root,'mxCell',{'id':cid,'value':value,'style':style,'vertex':'1','parent':parent})
    SubElement(c,'mxGeometry',{'x':str(x),'y':str(y),'width':str(w),'height':str(h),'as':'geometry'})
    return cid

def edge(root,cid,value,source,target,style=None):
    style=style or 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;'
    c=SubElement(root,'mxCell',{'id':cid,'value':value,'style':style,'edge':'1','parent':'1','source':source,'target':target})
    SubElement(c,'mxGeometry',{'relative':'1','as':'geometry'})
    return cid

def title(root,text):
    vertex(root,'title',text,35,20,1380,50,'text;html=1;align=center;verticalAlign=middle;fontSize=24;fontStyle=1;fontColor=#18324B;')

def actor(root,cid,name,x,y):
    vertex(root,cid,name,x,y,80,100,'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fontSize=14;')

def usecase(root,cid,name,x,y,w=180,h=58):
    vertex(root,cid,name,x,y,w,h,'ellipse;whiteSpace=wrap;html=1;fillColor=#EAF2F8;strokeColor=#4F81BD;fontSize=13;')

# Page 1: customer use cases
r=page('UC - Khách hàng','uc-customer',1500,940); title(r,'USE CASE DIAGRAM — KHÁCH HÀNG')
vertex(r,'boundary','Hệ thống Online Shop',240,110,1120,760,'rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#18324B;strokeWidth=2;fontSize=17;fontStyle=1;verticalAlign=top;spacingTop=12;')
actor(r,'guest','Khách',70,250); actor(r,'customer','Khách hàng\n(đã đăng nhập)',70,620)
usecases=[
('uc-home','Xem trang chủ',310,180),('uc-catalog','Duyệt danh mục /\nsản phẩm',550,180),('uc-search','Tìm kiếm, lọc,\nsắp xếp',810,180),('uc-detail','Xem chi tiết\nsản phẩm',1070,180),
('uc-register','Đăng ký',310,345),('uc-login','Đăng nhập /\nđăng xuất',550,345),('uc-profile','Cập nhật hồ sơ /\nđổi mật khẩu',810,345),('uc-cart','Quản lý giỏ hàng',1070,345),
('uc-checkout','Đặt hàng',430,570),('uc-orders','Xem lịch sử /\nchi tiết đơn',700,570),('uc-status','Theo dõi trạng thái\nđơn hàng',970,570)]
for a,b,x,y in usecases: usecase(r,a,b,x,y,195,62)
for i,target in enumerate(['uc-home','uc-catalog','uc-search','uc-detail','uc-register','uc-login']): edge(r,'guest-'+str(i),'','guest',target,'edgeStyle=none;html=1;endArrow=none;strokeColor=#666666;')
for i,target in enumerate(['uc-home','uc-catalog','uc-search','uc-detail','uc-login','uc-profile','uc-cart','uc-checkout','uc-orders','uc-status']): edge(r,'cust-'+str(i),'','customer',target,'edgeStyle=none;html=1;endArrow=none;strokeColor=#666666;')
edge(r,'rel-checkout-login','&lt;&lt;include&gt;&gt; đăng nhập','uc-checkout','uc-login','dashed=1;endArrow=open;endFill=0;html=1;fontSize=11;strokeColor=#777777;')
edge(r,'rel-cart-login','&lt;&lt;include&gt;&gt; đăng nhập','uc-cart','uc-login','dashed=1;endArrow=open;endFill=0;html=1;fontSize=11;strokeColor=#777777;')

# Page 2: admin use cases
r=page('UC - Quản trị viên','uc-admin',1500,900); title(r,'USE CASE DIAGRAM — QUẢN TRỊ VIÊN')
vertex(r,'boundary','Hệ thống Online Shop — khu vực quản trị',250,110,1120,720,'rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#18324B;strokeWidth=2;fontSize=17;fontStyle=1;verticalAlign=top;spacingTop=12;')
actor(r,'admin','Quản trị viên',75,380)
for a,b,x,y in [('dash','Xem dashboard /\nthống kê',330,180),('products','Quản lý sản phẩm\n(thêm / sửa / ẩn)',620,180),('categories','Quản lý danh mục\n(thêm / sửa / ẩn)',950,180),('orders','Tra cứu / xem\nchi tiết đơn',330,440),('status','Cập nhật trạng thái\nđơn hàng',620,440),('users','Tìm kiếm / khóa\nngười dùng',950,440)]: usecase(r,a,b,x,y,220,72)
for i,target in enumerate(['dash','products','categories','orders','status','users']): edge(r,'admin-link-'+str(i),'','admin',target,'edgeStyle=none;html=1;endArrow=none;strokeColor=#666666;')
vertex(r,'admin-note','Các route /admin yêu cầu session hợp lệ và role = admin.\nẢnh sản phẩm được tải lên qua Multer; xóa sản phẩm/danh mục là ẩn mềm.',320,650,900,105,'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FFF2CC;strokeColor=#D6B656;fontSize=13;')

# Page 3: context
r=page('Context Diagram','context',1500,900); title(r,'CONTEXT DIAGRAM — ONLINE SHOP')
vertex(r,'system','ONLINE SHOP\n\nWebsite EJS + Express\nREST API + Mongoose',560,300,360,220,'rounded=1;whiteSpace=wrap;html=1;fillColor=#D5E8D4;strokeColor=#82B366;strokeWidth=2;fontSize=18;fontStyle=1;')
vertex(r,'customer','Khách hàng',90,220,190,95,'rounded=1;whiteSpace=wrap;html=1;fillColor=#DAE8FC;strokeColor=#6C8EBF;fontSize=16;')
vertex(r,'admin','Quản trị viên',90,560,190,95,'rounded=1;whiteSpace=wrap;html=1;fillColor=#DAE8FC;strokeColor=#6C8EBF;fontSize=16;')
vertex(r,'mongo','MongoDB',1190,330,220,150,'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#E1D5E7;strokeColor=#9673A6;fontSize=16;')
edge(r,'customer-to-system','Duyệt / tìm sản phẩm, tài khoản, giỏ, đặt hàng, xem đơn','customer','system','edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;')
edge(r,'system-to-customer','Trang EJS / kết quả / trạng thái đơn','system','customer','edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;')
edge(r,'admin-to-system','Quản lý catalog, user và đơn hàng','admin','system','edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;')
edge(r,'system-to-admin','Dashboard / danh sách / kết quả cập nhật','system','admin','edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;')
edge(r,'system-to-db','Mongoose: truy vấn / tạo / cập nhật dữ liệu','system','mongo','edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;')
edge(r,'db-to-system','Document / kết quả truy vấn','mongo','system','edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;endFill=1;strokeWidth=1.5;fontSize=12;')
vertex(r,'notintegrated','Ngoài phạm vi tích hợp hiện tại: cổng thanh toán, email reset mật khẩu.\nBank transfer chỉ được ghi nhận làm phương thức thanh toán.',520,660,460,100,'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FFF2CC;strokeColor=#D6B656;fontSize=13;')

def sequence_page(name,pid,participants,messages,notes=None):
    r=page(name,pid,1600,1350); title(r,name.upper())
    left=90; gap=215; top=140; head_h=65; bottom=1200
    ids=[]
    for i,(label,kind) in enumerate(participants):
        x=left+i*gap
        cid='p'+str(i); ids.append(cid)
        if kind=='actor': actor(r,cid,label,x+30,top-8)
        elif kind=='db': vertex(r,cid,label,x,top,170,65,'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#E1D5E7;strokeColor=#9673A6;fontSize=13;')
        else: vertex(r,cid,label,x,top,190,65,'rounded=1;whiteSpace=wrap;html=1;fillColor=#DAE8FC;strokeColor=#6C8EBF;fontSize=13;')
        lx=x+(70 if kind=='actor' else 95)
        vertex(r,'life'+str(i),'',lx,top+head_h,1,bottom-(top+head_h),'shape=line;html=1;dashed=1;dashPattern=4 4;strokeColor=#999999;')
    for j,(src,dst,label,kind) in enumerate(messages):
        y=250+j*66
        sourceX=left+src*gap+(70 if participants[src][1]=='actor' else 95)
        targetX=left+dst*gap+(70 if participants[dst][1]=='actor' else 95)
        if kind=='return': style='edgeStyle=none;html=1;dashed=1;dashPattern=6 4;endArrow=open;endFill=0;strokeWidth=1.2;fontSize=12;fontColor=#555555;'
        else: style='edgeStyle=none;html=1;endArrow=block;endFill=1;strokeWidth=1.4;fontSize=12;'
        edge(r,'msg'+str(j),label,'life'+str(src),'life'+str(dst),style)
        # Explicit waypoints keep parallel replies and requests readable.
        eg=r.find("mxCell[@id='msg"+str(j)+"']/mxGeometry")
        point=SubElement(eg,'mxPoint',{'x':str(sourceX),'y':str(y),'as':'sourcePoint'})
        point=SubElement(eg,'mxPoint',{'x':str(targetX),'y':str(y),'as':'targetPoint'})
    if notes:
        vertex(r,'seq-note',notes,120,1240,1360,70,'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FFF2CC;strokeColor=#D6B656;fontSize=12;')
    return r

sequence_page('Sequence — Đăng nhập Website','seq-login',[
('Khách hàng','actor'),('Trình duyệt / EJS','app'),('Express Web','app'),('User Model','app'),('MongoDB users','db'),('Session Store','db')],[
(0,1,'Nhập email và mật khẩu','call'),(1,2,'POST /login','call'),(2,3,'Tìm user theo email','call'),(3,4,'findOne(email)','call'),(4,3,'User + password hash','return'),(3,2,'comparePassword() / trạng thái active','call'),(2,5,'regenerate session; lưu userId','call'),(5,2,'Session được lưu','return'),(2,1,'Redirect trang chủ hoặc dashboard admin','return'),
], 'Mật khẩu được so khớp bằng bcryptjs. Session web lưu qua connect-mongo; REST API dùng JWT ở luồng riêng.')

sequence_page('Sequence — Checkout','seq-checkout',[
('Khách hàng','actor'),('Trình duyệt / EJS','app'),('Express Web','app'),('Cart Model','app'),('Product Model','app'),('Order Model','app'),('MongoDB','db')],[
(0,1,'Nhập người nhận, địa chỉ, phương thức','call'),(1,2,'POST /checkout','call'),(2,3,'Tải cart và product','call'),(3,6,'Đọc cart theo user','call'),(6,3,'Cart + item refs','return'),(2,4,'Kiểm tra active và stock ≥ quantity','call'),(4,6,'Cập nhật stock giảm có điều kiện','call'),(6,4,'Kết quả cập nhật','return'),(2,5,'Tạo order với snapshot tên/ảnh/giá','call'),(5,6,'Insert order','call'),(6,5,'Order đã tạo','return'),(2,3,'Xóa item trong cart','call'),(3,6,'Cập nhật cart rỗng','call'),(2,1,'Redirect order success','return'),
], 'Nếu kiểm tra tồn kho hoặc tạo đơn lỗi, backend hoàn lại số lượng đã giảm và hiển thị thông báo. COD/bank chưa gọi cổng thanh toán.')

sequence_page('Sequence — Mua hàng và thanh toán','seq-purchase-payment',[
('Khách hàng','actor'),('Trình duyệt / EJS','app'),('Express Web','app'),('Cart Model','app'),('Product Model','app'),('Order Model','app'),('MongoDB','db')],[
(0,1,'Mở giỏ hàng','call'),(1,2,'GET /cart','call'),(2,3,'Tải giỏ theo user','call'),(3,6,'Đọc cart và populate sản phẩm','call'),(6,3,'Cart + thông tin hàng / giá','return'),(2,1,'Hiển thị giỏ và tổng tiền','return'),
(0,1,'Chọn Tiến hành thanh toán','call'),(1,2,'GET /checkout','call'),(2,3,'Tải lại giỏ và tính tổng','call'),(3,6,'Đọc dữ liệu cart/products','call'),(6,3,'Thông tin checkout','return'),(2,1,'Hiển thị form nhận hàng + COD/Bank','return'),
(0,1,'Nhập tên, điện thoại, địa chỉ, paymentMethod','call'),(1,2,'POST /checkout','call'),(2,2,'Validate thông tin và COD hoặc bank','call'),(2,3,'Đọc cart hiện tại','call'),(3,6,'Tải item và sản phẩm','call'),(6,3,'Cart + giá và tồn kho','return'),(2,4,'Kiểm tra active và stock đủ','call'),(4,6,'Giảm stock có điều kiện','call'),(6,4,'Kết quả cập nhật kho','return'),(2,5,'Tạo Order snapshot; status=pending, paymentStatus=unpaid','call'),(5,6,'Insert đơn hàng','call'),(6,5,'Order được lưu','return'),(2,3,'Xóa các item trong cart','call'),(3,6,'Lưu cart rỗng','call'),(2,1,'Redirect /order-success/:id','return'),(1,0,'Hiển thị xác nhận đặt hàng','return'),
], 'COD: khách trả khi nhận hàng. Bank: hệ thống chỉ lưu lựa chọn; chưa có giao dịch/cổng thanh toán hay xác nhận tự động. Nếu lỗi sau khi giảm kho, backend hoàn lại tồn kho.')

sequence_page('Sequence — Admin hủy đơn','seq-admin-cancel',[
('Quản trị viên','actor'),('Trình duyệt Admin','app'),('Auth Middleware','app'),('Express Admin Route','app'),('Order Model','app'),('Product Model','app'),('MongoDB','db')],[
(0,1,'Chọn trạng thái cancelled','call'),(1,2,'PATCH /admin/orders/:id/status','call'),(2,3,'Kiểm tra session/JWT và role admin','call'),(3,4,'Tải order theo id','call'),(4,6,'Đọc order + items','call'),(6,4,'Order hiện tại','return'),(3,5,'Với từng item: tăng stock theo quantity','call'),(5,6,'$inc stock','call'),(6,5,'Cập nhật thành công','return'),(3,4,'Lưu status = cancelled','call'),(4,6,'Cập nhật order','call'),(6,4,'Order đã hủy','return'),(3,1,'Trả kết quả cập nhật','return'),
], 'Không cho mở lại đơn đã hủy. Thao tác hoàn kho hiện thực hiện theo từng sản phẩm trong order.')

ElementTree(mxfile).write(OUT,encoding='utf-8',xml_declaration=True)
print(OUT)
