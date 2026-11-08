# MEDINEX TECH V2 — bản cập nhật

## Cấu trúc
- `index.html`: trang giới thiệu, lớp đăng nhập/đăng ký và không gian sau đăng nhập.
- `css/style.css`: giao diện teal – trắng.
- `js/script.js`: điều hướng, tài khoản demo và các tương tác.

## Điều chỉnh trong bản này
- Giữ nguyên cấu trúc và dữ liệu demo/localStorage hiện có.
- Các mục trong dashboard là các màn hình nội bộ riêng; khi chuyển mục, URL cập nhật dạng `#app/overview`, `#app/homecare`, `#app/students`, `#app/records`, `#app/sos`, `#app/requests`, `#app/profile`. Hỗ trợ nút Back/Forward của trình duyệt.
- Thay banner “Khám phá dịch vụ” ở trang tổng quan bằng khu vực MEDINEX AI – Trợ lý sức khỏe.
- Biểu mẫu trợ lý sức khỏe hiện là mô phỏng định hướng dựa trên từ khóa, KHÔNG phải mô hình AI, không chẩn đoán và không thay thế nhân viên y tế.
- Những cảnh báo khẩn cấp trong phần mô phỏng nhắc người dùng gọi 115/đến cơ sở cấp cứu; SOS vẫn chưa kết nối tổng đài thật.

## Chạy thử
Mở thư mục bằng VS Code, chạy `index.html` với Live Server hoặc mở trực tiếp bằng trình duyệt.

## Giới hạn
Tài khoản và dữ liệu vẫn lưu cục bộ trong trình duyệt (`localStorage`). Chưa có xác thực máy chủ, cơ sở dữ liệu dùng chung, kết nối bệnh viện, xác minh hồ sơ sinh viên hoặc mô hình AI lâm sàng. Không nhập dữ liệu sức khỏe thật/nhạy cảm vào bản demo.
