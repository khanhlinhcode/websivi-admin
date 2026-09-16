# Farta Admin

Ứng dụng React/Vite quản trị riêng, sử dụng **Laravel API và database hiện có**. Web khách hàng nằm trong `../websivi`; không còn route, màn hình đăng nhập hay mã API quản trị trong bundle khách hàng.

## Chạy local

Cần Node >= 22.12, PHP và MySQL của backend đang hoạt động. Mở các terminal riêng:

**Backend Laravel**

```bash
cd /Users/linhto/Documents/Programming/sivicode/SVC01072023BE/SVC01072023BE
php artisan serve --host=127.0.0.1 --port=8000
```

**Admin**

```bash
cd /Users/linhto/Documents/Programming/sivicode/websivi-admin
npm ci
cp .env.example .env.local
npm run dev
```

Mở **http://127.0.0.1:5174**. Chỉ tài khoản `admin` hoặc `staff` đăng nhập được.

**Web khách hàng**

```bash
cd /Users/linhto/Documents/Programming/sivicode/websivi
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mở **http://127.0.0.1:5173**. Dùng cùng hostname `127.0.0.1` cho cả ba ứng dụng; không trộn với `localhost` khi kiểm tra cookie.

Nếu cổng 8000 đang được ứng dụng khác sử dụng, chạy Laravel với `--port=8002`, đặt `VITE_API_URL=http://127.0.0.1:8002/api` trong `.env.local` của **cả hai frontend**, cập nhật `APP_URL` của Laravel và khởi động lại. Không dừng tiến trình không thuộc dự án.

## Tài khoản quản trị

Tái sử dụng tài khoản có role `admin`/`staff` trong bảng `users`. Không có mật khẩu mặc định và không có chức năng tự đăng ký admin từ trình duyệt.

Nếu local chưa có tài khoản admin, chủ dự án có thể tạo qua terminal Laravel. Không chạy seed lại dữ liệu sản phẩm chỉ để tạo tài khoản:

```bash
php artisan tinker
```

Dán nguyên khối sau vào Tinker (email phải là email mới, mật khẩu nhập ẩn; closure tránh in mật khẩu ra kết quả Tinker):

```php
(function () {
    $email = \Laravel\Prompts\text('Email admin mới', required: true);
    throw_if(!filter_var($email, FILTER_VALIDATE_EMAIL), \InvalidArgumentException::class, 'Email không hợp lệ');
    throw_if(\App\Models\User::where('email', $email)->exists(), \InvalidArgumentException::class, 'Email đã tồn tại');
    $password = \Laravel\Prompts\password('Mật khẩu admin', required: true, validate: fn ($value) => strlen($value) < 12 ? 'Cần ít nhất 12 ký tự' : null);
    \App\Models\User::create(['name' => 'Quản trị cửa hàng', 'email' => $email, 'password' => $password, 'role' => 'admin']);
})();
```

Laravel model hiện có tự hash mật khẩu. Không đưa mật khẩu vào code, Git hay `VITE_*`.

## Quản lý sản phẩm và ảnh

- Sau đăng nhập, mở ngay danh sách sản phẩm có phân trang. Các màn hình danh mục, đơn hàng, dashboard, mã giảm giá và người dùng được chuyển từ admin cũ để giữ chức năng hiện có.
- Chọn **Thêm sản phẩm**, nhập thông tin và lưu. Form tiếp tục mở để tải ảnh cho sản phẩm vừa tạo.
- Chọn **Sửa** ở sản phẩm để cập nhật thông tin, thêm ảnh vào thư viện, hoặc **Thay ảnh đại diện**. Ảnh đại diện cũ vẫn nằm trong thư viện và có thể xóa riêng.
- JPG/PNG/WEBP, tối đa 2 MB/ảnh, 8 ảnh/lần tải. Frontend có xem trước và kiểm tra file; Laravel tiếp tục kiểm tra file và quyền ở server.
- **Xóa ảnh** yêu cầu xác nhận. Xóa ảnh đại diện sẽ chọn ảnh kế tiếp; xóa hết ảnh hiển thị ảnh trống, không giữ URL đã xóa.
- **Xem trên cửa hàng** mở trang sản phẩm ở frontend khách hàng. Sản phẩm đang ẩn không có link này. Tab khách hàng đã mở trước đó cần tải lại để nhận ảnh mới; chưa triển khai cập nhật realtime.
- `staff` được thêm/sửa sản phẩm và quản lý ảnh; chỉ `admin` được xóa sản phẩm, xóa danh mục và quản lý người dùng theo API Laravel hiện có.

