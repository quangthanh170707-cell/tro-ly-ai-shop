# Trợ lý AI bán hàng cho shop thời trang (prototype)

Bản prototype của dự án khởi nghiệp: trợ lý AI trả lời khách trên kênh nhắn tin, **chỉ dùng dữ liệu của shop** và **chuyển cho nhân viên khi không chắc**. Dữ liệu cửa hàng trong code là dữ liệu mẫu.

## Tính năng
- Tư vấn size theo chiều cao, cân nặng (bảng size mẫu).
- Kiểm tra tồn kho theo màu và size, gợi ý màu/size còn hàng khi hết.
- Báo giá, trả lời phí giao hàng, chính sách đổi size.
- Chốt đơn trong hội thoại (tạo đơn nháp, hỏi thêm màu/size nếu thiếu).
- Chuyển nhân viên khi: khiếu nại, hoàn tiền, tranh chấp, hoặc câu hỏi nằm ngoài dữ liệu (kèm bản tóm tắt).
- Bảng điều khiển cho chủ shop: số tin nhắn, tỷ lệ AI tự xử lý, thời gian phản hồi, nguồn dữ liệu đã dùng, hộp thư ca chuyển người, nhật ký.
- Che số điện thoại trước khi gửi nội dung cho mô hình AI; chặn câu trả lời có con số không nằm trong dữ liệu.

## Cấu trúc
```
index.html   giao diện
style.css    kiểu dáng (có chế độ sáng/tối)
app.js       dữ liệu mẫu, bộ xử lý ý định (think), diễn đạt (phrase), giao diện
```

## Chạy thử
Mở `index.html` bằng trình duyệt, hoặc chạy máy chủ tĩnh:
```
python3 -m http.server 8000
```
rồi vào http://localhost:8000. Không cần cài thư viện, không cần khóa API.

## Đưa lên GitHub và GitHub Pages
```
git init
git add .
git commit -m "Prototype trợ lý AI bán hàng cho shop thời trang"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git push -u origin main
```
Để chạy trực tiếp trên web: vào **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**. Địa chỉ sẽ có dạng `https://<tai-khoan>.github.io/<ten-repo>/`.

## Cách hoạt động
1. `send()` nhận tin nhắn của khách.
2. `think()` nhận diện ý định bằng luật và tra dữ liệu shop (mảng `P` là sản phẩm và tồn kho, mảng `CH` là bảng size). Kết quả là các câu thông tin đã được kiểm chứng, nguồn dữ liệu và quyết định có chuyển nhân viên hay không.
3. `phrase()` diễn đạt lại các câu đó. Nếu chạy trong môi trường có Claude (trang `claude.ai`), câu trả lời được viết lại tự nhiên rồi bị chặn nếu chứa số liệu lạ. Khi chạy ở nơi khác (máy cá nhân, GitHub Pages), AI tự dùng câu trả lời chuẩn từ bộ luật, mọi chức năng khác vẫn hoạt động.

## Chỉnh dữ liệu mẫu
- Thêm sản phẩm: thêm một phần tử vào mảng `P` trong `app.js` (`id`, `name`, từ khóa `k`, `price`, tồn kho `st` theo màu và size). Thêm tên màu mới vào đối tượng `COL`.
- Đổi chính sách giao hàng, đổi size: sửa các chuỗi trong hàm `think()` và đoạn chú thích trong `index.html`.

## Giới hạn hiện tại
- Chỉ là prototype: chưa kết nối Messenger, Zalo, TikTok Shop, Shopee và chưa có máy chủ hay cơ sở dữ liệu; mọi trạng thái nằm trong trình duyệt và mất khi tải lại trang.
- Bộ nhận diện ý định dựa trên từ khóa nên chỉ phủ một số mẫu câu; bước tiếp theo là truy xuất tri thức (RAG) trên dữ liệu thật và kết nối API kênh bán hàng.
- Dữ liệu sản phẩm, giá và chính sách là dữ liệu giả lập, không phải của shop thật.
