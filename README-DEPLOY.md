# Hướng Dẫn Triển Khai Hệ Thống (Deployment Guide)

Thư mục `implement` này chứa bộ mã nguồn sạch, đầy đủ của hệ thống ERP (Next.js 14 + Prisma + MySQL), đã loại bỏ toàn bộ file rác, log, cache, dữ liệu tải lên cũ và các script debug tạm thời.

---

## 1. Cấu trúc thư mục chuẩn

```text
implement/
├── app/                        # Toàn bộ mã nguồn Next.js App Router (Pages, Components, Actions, API)
├── lib/                        # Các thư viện xử lý lõi (Auth, Prisma, Permissions, Accounting, Mailer, Storage...)
├── prisma/                     # Cấu hình CSDL Prisma
│   ├── migrations/             # Lịch sử migration CSDL
│   ├── schema.prisma           # Schema chuẩn của hệ thống
│   └── seed.ts                 # Script khởi tạo dữ liệu gốc (Nhóm quyền, Admin mặc định, Cài đặt cơ bản)
├── public/                     # Tài nguyên tĩnh (Icons, Manifest, Service Worker, thư mục uploads rỗng)
├── uploads_data/               # Thư mục lưu trữ tài liệu tải lên (Storage Vault)
├── types/                      # Khai báo TypeScript Definition (.d.ts)
├── scripts/                    # Các script tiện ích phục vụ khởi tạo site mới
│   ├── setup-admin.js          # Tạo nhanh tài khoản Admin mặc định (admin@example.com / admin123)
│   ├── seed-business-email-templates.js # Bộ mẫu Email doanh nghiệp chuẩn
│   ├── seed-local-templates.js # Script nạp mẫu Email vào DB
│   ├── generate-vapid.js       # Tạo cặp khóa VAPID cho Web Push Notification
│   ├── pbx-cron.js             # Script chạy ngầm đồng bộ tổng đài PBX (nếu dùng)
│   ├── seed-demo.ts            # Khởi tạo dữ liệu sản phẩm/nhà cung cấp mẫu (tùy chọn)
│   └── seed-procurement.ts     # Khởi tạo dữ liệu mua hàng mẫu (tùy chọn)
├── android/ & ios/             # Cấu hình Capacitor Mobile App (tùy chọn)
├── .env.example                # File mẫu cấu hình biến môi trường
├── nginx.conf.example          # File mẫu cấu hình Nginx Reverse Proxy
├── CSS-ARCHITECTURE-GUIDE.md   # Tài liệu quy chuẩn kiến trúc CSS
├── middleware.ts               # Middleware bảo vệ route và phân quyền
├── next.config.mjs             # Cấu hình Next.js
├── tailwind.config.ts          # Cấu hình TailwindCSS (preflight: false)
├── postcss.config.js           # Cấu hình PostCSS
├── tsconfig.json               # Cấu hình TypeScript
└── package.json                # Danh sách dependencies và scripts
```

---

## 2. Các bước triển khai lên Site mới

### Bước 1: Chuẩn bị môi trường máy chủ
- **Node.js**: Phiên bản `>= 18.x` (khuyên dùng `20.x LTS`)
- **MySQL / MariaDB**: Tạo sẵn 1 database trống (ví dụ: `erp_newsite` với bảng mã `utf8mb4_unicode_ci`)
- **PM2**: Cài đặt toàn cục để quản lý tiến trình (`npm install -g pm2`)

### Bước 2: Thiết lập biến môi trường (`.env`)
Sao chép `.env.example` thành `.env` và điền thông số thực tế của site mới:
```bash
cp .env.example .env
```
Cập nhật tối thiểu các biến sau trong `.env`:
- `DATABASE_URL="mysql://user:password@127.0.0.1:3306/erp_newsite"`
- `NEXTAUTH_URL="https://ten-mien-moi.com"`
- `NEXT_PUBLIC_APP_URL="https://ten-mien-moi.com"`
- `NEXTAUTH_SECRET="chuoi-ngau-nhien-bao-mat"`

### Bước 3: Cài đặt thư viện & Khởi tạo Cơ sở dữ liệu
```bash
# 1. Cài đặt dependencies
npm install

# 2. Generate Prisma Client & Đồng bộ cấu trúc bảng vào MySQL
npx prisma generate
npx prisma db push

# 3. Khởi tạo tài khoản Admin & Nhóm quyền mặc định
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
# Hoặc chỉ tạo nhanh tài khoản Admin (admin@example.com / admin123):
node scripts/setup-admin.js
```

### Bước 4: Build & Khởi chạy ứng dụng với PM2
```bash
# 1. Build bản Production
npm run build

# 2. Khởi chạy với PM2 (Mặc định chạy ở cổng 6688 theo package.json)
pm2 start npm --name "erp-site" -- start
pm2 save
```
*(Nếu triển khai nhiều site trên cùng 1 server, hãy đổi cổng `-p 6688` trong `package.json` sang cổng riêng cho từng site và cập nhật `proxy_pass` tương ứng trong Nginx).*

### Bước 5: Cấu hình Nginx Reverse Proxy
Tham khảo file `nginx.conf.example` để cấu hình ভhost Nginx trỏ về cổng chạy ứng dụng (mặc định `http://127.0.0.1:6688`) và cấp quyền ghi cho thư mục `uploads_data/` và `public/uploads/`.
