# Hướng dẫn Kiến trúc CSS Hệ thống ERP (Bắt Buộc Đọc)

Hệ thống ERP này sử dụng mô hình **Hybrid CSS** kết hợp giữa CSS Customize tĩnh (Legacy UI) và các Utility CSS hiện đại (Tailwind). Để tránh hiện tượng vỡ Layout, mất màu Dashboard, hoặc xung đột giao diện nghiêm trọng khi thêm/sửa tính năng mới, tất cả lập trình viên phải TÂN THỦ TUYỆT ĐỐI các nguyên tắc sau:

## 1. Không Bao Giờ Bật Tailwind Preflight
Trong file `tailwind.config.ts`, thuộc tính `preflight: false` phải ĐƯỢC GIỮ NGUYÊN.
- **Tại sao?** Tailwind Preflight là một bộ CSS Reset sẽ tự động xóa mờ toàn bộ border, padding, h1, h2 mặc định của trình duyệt. Việc bật nó (chuyển thành `true` hoặc xóa đi) sẽ **phá hủy ngay lập tức** toàn bộ giao diện bảng, layout, và các component cốt lõi trong `globals.css` được viết trước đó.

## 2. Bảo Vệ File `app/globals.css`
- **Không được xóa** hay thay thế thư viện các class dùng chung như `.btn-primary`, `.stat-card`, `.stat-card-blue`, `.main-wrapper`, `.sidebar-container`. 
- Nếu viết thêm Component UI mới hoàn toàn bằng Tailwind, chỉ chèn các Utility Class trực tiếp trên thẻ HTML.
- **Hãy cẩn thận trùng lặp class:** Khi Tailwind và Legacy CSS có chung tên class (vd: `.flex`, `.p-2`), trình duyệt sẽ nhận diện cái nào được khai báo sau.

## 3. Cách Phát Triển UI Mới An Toàn
Khi bạn (hoặc AI Tools) tạo thêm Module/Tính năng mới:
1. **Khuyên dùng:** Sử dụng Tailwind Utility Classes cho các Component mới (đã được cấu hình an toàn sẵn tại `postcss.config.js`).
2. **Khi sửa Component cũ:** Khuyến khích giữ lại các Class tùy chỉnh truyền thống (Legacy Classes) đang hoạt động ổn định. Đừng cố viết lại (rewrite) toàn bộ chúng thành Tailwind trừ khi bạn chắc chắn đã test kỹ trên toàn hệ thống.
3. Tách bạch Modular: Nếu CSS của bạn quá phức tạp, hãy tạo tệp `{ComponentName}.module.css` (CSS Modules). Đừng nhồi nhét mọi thứ vào `globals.css`.

## 4. Xử lý khi bị vỡ CSS (Troubleshooting)
Nếu lỡ tay làm hỏng cấu trúc và trên Local Node/Vite tự nhiên bị mất màu:
1. Chạy lệnh: `git fetch origin && git checkout origin/main -- app/globals.css tailwind.config.ts postcss.config.js` để khôi phục cấu hình lõi.
2. Xóa Cache của Next.js: Tắt terminal `npm run dev`, chạy `rm -rf .next` và khởi động lại.
3. Kiểm tra xem quá trình rewrite Component của bạn có vô tình làm mất file CSS class cũ không.

Vui lòng chuyển tài liệu này cho mọi lập trình viên hoặc chia sẻ với AI Coding Agent trước khi bắt đầu Task cắt HTML/CSS!
