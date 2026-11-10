require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

const base = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3000/api';
const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const testEmail = `codex-smoke-${suffix}@example.invalid`;
const categoryName = `Codex Smoke ${suffix}`;
const productName = `Codex Smoke Product ${suffix}`;
let userId, customerToken, adminToken, categoryId, productId, orderId;
let passed = 0;

async function call(method, path, { token, body, expected = 200 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, got ${response.status}; ${text.slice(0, 250)}`);
  passed++;
  console.log(`PASS ${method} ${path} -> ${response.status}`);
  return data;
}

async function cleanup() {
  if (userId) {
    await Promise.all([
      Cart.deleteMany({ user: userId }),
      Order.deleteMany({ user: userId }),
      User.deleteOne({ _id: userId })
    ]);
  }
  if (productId) await Product.deleteOne({ _id: productId });
  if (categoryId) await Category.deleteOne({ _id: categoryId });
}

async function run() {
  let data = await call('GET', '/health');
  assert.equal(data.database, 'connected', 'Health endpoint reports DB disconnected');
  await call('GET', '/cart', { expected: 401 });
  await call('GET', '/admin/dashboard', { expected: 401 });

  data = await call('POST', '/auth/register', { expected: 201, body: { name: 'Codex API Smoke', email: testEmail, password: 'SmokePass123!' } });
  userId = data.user.id; customerToken = data.token;
  await call('POST', '/auth/register', { expected: 409, body: { name: 'Duplicate', email: testEmail, password: 'SmokePass123!' } });
  await call('POST', '/auth/login', { expected: 401, body: { email: testEmail, password: 'wrong-password' } });
  data = await call('POST', '/auth/login', { expected: 200, body: { email: testEmail, password: 'SmokePass123!' } }); customerToken = data.token;
  await call('GET', '/auth/me', { token: customerToken });
  await call('PATCH', '/users/me', { token: customerToken, body: { name: 'Codex API Smoke Updated', phone: '0900000000', address: 'Test address' } });
  await call('PATCH', '/users/me/password', { token: customerToken, body: { currentPassword: 'SmokePass123!', newPassword: 'SmokePass456!' } });
  data = await call('POST', '/auth/login', { expected: 200, body: { email: testEmail, password: 'SmokePass456!' } }); customerToken = data.token;

  const webBase = base.replace(/\/api\/?$/, '');
  const webLogin = await fetch(`${webBase}/login`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: testEmail, password: 'SmokePass456!' })
  });
  assert.equal(webLogin.status, 302, `POST /login expected 302, got ${webLogin.status}`);
  const setCookies = webLogin.headers.getSetCookie?.() || [webLogin.headers.get('set-cookie')].filter(Boolean);
  const cookie = setCookies.map((value) => value.split(';')[0]).join('; ');
  assert.ok(cookie.includes('fashion.sid='), 'Website login did not set the session cookie');
  passed++;
  console.log('PASS POST /login (EJS session) -> 302');
  const invalidCart = await fetch(`${webBase}/cart/add`, {
    method: 'POST', redirect: 'manual',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', Referer: `${webBase}/product/test` },
    body: new URLSearchParams({ productId: 'invalid', quantity: '0' })
  });
  assert.equal(invalidCart.status, 302, `POST /cart/add expected 302, got ${invalidCart.status}`);
  assert.equal(invalidCart.headers.get('location'), '/product/test', 'Same-origin referrer should remain a local path');
  passed++;
  console.log('PASS POST /cart/add invalid data + safe same-origin referrer -> 302');
  const externalReferrer = await fetch(`${webBase}/cart/add`, {
    method: 'POST', redirect: 'manual',
    headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded', Referer: 'https://untrusted.example/redirect' },
    body: new URLSearchParams({ productId: 'invalid', quantity: '0' })
  });
  assert.equal(externalReferrer.headers.get('location'), '/shop', 'External referrer should use the local fallback');
  passed++;
  console.log('PASS POST /cart/add external referrer fallback -> /shop');

  await call('GET', '/categories');
  const productList = await call('GET', '/products?page=1&limit=5&sort=newest');
  assert.ok(productList.products, 'Product list response missing products');
  if (productList.products.length) await call('GET', `/products/${productList.products[0]._id}`);
  else await call('GET', '/products/not-an-object-id', { expected: 404 });
  for (const route of ['/', '/shop', `/product/${productList.products[0]._id}`]) {
    const page = await fetch(`${webBase}${route}`, { redirect: 'manual' });
    assert.equal(page.status, 200, `GET ${route} storefront page expected 200, got ${page.status}`);
    passed++;
    console.log(`PASS GET ${route} (storefront page) -> ${page.status}`);
  }
  for (const route of ['/cart', '/checkout']) {
    const page = await fetch(`${webBase}${route}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(page.status, route === '/cart' ? 200 : 302, `GET ${route} expected storefront response, got ${page.status}`);
    passed++;
    console.log(`PASS GET ${route} (customer session) -> ${page.status}`);
  }

  await call('GET', '/cart', { token: customerToken });
  await call('POST', '/cart/items', { token: customerToken, expected: 400, body: { productId: 'invalid', quantity: 1 } });
  await call('GET', '/orders/my', { token: customerToken });
  await call('POST', '/orders', { token: customerToken, expected: 400, body: { name: 'Empty cart', phone: '0900000000', address: 'Test', paymentMethod: 'cod' } });
  await call('GET', '/admin/products', { token: customerToken, expected: 403 });

  data = await call('POST', '/auth/login', { expected: 200, body: { email: 'admin@shop.local', password: 'Demo1234!' } }); adminToken = data.token;
  assert.equal(data.user.role, 'admin', 'Documented admin account does not have admin role');
  const adminWebLogin = await fetch(`${webBase}/login`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'admin@shop.local', password: 'Demo1234!' })
  });
  assert.equal(adminWebLogin.status, 302, `Admin POST /login expected 302, got ${adminWebLogin.status}`);
  assert.equal(adminWebLogin.headers.get('location'), '/admin/dashboard', 'Admin login did not redirect to dashboard');
  const adminCookies = adminWebLogin.headers.getSetCookie?.() || [adminWebLogin.headers.get('set-cookie')].filter(Boolean);
  const adminCookie = adminCookies.map((value) => value.split(';')[0]).join('; ');
  passed++;
  console.log('PASS POST /login (admin session) -> /admin/dashboard');
  for (const route of ['/admin/dashboard', '/admin/products', '/admin/products/create', '/admin/categories', '/admin/orders', '/admin/users']) {
    const page = await fetch(`${webBase}${route}`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
    assert.equal(page.status, 200, `GET ${route} expected 200, got ${page.status}; redirect=${page.headers.get('location')}`);
    passed++;
    console.log(`PASS GET ${route} (admin session) -> ${page.status}`);
  }
  await call('GET', '/admin/dashboard', { token: adminToken });
  await call('GET', '/admin/products', { token: adminToken });
  await call('GET', '/admin/categories', { token: adminToken });
  await call('GET', '/admin/orders', { token: adminToken });
  await call('GET', '/admin/users?q=codex-smoke', { token: adminToken });

  data = await call('POST', '/admin/categories', { token: adminToken, expected: 201, body: { name: categoryName, description: 'Temporary API smoke category' } }); categoryId = data.category._id;
  await call('GET', '/categories');
  await call('PATCH', `/admin/categories/${categoryId}`, { token: adminToken, body: { description: 'Updated smoke category' } });
  data = await call('POST', '/admin/products', { token: adminToken, expected: 201, body: { name: productName, category: categoryId, price: 25000, stock: 10, sizes: ['M'], colors: ['Black'], description: 'Temporary API smoke product' } }); productId = data.product._id;
  const editProductPage = await fetch(`${webBase}/admin/products/edit/${productId}`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
  assert.equal(editProductPage.status, 200, `Admin edit product page expected 200, got ${editProductPage.status}`);
  passed++;
  console.log('PASS GET /admin/products/edit/:id (admin session) -> 200');
  await call('GET', `/products/${productId}`);
  await call('PATCH', `/admin/products/${productId}`, { token: adminToken, body: { price: 26000, description: 'Updated smoke product' } });

  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 1, size: 'M', color: 'Black' } });
  data = await call('GET', '/cart', { token: customerToken });
  const itemId = data.cart.items[0]._id;
  await call('PATCH', `/cart/items/${itemId}`, { token: customerToken, body: { quantity: 2 } });
  await call('DELETE', `/cart/items/${itemId}`, { token: customerToken });
  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 2, size: 'M', color: 'Black' } });
  await call('DELETE', '/cart', { token: customerToken });
  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 2, size: 'M', color: 'Black' } });

  data = await call('POST', '/orders', { token: customerToken, expected: 201, body: { name: 'Codex API Smoke', phone: '0900000000', address: 'Test address', paymentMethod: 'cod' } });
  orderId = data.order._id;
  await call('GET', '/orders/my', { token: customerToken });
  await call('GET', `/orders/my/${orderId}`, { token: customerToken });
  await call('GET', '/admin/orders?status=pending', { token: adminToken });
  await call('GET', `/admin/orders/${orderId}`, { token: adminToken });
  await call('PATCH', `/admin/orders/${orderId}/status`, { token: adminToken, body: { status: 'confirmed' } });
  await call('PATCH', `/admin/orders/${orderId}/status`, { token: adminToken, body: { status: 'cancelled' } });

  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 1, size: 'M', color: 'Black' } });
  data = await call('POST', '/orders', { token: customerToken, expected: 201, body: { name: 'Codex API Smoke', phone: '0900000000', address: 'Test address', paymentMethod: 'payos' } });
  const payosOrderId = data.order._id;
  assert.ok(data.paymentSimulationUrl, 'PayOS order response missing simulation URL');
  const payosPage = await fetch(`${webBase}/payment/payos/${payosOrderId}`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(payosPage.status, 200, `PayOS simulation page expected 200, got ${payosPage.status}`);
  assert.match(await payosPage.text(), /MÔ PHỎNG/);
  passed++;
  console.log('PASS GET /payment/payos/:id (EJS session) -> 200');
  const payosSubmit = await fetch(`${webBase}/payment/payos/${payosOrderId}/simulate-success`, { method: 'POST', headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(payosSubmit.status, 302, `PayOS simulate success expected 302, got ${payosSubmit.status}`);
  assert.equal(payosSubmit.headers.get('location'), `/order-success/${payosOrderId}`);
  passed++;
  console.log('PASS POST /payment/payos/:id/simulate-success (EJS session) -> 302');
  const successPage = await fetch(`${webBase}/order-success/${payosOrderId}`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(successPage.status, 200, `PayOS order success page expected 200, got ${successPage.status}`);
  passed++;
  console.log('PASS GET /order-success/:id (customer session) -> 200');
  data = await call('POST', `/orders/${payosOrderId}/payos/simulate-success`, { token: customerToken });
  assert.equal(data.order.paymentStatus, 'paid');
  assert.ok(data.order.paymentReference.startsWith('SIM-'));
  await call('PATCH', `/admin/orders/${payosOrderId}/status`, { token: adminToken, body: { status: 'cancelled', paymentStatus: 'refunded' } });

  await call('PATCH', `/admin/users/${userId}/status`, { token: adminToken, body: { isActive: false } });
  await call('DELETE', `/admin/products/${productId}`, { token: adminToken });
  await call('DELETE', `/admin/categories/${categoryId}`, { token: adminToken });
  console.log(`\nPASS ${passed} API requests; DB connected; temporary test records will be removed.`);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected (${mongoose.connection.name})`);
    await run();
  } finally {
    try { await cleanup(); } finally { await mongoose.disconnect(); }
  }
})().catch((error) => {
  console.error(`FAIL after ${passed} successful API requests: ${error.message}`);
  process.exitCode = 1;
});
