import { test, expect, Page } from "@playwright/test";
import path from "node:path";
const api = "http://127.0.0.1:" + (process.env.E2E_BACKEND_PORT || "8003") + "/api";
const store = "http://127.0.0.1:" + (process.env.E2E_STOREFRONT_PORT || "5177");
const password = "SiviE2EPass123!";
let adminLoginSequence = 0;
async function login(page: Page, role = "admin") {
  await page.goto("/dang-nhap");
  const account = role === "admin" ? `admin-${++adminLoginSequence}` : role;
  await page.getByLabel("Email").fill(`qa.${account}@example.test`);
  await page.locator('[name="password"]').fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/san-pham$/);
  await expect(page.locator("tbody").getByRole("button", { name: "Sửa", exact: true }).first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
const apiGet = (page: Page, url: string) => page.request.get(url, { headers: { Accept: "application/json", Referer: page.url() } });
async function mutate(page: Page, url: string, method: string) {
  return page.evaluate(async ({ url, method }) => {
    const token = document.cookie.split("; ").find(s => s.startsWith("XSRF-TOKEN="))?.split("=").slice(1).join("=") || "";
    const r = await fetch(url, { method, credentials: "include", headers: { Accept: "application/json", "X-XSRF-TOKEN": decodeURIComponent(token) } });
    return r.status;
  }, { url, method });
}

test("admin is separate from the storefront and customer roles are rejected", async ({ page }) => {
  await page.goto(store + "/dang-nhap");
  await expect(page.getByRole("link", { name: /quản trị|admin/i })).toHaveCount(0);
  await page.goto(store + "/quan-tri/dang-nhap");
  await expect(page).toHaveURL(store + "/");
  await page.goto("/san-pham");
  await expect(page).toHaveURL(/\/dang-nhap\?redirect=/);
  await page.getByLabel("Email").fill("qa.customer@example.test");
  await page.locator('[name="password"]').fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect((await apiGet(page, api + "/admin/products")).status()).toBe(401);
});

test("admin password visibility, cookie session reload and real logout", async ({ page }) => {
  await login(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Quản lý sản phẩm", exact: true })).toBeVisible();
  const response = page.waitForResponse(r => r.url() === api + "/admin/logout" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  expect((await response).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/dang-nhap/);
  await page.reload();
  await page.locator('[name="password"]').fill(password);
  await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
  await expect(page.locator('[name="password"]')).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ẩn mật khẩu" }).click();
  await expect(page.locator('[name="password"]')).toHaveAttribute("type", "password");
  expect((await apiGet(page, api + "/admin/me")).status()).toBe(401);
});

test("staff can manage images but has no user management or product delete control", async ({ page }) => {
  await login(page, "staff");
  await expect(page.locator("nav").getByRole("link", { name: "Người dùng" })).toHaveCount(0);
  await expect(page.locator("tbody").getByRole("button", { name: "Xoá", exact: true })).toHaveCount(0);
  await page.locator("tbody").getByRole("button", { name: "Sửa", exact: true }).first().click();
  await expect(page.getByLabel("Chọn ảnh", { exact: true })).toBeEnabled();
  expect(await mutate(page, api + "/admin/products/1", "DELETE")).toBe(403);
  await page.goto("/nguoi-dung");
  await expect(page.getByRole("alert")).toContainText("không có quyền");
});

test("product CRUD and image add, cover replace, delete persist and render on the storefront", async ({ page, browser }) => {
  await login(page);
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  const name = "Ảnh QA " + Date.now();
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="price"]').fill("45000");
  await page.locator('input[name="inventory"]').fill("10");
  await page.locator('textarea[name="sort_description"]').fill("Sản phẩm kiểm tra ảnh quản trị");
  await page.locator('textarea[name="description"]').fill("Nội dung kiểm tra ảnh quản trị");
  const created = page.waitForResponse(r => r.url() === api + "/admin/products" && r.request().method() === "POST");
  await page.locator(".admin-products__editor form").getByRole("button", { name: "Tạo sản phẩm", exact: true }).click();
  const createResponse = await created;
  expect(createResponse.status()).toBe(201);
  const product = await createResponse.json();
  const customer = await browser.newContext();
  const shop = await customer.newPage();
  try {
    const picker = page.getByLabel("Chọn ảnh", { exact: true });
    const fixture = (n: number) => path.resolve(`src/assets/users/images/featured/feature-${n}.png`);
    await picker.setInputFiles([fixture(1), fixture(2)]);
    const added = page.waitForResponse(r => r.url() === `${api}/admin/products/${product.id}/images`);
    await page.getByRole("button", { name: "Tải ảnh lên", exact: true }).click();
    const uploaded = await added;
    expect(uploaded.status()).toBe(201);
    const initial = (await uploaded.json()).product;
    await expect(page.locator(".image-upload__gallery li")).toHaveCount(2);
    const madePrimary = page.waitForResponse(r => r.url().endsWith(`/product-images/${initial.images[1].id}/primary`) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: "Đặt làm ảnh chính", exact: true }).click();
    expect((await madePrimary).ok()).toBeTruthy();
    const reordered = page.waitForResponse(r => r.url().endsWith(`/products/${product.id}/images/order`) && r.request().method() === "PATCH");
    await page.getByRole("button", { name: "Xuống 1", exact: true }).click();
    expect((await reordered).ok()).toBeTruthy();
    await shop.goto(`${store}/san-pham/chi-tiet/${product.id}`);
    await expect(shop.locator(".product__detail__pic-main img").first()).toHaveAttribute("src", initial.images[1].url);
    expect((await shop.request.get(initial.images[1].url)).status()).toBe(200);

    await page.getByLabel("Thay ảnh đại diện", { exact: true }).check();
    await picker.setInputFiles(fixture(3));
    const replaced = page.waitForResponse(r => r.url() === `${api}/admin/products/${product.id}/image`);
    await page.getByRole("button", { name: "Tải ảnh lên", exact: true }).click();
    const replacement = (await (await replaced).json()).product;
    await shop.reload();
    await expect(shop.locator(".product__detail__pic-main img").first()).toHaveAttribute("src", replacement.img);
    await expect(page.locator(".image-upload__gallery li")).toHaveCount(3);

    for (let remaining = 3; remaining > 0; remaining--) {
      await page.locator(".image-upload__delete").first().click();
      const dialog = page.getByRole("dialog");
      const deleted = page.waitForResponse(r => r.url().includes("/admin/product-images/") && r.request().method() === "DELETE");
      await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
      expect((await deleted).ok()).toBeTruthy();
      await expect(page.locator(".image-upload__gallery li")).toHaveCount(remaining - 1);
    }
    await shop.reload();
    await expect(shop.locator(".product__detail__pic-main img").first()).toHaveAttribute("src", /product-placeholder|^data:image\/svg\+xml/);
    const fresh = await (await apiGet(shop, `${api}/products/${product.id}`)).json();
    expect(fresh.img).toBe(""); expect(fresh.images).toEqual([]);
    const updatedName = name + " đã sửa";
    await page.locator('input[name="name"]').fill(updatedName);
    await page.locator('input[name="price"]').fill("55000");
    await page.locator('input[name="inventory"]').fill("7");
    await page.locator('textarea[name="description"]').fill("Nội dung đã cập nhật từ admin");
    const edited = page.waitForResponse(r => r.url() === `${api}/admin/products/${product.id}` && r.request().method() === "PUT");
    await page.locator(".admin-products__editor form").getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    expect((await edited).ok()).toBeTruthy();
    await shop.goto(`${store}/san-pham/chi-tiet/${product.id}`);
    await expect(shop.getByRole("heading", { name: updatedName })).toBeVisible();
    await expect(shop.getByText("Nội dung đã cập nhật từ admin")).toBeVisible();
    const publicProduct = await (await apiGet(shop, `${api}/products/${product.id}`)).json();
    expect(Number(publicProduct.price)).toBe(55000);
    expect(publicProduct.inventory).toBe(7);
    const row = page.locator("tbody tr").filter({ hasText: updatedName });
    await row.getByRole("button", { name: "Xoá", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    await expect(row).toHaveCount(0);
    expect((await apiGet(shop, `${api}/products/${product.id}`)).status()).toBe(404);
  } finally {
    // Clean only records and files created by this test, including after a failed assertion.
    const r = await apiGet(page, `${api}/admin/products/${product.id}`);
    if (r.ok()) {
      for (const image of (await r.json()).images || []) await mutate(page, `${api}/admin/product-images/${image.id}`, "DELETE");
      await mutate(page, `${api}/admin/products/${product.id}`, "DELETE");
    }
    await customer.close();
  }
});

test("invalid image selection reports an error without uploading", async ({ page }) => {
  await login(page);
  await page.locator("tbody").getByRole("button", { name: "Sửa", exact: true }).first().click();
  await page.getByLabel("Chọn ảnh", { exact: true }).setInputFiles({ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg onload="alert(1)"/>') });
  await expect(page.locator(".image-upload [role=alert]")).toContainText("không quá 2 MB");
  await expect(page.locator(".image-upload").getByRole("button", { name: "Tải ảnh lên", exact: true })).toBeDisabled();
});

test("existing management pages load after extraction", async ({ page }) => {
  await login(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [route, endpoint] of [["/danh-muc", "/admin/categories"], ["/don-hang", "/admin/orders"], ["/dashboard", "/admin/dashboard"], ["/ma-giam-gia", "/admin/coupons"], ["/nguoi-dung", "/admin/users"]]) {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === "/api" + endpoint);
    await page.goto(route);
    expect((await response).ok()).toBeTruthy();
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("banner dialog supports keyboard focus and restores the trigger", async ({ page }) => {
  await login(page);
  await page.goto("/banner");
  const trigger = page.getByRole("button", { name: "Thêm banner", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Thêm banner" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("CMS content and privacy-safe analytics flow from admin to storefront", async ({ page, browser }) => {
  await login(page);
  const suffix = Date.now();
  const categoryName = `Danh mục CMS ${suffix}`;
  const productName = `Sản phẩm CMS ${suffix}`;
  const bannerAlt = `Banner CMS ${suffix}`;
  const heroAlt = `Hero CMS ${suffix}`;
  const heroTitle = `Mua sắm tươi ngon ${suffix}`;
  const brandName = `Farta CMS ${suffix}`;
  const contactPhone = "0987654321";
  const footerDescription = `Nội dung chân trang ${suffix}`;
  const fixture = path.resolve("src/assets/users/images/featured/feature-1.png");
  let categoryId: number | null = null;
  let productId: number | null = null;
  let bannerId: number | null = null;
  let heroId: number | null = null;
  const customer = await browser.newContext();
  const shop = await customer.newPage();

  try {
    await page.goto("/danh-muc");
    await page.getByLabel("Tên danh mục", { exact: true }).fill(categoryName);
    await page.getByLabel("Mô tả", { exact: true }).fill("Danh mục kiểm thử CMS");
    await page.getByLabel("Ảnh danh mục", { exact: true }).setInputFiles(fixture);
    const categoryCreated = page.waitForResponse(r => r.url() === `${api}/admin/categories` && r.request().method() === "POST");
    const categoryImage = page.waitForResponse(r => /\/admin\/categories\/\d+\/image$/.test(r.url()) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Tạo danh mục", exact: true }).click();
    categoryId = (await (await categoryCreated).json()).id;
    expect((await categoryImage).ok()).toBeTruthy();

    await page.goto("/san-pham");
    await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
    const editor = page.locator(".admin-products__editor form");
    await editor.locator('input[name="name"]').fill(productName);
    await editor.locator('select[name="category_id"]').selectOption(String(categoryId));
    await editor.locator('input[name="price"]').fill("45000");
    await editor.locator('input[name="inventory"]').fill("5");
    await editor.locator('textarea[name="sort_description"]').fill("Mô tả ngắn CMS");
    await editor.locator('textarea[name="description"]').fill("Mô tả chi tiết CMS");
    const productCreated = page.waitForResponse(r => r.url() === `${api}/admin/products` && r.request().method() === "POST");
    await editor.getByRole("button", { name: "Tạo sản phẩm", exact: true }).click();
    productId = (await (await productCreated).json()).id;

    await page.goto("/banner");
    await page.getByRole("button", { name: "Thêm banner", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Vị trí").selectOption("home_promo");
    await dialog.getByLabel("Alt ảnh tiếng Việt").fill(bannerAlt);
    await dialog.getByLabel("Alt ảnh tiếng Anh").fill(bannerAlt);
    await dialog.getByLabel("Liên kết").fill(`/san-pham/chi-tiet/${productId}`);
    await dialog.getByLabel("Bắt đầu").fill("2026-09-01T00:00");
    await dialog.getByLabel("Kết thúc").fill("2026-09-30T23:59");
    await dialog.getByLabel("Ảnh banner").setInputFiles(fixture);
    const bannerCreated = page.waitForResponse(r => r.url() === `${api}/admin/banners` && r.request().method() === "POST");
    await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
    bannerId = (await (await bannerCreated).json()).id;

    await page.getByRole("button", { name: "Thêm banner", exact: true }).click();
    const heroDialog = page.getByRole("dialog");
    await heroDialog.getByLabel("Vị trí").selectOption("hero");
    await heroDialog.getByLabel("Tiêu đề tiếng Việt").fill(heroTitle);
    await heroDialog.getByLabel("Tiêu đề tiếng Anh").fill(heroTitle);
    await heroDialog.getByLabel("Nhãn nút tiếng Việt").fill("Xem sản phẩm");
    await heroDialog.getByLabel("Nhãn nút tiếng Anh").fill("View products");
    await heroDialog.getByLabel("Alt ảnh tiếng Việt").fill(heroAlt);
    await heroDialog.getByLabel("Alt ảnh tiếng Anh").fill(heroAlt);
    await heroDialog.getByLabel("Liên kết").fill(`/san-pham/chi-tiet/${productId}`);
    await heroDialog.getByLabel("Ảnh banner").setInputFiles(fixture);
    const heroCreated = page.waitForResponse(r => r.url() === `${api}/admin/banners` && r.request().method() === "POST");
    await heroDialog.getByRole("button", { name: "Lưu", exact: true }).click();
    heroId = (await (await heroCreated).json()).id;

    await page.goto("/noi-dung-web");
    await page.locator('input[name="brand_name"]').fill(brandName);
    await page.locator('input[name="contact_phone"]').fill(contactPhone);
    await page.locator('textarea[name="footer_description_vi"]').fill(footerDescription);
    const settingsUpdated = page.waitForResponse(r => r.url() === `${api}/admin/site-settings` && r.request().method() === "PUT");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    expect((await settingsUpdated).ok()).toBeTruthy();

    const tracked = shop.waitForResponse(r => r.url() === `${api}/analytics/page-view` && r.request().method() === "POST" && r.status() === 204);
    await shop.goto(store + "/");
    expect((await tracked).status()).toBe(204);
    await expect(shop.getByRole("heading", { name: brandName }).last()).toBeVisible();
    await expect(shop.getByRole("link", { name: categoryName }).last()).toBeVisible();
    await expect(shop.getByRole("img", { name: bannerAlt })).toBeVisible();
    await expect(shop.getByRole("img", { name: heroAlt })).toBeVisible();
    await expect(shop.getByRole("heading", { name: heroTitle }).last()).toBeVisible();
    await expect(shop.getByRole("link", { name: contactPhone }).last()).toBeVisible();
    await expect(shop.getByText(footerDescription).last()).toBeVisible();
    await expect(shop.getByText(productName).first()).toBeVisible();

    await page.goto("/phan-tich");
    await expect(page.getByRole("heading", { name: "Phân tích truy cập" })).toBeVisible();
    await expect(page.getByText("Lượt xem trang")).toBeVisible();

    await page.goto("/banner");
    const bannerRow = page.locator("tbody tr").filter({ hasText: bannerAlt });
    await bannerRow.getByRole("button", { name: "Sửa", exact: true }).click();
    const editDialog = page.getByRole("dialog");
    await editDialog.getByLabel("Hiển thị").uncheck();
    const bannerUpdated = page.waitForResponse(r => r.url() === `${api}/admin/banners/${bannerId}` && r.request().method() === "POST");
    await editDialog.getByRole("button", { name: "Lưu", exact: true }).click();
    expect((await bannerUpdated).ok()).toBeTruthy();
    await shop.reload();
    await expect(shop.getByRole("img", { name: bannerAlt })).toHaveCount(0);
  } finally {
    if (bannerId) await mutate(page, `${api}/admin/banners/${bannerId}`, "DELETE");
    if (heroId) await mutate(page, `${api}/admin/banners/${heroId}`, "DELETE");
    if (productId) await mutate(page, `${api}/admin/products/${productId}`, "DELETE");
    if (categoryId) await mutate(page, `${api}/admin/categories/${categoryId}`, "DELETE");
    await customer.close();
  }
});

test("customer order, admin status flow and review moderation stay consistent", async ({ page, browser }) => {
  await login(page);
  const customer = await browser.newContext();
  const shop = await customer.newPage();
  const apiRoot = api.replace(/\/api$/, "");
  const comment = `Đánh giá E2E ${Date.now()}`;

  try {
    await page.goto("/noi-dung-web");
    await page.locator('input[name="free_shipping_threshold"]').fill("99999999");
    await page.locator('input[name="shipping_fee"]').fill("33000");
    const settingsUpdated = page.waitForResponse(r => r.url() === `${api}/admin/site-settings` && r.request().method() === "PUT");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    expect((await settingsUpdated).ok()).toBeTruthy();

    const tracked = shop.waitForResponse(r => r.url() === `${api}/analytics/page-view` && r.request().method() === "POST" && r.status() === 204);
    await shop.goto(store + "/");
    await tracked;
    const created = await shop.evaluate(async ({ api, apiRoot, password }) => {
      const csrf = async () => {
        await fetch(`${apiRoot}/sanctum/csrf-cookie`, { credentials: "include" });
        return decodeURIComponent(document.cookie.split("; ").find(row => row.startsWith("XSRF-TOKEN="))?.split("=").slice(1).join("=") || "");
      };
      let token = await csrf();
      const loginResponse = await fetch(`${api}/login`, {
        method: "POST", credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ email: "qa.customer@example.test", password }),
      });
      token = await csrf();
      const orderResponse = await fetch(`${api}/order`, {
        method: "POST", credentials: "include",
        headers: {
          Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token,
          "X-Idempotency-Key": `e2e-order-${Date.now()}-customer`,
        },
        body: JSON.stringify({
          customer_name: "QA Customer", customer_phone: "0901234567",
          address: "123 Đường kiểm thử, Thành phố Hồ Chí Minh",
          email: "qa.customer@example.test", products: [{ product_id: 1, quantity: 1 }],
        }),
      });
      return { loginStatus: loginResponse.status, orderStatus: orderResponse.status, body: await orderResponse.json() };
    }, { api, apiRoot, password });
    expect(created.loginStatus).toBe(200);
    expect(created.orderStatus).toBe(201);
    expect(Number(created.body.data.shipping_fee)).toBe(33000);
    const orderId = created.body.data.id;

    await page.goto("/don-hang");
    await page.getByLabel("Tìm theo tên, số điện thoại, email").fill(String(orderId));
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    for (const nextStatus of ["confirmed", "processing", "shipped", "delivered"]) {
      const row = page.locator("tbody tr").filter({
        has: page.getByRole("cell", { name: `#${orderId}`, exact: true }),
      });
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "Chi tiết", exact: true }).click();
      await expect(row.locator(".admin-page__status-panel select")).toBeVisible();
      await row.locator(".admin-page__status-panel select").selectOption(nextStatus);
      const updated = page.waitForResponse(r => r.url() === `${api}/admin/orders/${orderId}/status` && r.request().method() === "PATCH");
      const reloaded = page.waitForResponse(r => new URL(r.url()).pathname === "/api/admin/orders" && r.request().method() === "GET");
      await row.getByRole("button", { name: "Cập nhật trạng thái", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
      expect((await updated).ok()).toBeTruthy();
      expect((await reloaded).ok()).toBeTruthy();
      await expect(row.locator(`.admin-page__status.is-${nextStatus}`)).toBeVisible();
    }

    const customerResult = await shop.evaluate(async ({ api, comment, orderId }) => {
      const token = decodeURIComponent(document.cookie.split("; ").find(row => row.startsWith("XSRF-TOKEN="))?.split("=").slice(1).join("=") || "");
      const orders = await fetch(`${api}/my-orders`, { credentials: "include", headers: { Accept: "application/json" } });
      const review = await fetch(`${api}/products/1/reviews`, {
        method: "POST", credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ rating: 5, comment }),
      });
      const orderBody = await orders.json();
      return {
        customerStatus: orderBody.data.find(order => order.id === orderId)?.status,
        reviewStatus: review.status,
        review: await review.json(),
      };
    }, { api, comment, orderId });
    expect(customerResult.customerStatus).toBe("delivered");
    expect(customerResult.reviewStatus).toBe(201);
    const reviewId = customerResult.review.data.id;

    await page.goto("/danh-gia");
    await page.getByLabel("Tìm kiếm").fill(comment);
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    const reviewRow = page.locator("tbody tr").filter({ hasText: comment });
    const hidden = page.waitForResponse(r => r.url() === `${api}/admin/reviews/${reviewId}/visibility` && r.request().method() === "PATCH");
    await reviewRow.getByRole("button", { name: "Ẩn", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
    expect((await hidden).ok()).toBeTruthy();

    const publicReviews = await (await shop.request.get(`${api}/products/1/reviews`)).json();
    expect(publicReviews.data.some(review => review.id === reviewId)).toBe(false);
  } finally {
    await customer.close();
  }
});

for (const width of [1440, 1024, 768, 320]) {
  test(`admin product page and editor fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await login(page);
    await expect(page.getByRole("heading", { name: "Quản lý sản phẩm", exact: true })).toBeVisible();
    await page.screenshot({ path: `.impeccable/review/${width === 1440 ? "desktop" : "mobile"}.png`, fullPage: true });
    await page.locator("tbody").getByRole("button", { name: "Sửa", exact: true }).first().click();
    await expect(page.locator(".image-upload")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.impeccable/review/editor-${width}.png`, fullPage: true });
    for (const route of ["/danh-muc", "/banner", "/noi-dung-web", "/don-hang", "/danh-gia", "/phan-tich"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}
