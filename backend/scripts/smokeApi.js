require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');

const base = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3000/api';
const webBase = base.replace(/\/api\/?$/, '');
const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const email = `codex-smoke-${suffix}@example.invalid`;
const categoryName = `Codex Smoke ${suffix}`;
const productName = `Codex Smoke Product ${suffix}`;
let userId, customerToken, adminToken, categoryId, productId;
let passed = 0;

async function call(method, route, { token, body, expected = 200 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${route}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  assert.equal(response.status, expected, `${method} ${route}: expected ${expected}, got ${response.status}; ${text.slice(0, 250)}`);
  passed += 1;
  console.log(`PASS ${method} ${route} -> ${response.status}`);
  return data;
}

async function checkSpa(routes) {
  for (const route of routes) {
    const response = await fetch(`${webBase}${route}`);
    const html = await response.text();
    assert.equal(response.status, 200, `GET ${route}: expected SPA page 200, got ${response.status}`);
    assert.match(html, /<div id="root"><\/div>/, `GET ${route}: missing React root`);
    passed += 1;
    console.log(`PASS GET ${route} (React SPA) -> 200`);
  }
}

async function cleanup() {
  if (userId) await Promise.all([Cart.deleteMany({ user: userId }), Order.deleteMany({ user: userId }), User.deleteOne({ _id: userId })]);
  if (productId) await Product.deleteOne({ _id: productId });
  if (categoryId) await Category.deleteOne({ _id: categoryId });
}

async function run() {
  let data = await call('GET', '/health');
  assert.equal(data.database, 'connected');
  await call('GET', '/cart', { expected: 401 });
  await call('GET', '/admin/dashboard', { expected: 401 });

  data = await call('POST', '/auth/register', { expected: 201, body: { name: 'Codex API Smoke', email, password: 'SmokePass123!' } });
  userId = data.user.id; customerToken = data.token;
  await call('POST', '/auth/register', { expected: 409, body: { name: 'Duplicate', email, password: 'SmokePass123!' } });
  await call('POST', '/auth/login', { expected: 401, body: { email, password: 'wrong-password' } });
  data = await call('POST', '/auth/login', { body: { email, password: 'SmokePass123!' } }); customerToken = data.token;
  await call('GET', '/auth/me', { token: customerToken });
  await call('PATCH', '/users/me', { token: customerToken, body: { name: 'Codex API Smoke Updated', phone: '0900000000', address: 'Test address' } });
  await call('PATCH', '/users/me/password', { token: customerToken, body: { currentPassword: 'SmokePass123!', newPassword: 'SmokePass456!' } });
  data = await call('POST', '/auth/login', { body: { email, password: 'SmokePass456!' } }); customerToken = data.token;

  await call('GET', '/categories');
  const catalog = await call('GET', '/products?page=1&limit=5&sort=newest');
  assert.ok(catalog.products);
  const sampleId = catalog.products[0]?._id;
  if (sampleId) await call('GET', `/products/${sampleId}`);
  await checkSpa(['/', '/shop', ...(sampleId ? [`/product/${sampleId}`] : []), '/login', '/register', '/cart', '/checkout', '/profile', '/order-history', '/payment/payos/673000000000000000000001', '/admin/dashboard', '/admin/products', '/admin/categories', '/admin/orders', '/admin/users']);

  await call('GET', '/cart', { token: customerToken });
  await call('POST', '/cart/items', { token: customerToken, expected: 400, body: { productId: 'invalid', quantity: 1 } });
  await call('GET', '/orders/my', { token: customerToken });
  await call('POST', '/orders', { token: customerToken, expected: 400, body: { name: 'Empty cart', phone: '0900000000', address: 'Test', paymentMethod: 'cod' } });
  await call('GET', '/admin/products', { token: customerToken, expected: 403 });

  data = await call('POST', '/auth/login', { body: { email: 'admin@shop.local', password: 'Demo1234!' } });
  adminToken = data.token;
  assert.equal(data.user.role, 'admin');
  await call('GET', '/admin/dashboard', { token: adminToken });
  await call('GET', '/admin/products', { token: adminToken });
  await call('GET', '/admin/categories', { token: adminToken });
  await call('GET', '/admin/orders', { token: adminToken });
  await call('GET', '/admin/users?q=codex-smoke', { token: adminToken });

  data = await call('POST', '/admin/categories', { token: adminToken, expected: 201, body: { name: categoryName, description: 'Temporary API smoke category' } }); categoryId = data.category._id;
  await call('PATCH', `/admin/categories/${categoryId}`, { token: adminToken, body: { description: 'Updated smoke category' } });
  data = await call('POST', '/admin/products', { token: adminToken, expected: 201, body: { name: productName, category: categoryId, price: 25000, stock: 10, sizes: ['M'], colors: ['Black'], description: 'Temporary API smoke product' } }); productId = data.product._id;
  await call('GET', `/admin/products/${productId}`, { token: adminToken });
  await call('GET', `/products/${productId}`);
  await call('PATCH', `/admin/products/${productId}`, { token: adminToken, body: { price: 26000 } });

  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 1, size: 'M', color: 'Black' } });
  data = await call('GET', '/cart', { token: customerToken });
  const itemId = data.cart.items[0]._id;
  await call('PATCH', `/cart/items/${itemId}`, { token: customerToken, body: { quantity: 2 } });
  await call('DELETE', `/cart/items/${itemId}`, { token: customerToken });
  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 2, size: 'M', color: 'Black' } });
  data = await call('POST', '/orders', { token: customerToken, expected: 201, body: { name: 'Codex API Smoke', phone: '0900000000', address: 'Test address', paymentMethod: 'cod' } });
  const orderId = data.order._id;
  await call('GET', '/orders/my', { token: customerToken });
  await call('GET', `/orders/my/${orderId}`, { token: customerToken });
  await call('GET', '/admin/orders?status=pending', { token: adminToken });
  await call('GET', `/admin/orders/${orderId}`, { token: adminToken });
  await call('PATCH', `/admin/orders/${orderId}/status`, { token: adminToken, body: { status: 'confirmed' } });
  await call('PATCH', `/admin/orders/${orderId}/status`, { token: adminToken, body: { status: 'cancelled' } });

  await call('POST', '/cart/items', { token: customerToken, expected: 201, body: { productId, quantity: 1, size: 'M', color: 'Black' } });
  data = await call('POST', '/orders', { token: customerToken, expected: 201, body: { name: 'Codex API Smoke', phone: '0900000000', address: 'Test address', paymentMethod: 'payos' } });
  const payosId = data.order._id;
  assert.ok(data.paymentSimulationUrl);
  data = await call('POST', `/orders/${payosId}/payos/simulate-success`, { token: customerToken });
  assert.equal(data.order.paymentStatus, 'paid');
  assert.ok(data.order.paymentReference.startsWith('SIM-'));
  await call('PATCH', `/admin/orders/${payosId}/status`, { token: adminToken, body: { status: 'cancelled', paymentStatus: 'refunded' } });
  await call('PATCH', `/admin/users/${userId}/status`, { token: adminToken, body: { isActive: false } });
  await call('DELETE', `/admin/products/${productId}`, { token: adminToken });
  await call('DELETE', `/admin/categories/${categoryId}`, { token: adminToken });
  console.log(`\nPASS ${passed} checks; DB connected; temporary test records will be removed.`);
}

(async () => {
  try { await mongoose.connect(process.env.MONGODB_URI); console.log(`MongoDB connected (${mongoose.connection.name})`); await run(); }
  finally { try { await cleanup(); } finally { await mongoose.disconnect(); } }
})().catch((error) => { console.error(`FAIL after ${passed} successful checks: ${error.message}`); process.exitCode = 1; });