## Database, Cloudinary và đăng nhập

Không tạo database hoặc backend thứ hai. Backend có migration bổ sung thông tin
Cloudinary cho bảng `product_images`.

| Dữ liệu | Nơi lưu hiện tại |
| --- | --- |
| Sản phẩm, URL ảnh đại diện | Bảng `products`, cột `img` |
| Thư viện ảnh, nhà cung cấp, `public_id`, ảnh đại diện | Bảng `product_images` |
| File ảnh sản phẩm mới | Cloudinary, dưới `farta/products/{product_id}/` |
| URL công khai của ảnh | `secure_url` HTTPS do Cloudinary trả về |
| Tài khoản và role | Bảng `users` |
| Phiên đăng nhập | Sanctum cookie + session backend theo cấu hình Laravel |

Laravel ký và gửi file lên Cloudinary; trình duyệt không nhận API secret và không
được tự gửi `public_id`. Cần khai báo ba biến sau trong `.env` của backend rồi chạy
`php artisan config:clear`:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Nếu thiếu cấu hình hoặc Cloudinary lỗi, API trả 502 và không chuyển sang lưu local.
Các ảnh local đã có từ trước vẫn đọc và xóa được. `php artisan storage:link` vẫn cần
cho ảnh local cũ và các loại file khác như avatar. Web khách hàng đọc URL ảnh từ
Laravel, không cần build lại khi tải ảnh mới.

Hai frontend có build, địa chỉ và Redux state riêng, nhưng hiện vẫn dùng **cùng phiên cookie Laravel** trong cùng browser profile. Đăng nhập tài khoản khác hoặc đăng xuất có thể thay thế/kết thúc phiên dùng chung. Dùng hai browser profile hoặc cửa sổ ẩn danh để thử đồng thời admin và khách hàng. Việc tách giao diện không thay thế kiểm tra quyền server.

## Kiểm tra

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E mặc định chạy admin 5176, khách hàng 5177, backend 8003 và Cloudinary giả lập
ở 8004; tạo SQLite riêng trong thư mục tạm `sivi-e2e-*`, kiểm tra đích DB trước
migrate/seed. Không dùng DB local `svc01072023be` hay tài khoản Cloudinary thật.
Cần dependencies của cả backend và `websivi` đã cài. Có thể đặt
`BACKEND_DIR`/`STOREFRONT_DIR` nếu thư mục nằm nơi khác. Tài khoản
`qa.*@example.test` chỉ được seed trong DB E2E đã kiểm tra cách ly.

Backend regression:

```bash
php artisan test --filter='AdminProductImagesTest|AuthTest|ProductApiTest|AdminTest'
```

## Cấu hình khi deploy

Build `npm run build`, publish thư mục `build/`, cấu hình SPA fallback về `index.html`. Dùng `.env.production.example` để trỏ đúng URL API/cửa hàng **trước khi build**.

Với Sanctum cookie hiện tại, bố trí các subdomain cùng site, ví dụ `admin.example.com`, `shop.example.com`, `api.example.com`, qua HTTPS. Laravel cần:

- `CORS_ALLOWED_ORIGINS`: đúng hai origin frontend, không dùng wildcard với cookie.
- `SANCTUM_STATEFUL_DOMAINS`: hostname admin và khách hàng; local phải kèm port.
- `SESSION_DOMAIN=.example.com`, `SESSION_SECURE_COOKIE=true`, `APP_URL=https://api.example.com`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: chỉ đặt ở backend.
- Backup MySQL và kiểm soát quota Cloudinary. Không đưa Cloudinary secret vào biến `VITE_*`.

Ảnh sản phẩm mới không phụ thuộc filesystem của host nên vẫn tồn tại qua redeploy.
Hai frontend hiện vẫn dùng chung phiên cookie Laravel trong cùng browser profile.
