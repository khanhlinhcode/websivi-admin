# Farta Market Admin

Ứng dụng quản trị React 19/Vite tách riêng khỏi Storefront, sử dụng chung Laravel
API và database. Bundle khách hàng không chứa route, màn hình đăng nhập hoặc API
quản trị.

## Trạng thái hiện tại

Các thay đổi đã review được merge vào `main` ngày 24/09/2026. Domain hiện được
vận hành như staging/demo:

- Admin: <https://admin.fartamarket.company>
- Storefront: <https://fartamarket.company>
- API health: <https://api.fartamarket.company/up>

Cloudflare Pages hiển thị deployment là `Production` vì Direct Upload sử dụng
alias `main`. Đây chỉ là nhãn của nhà cung cấp, không phải kết luận hệ thống đã
sẵn sàng production.

## Chức năng

- Đăng nhập riêng cho `admin` và `staff`; mọi tài khoản truy cập portal đều phải
  xác minh email và hoàn tất MFA.
- MFA TOTP, mã khôi phục dùng một lần, chống dùng lại cùng mã và giới hạn số lần
  thử.
- Dashboard, doanh thu, top sản phẩm, analytics và trạng thái queue.
- CRUD sản phẩm, danh mục, ảnh Cloudinary, banner và nội dung CMS song ngữ.
- Thư viện “Tất cả ảnh” tổng hợp ảnh sản phẩm, danh mục và banner để tìm kiếm,
  xem nơi đang sử dụng và chọn lại ảnh đã tải lên mà không upload bản trùng.
- Quản lý đơn hàng, người dùng, đánh giá và coupon.
- Lọc đơn theo COD, SePay và trạng thái thanh toán. VNPay chỉ còn hiển thị/lọc
  các đơn lịch sử; Storefront không tạo giao dịch VNPay mới.
- Phân quyền server-side: `staff` có quyền vận hành giới hạn; các thao tác xóa và
  quản lý người dùng nhạy cảm chỉ dành cho `admin` theo API hiện có.
- Giao diện responsive, VI/EN, modal có hỗ trợ bàn phím, unit tests và Playwright
  E2E.

## Chạy local

Cần Node.js 22.12 trở lên, PHP và database của Backend.

Backend:

```bash
cd /absolute/path/to/SVC01072023BE
php artisan serve --host=127.0.0.1 --port=8000
```

Admin:

```bash
cd /absolute/path/to/websivi-admin
npm ci
cp .env.example .env.local
npm run dev
```

Storefront khi cần kiểm thử tích hợp:

```bash
cd /absolute/path/to/websivi
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mở <http://127.0.0.1:5174>. Dùng `127.0.0.1` nhất quán cho cả ba ứng dụng khi
kiểm tra Sanctum cookie; không trộn với `localhost`.

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
VITE_STOREFRONT_URL=http://127.0.0.1:5173
```

Không đưa mật khẩu, MFA secret, recovery code, database, Cloudinary, payment hay
mail secret vào Git hoặc biến `VITE_*`.

## Tài khoản và MFA

Admin không có chức năng tự đăng ký từ trình duyệt. Tái sử dụng tài khoản có role
`admin` hoặc `staff` trong bảng `users`. Sau khi mật khẩu đúng:

1. Tài khoản chưa đăng ký MFA nhận khóa thiết lập và phải nhập mã TOTP 6 số.
2. Hệ thống hiển thị bộ recovery code đúng một lần sau khi xác nhận.
3. Các lần đăng nhập tiếp theo yêu cầu TOTP hoặc một recovery code chưa dùng.

Chuỗi dạng `ABCDE-12345` là recovery code, không phải mã Authenticator 6 số.
Mỗi recovery code chỉ dùng được một lần. Bật ngày giờ tự động trên thiết bị chạy
Authenticator để tránh sai lệch TOTP.

Tài khoản local/QA chỉ được seed khi Backend chạy trong môi trường `local` hoặc
`testing` với `SEED_ADMIN_ENABLED=true`. Staging dùng credential riêng được lưu
ngoài repository; không sao chép credential đó vào README, issue hoặc chat.

## Sản phẩm và Cloudinary

- Tạo hoặc sửa sản phẩm, sau đó tải ảnh vào thư viện của sản phẩm.
- Hỗ trợ JPG/JPEG, PNG, WEBP, GIF và AVIF, tối đa 2 MB mỗi ảnh, kích thước tối
  đa 6000 × 6000 px và tối đa 8 ảnh cho mỗi sản phẩm.
- Mục `Tất cả ảnh` chỉ hiển thị media nghiệp vụ của sản phẩm, danh mục và banner;
  avatar người dùng không được đưa vào thư viện dùng chung.
- Khi sửa sản phẩm, danh mục hoặc banner, có thể chọn ảnh sẵn có từ thư viện.
  API nhận định danh bản ghi nguồn thay vì cho trình duyệt gửi URL hoặc
  `public_id` Cloudinary tùy ý.
- Thay ảnh đại diện không tự xóa ảnh cũ; ảnh cũ vẫn có thể quản lý riêng.
- Xóa ảnh đại diện sẽ chọn ảnh tiếp theo nếu còn; xóa hết sẽ hiển thị ảnh trống.
- Xóa một nơi sử dụng không xóa tài nguyên Cloudinary nếu ảnh đó còn được dùng ở
  nơi khác.
- Laravel ký request Cloudinary. Trình duyệt không nhận API secret và không được
  tự gửi `public_id` tùy ý.
- Nếu Cloudinary lỗi, API trả lỗi và không âm thầm chuyển sang lưu file local.

## Kiểm tra

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Hiện chưa có script `lint` hoặc `typecheck` trong `package.json`; không báo cáo
hai kiểm tra đó là đã chạy nếu chưa bổ sung script.

E2E khởi động Backend, Storefront, Admin và Cloudinary giả lập trên các cổng cách
ly; dùng SQLite trong thư mục tạm và tài khoản `qa.*@example.test`. Suite không
dùng database staging hoặc tài khoản Cloudinary thật. Có thể đặt `BACKEND_DIR`
và `STOREFRONT_DIR` nếu các repo nằm ở vị trí khác.

Backend regression liên quan Admin:

```bash
php artisan test --filter='AdminMediaLibraryTest|AdminProductImagesTest|AuthTest|ProductApiTest|AdminTest'
```

## Cloudflare Pages deployment

Admin dùng Cloudflare Pages Direct Upload. Merge hoặc push Git không tự động
deploy.

```bash
VITE_API_URL=/api \
VITE_STOREFRONT_URL=https://fartamarket.company \
npm run build

npx wrangler pages deploy build \
  --project-name=farta-admin \
  --branch=main
```

Pages runtime phải có `API_ORIGIN` là HTTPS origin đầy đủ của Backend, không có
hậu tố `/api`. Worker chỉ proxy `/api/*` và `/sanctum/csrf-cookie`, từ chối
request trình duyệt khác origin và trả `503` nếu upstream không hợp lệ.

## Điều kiện còn lại trước production

1. Hoàn tất cấu hình SePay Test Mode và giao dịch mô phỏng end-to-end.
2. Đăng nhập Admin bằng MFA thật trên domain, đồng thời thử một recovery code
   dùng một lần.
3. Kiểm tra tạo, thay và xóa ảnh Cloudinary; xóa dữ liệu QA sau khi hoàn tất.
4. Rà soát phân quyền `admin`/`staff`, bộ lọc đơn SePay và dữ liệu VNPay lịch sử.
5. Build lại từ revision `main` đã review, chạy CI và triển khai có rollback.
