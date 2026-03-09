const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ecommerce-secret-key-2024';

// Input validation helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) { return EMAIL_RE.test(String(email).trim()); }
function sanitizeStr(val) { return typeof val === 'string' ? val.trim() : val; }
function escapeHtml(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

// Security middleware
// Security - disabled for inline scripts
// app.use(helmet({...}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function logAdminAction(adminId, action, details = '') {
  db.prepare('INSERT INTO activity_log (admin_id, action, details) VALUES (?, ?, ?)').run(adminId, action, details);
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const name = sanitizeStr(req.body.name);
  const email = sanitizeStr(req.body.email);
  const password = req.body.password;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
  const user = { id: result.lastInsertRowid, name, email, role: 'user' };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: payload });
});

// In-memory store for password reset tokens: token -> { userId, expires }
const resetTokens = new Map();

app.post('/api/auth/forgot-password', (req, res) => {
  const email = sanitizeStr(req.body.email);
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No account found with that email' });

  const token = require('crypto').randomBytes(32).toString('hex');
  resetTokens.set(token, { userId: user.id, expires: Date.now() + 15 * 60 * 1000 }); // 15 min

  // In production, email the token. For demo, return it directly.
  res.json({ message: 'Password reset token generated', reset_token: token });
});

app.post('/api/auth/reset-password', (req, res) => {
  const token = sanitizeStr(req.body.token);
  const newPassword = req.body.new_password;
  if (!token || !newPassword) return res.status(400).json({ error: 'token and new_password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const entry = resetTokens.get(token);
  if (!entry) return res.status(400).json({ error: 'Invalid or expired reset token' });
  if (Date.now() > entry.expires) {
    resetTokens.delete(token);
    return res.status(400).json({ error: 'Reset token has expired' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, entry.userId);
  resetTokens.delete(token);
  res.json({ message: 'Password updated successfully' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const name = sanitizeStr(req.body.name);
  const email = sanitizeStr(req.body.email);
  if (!name && !email) return res.status(400).json({ error: 'Provide name or email to update' });
  if (email && !isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

  const current = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
  if (!current) return res.status(404).json({ error: 'User not found' });

  const newEmail = email || current.email;
  const newName = name || current.name;

  if (email && email !== current.email) {
    const taken = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
    if (taken) return res.status(409).json({ error: 'Email already in use' });
  }

  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(newName, newEmail, req.user.id);
  const updated = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(updated);
});

// ─── CATEGORIES ────────────────────────────────────────────────────────────────

app.get('/api/categories', (req, res) => {
  const rows = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category").all();
  res.json(rows.map(r => r.category));
});

// ─── PRODUCT ROUTES ────────────────────────────────────────────────────────────

app.get('/api/products', (req, res) => {
  const { search, category } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  let baseQuery = 'FROM products WHERE 1=1';
  const params = [];
  if (search) { baseQuery += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { baseQuery += ' AND category = ?'; params.push(category); }

  const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params).count;
  const products = db.prepare(`SELECT * ${baseQuery} ORDER BY id LIMIT ? OFFSET ?`).all(...params, limit, offset);

  res.json({
    data: products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', adminMiddleware, (req, res) => {
  const { name, description, price, image, category, stock } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Name and price required' });
  const result = db.prepare('INSERT INTO products (name, description, price, image, category, stock) VALUES (?, ?, ?, ?, ?, ?)').run(name, description || '', price, image || '', category || '', stock || 0);
  logAdminAction(req.user.id, 'create_product', `id=${result.lastInsertRowid} name=${name}`);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/products/:id', adminMiddleware, (req, res) => {
  const { name, description, price, image, category, stock } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  db.prepare('UPDATE products SET name=?, description=?, price=?, image=?, category=?, stock=? WHERE id=?')
    .run(name ?? product.name, description ?? product.description, price ?? product.price, image ?? product.image, category ?? product.category, stock ?? product.stock, req.params.id);
  logAdminAction(req.user.id, 'update_product', `id=${req.params.id}`);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

app.delete('/api/products/:id', adminMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  // Remove FK-dependent rows before deleting (foreign_keys = ON)
  db.transaction(() => {
    db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM wishlist WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM reviews WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM order_items WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  })();
  logAdminAction(req.user.id, 'delete_product', `id=${req.params.id} name=${product.name}`);
  res.json({ message: 'Product deleted' });
});

// ─── REVIEW ROUTES ──────────────────────────────────────────────────────────────

app.get('/api/products/:id/reviews', (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const reviews = db.prepare(`
    SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ? ORDER BY r.created_at DESC
  `).all(req.params.id);
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : null;
  res.json({ reviews, average_rating: avg ? Math.round(avg * 10) / 10 : null, count: reviews.length });
});

app.post('/api/products/:id/reviews', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const rating = parseInt(req.body.rating);
  const comment = sanitizeStr(req.body.comment) || '';
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  const existing = db.prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'You have already reviewed this product' });

  const result = db.prepare('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(req.params.id, req.user.id, rating, comment);
  const review = db.prepare(`
    SELECT r.id, r.rating, r.comment, r.created_at, u.name as user_name
    FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(review);
});

app.delete('/api/reviews/:id', authMiddleware, (req, res) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this review' });
  }
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ message: 'Review deleted' });
});

// ─── ORDER ROUTES ───────────────────────────────────────────────────────────────

app.post('/api/orders', authMiddleware, (req, res) => {
  const { items } = req.body; // [{ product_id, quantity }]
  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

  let total = 0;
  const resolvedItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) return res.status(404).json({ error: `Product ${item.product_id} not found` });
    if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
    total += product.price * item.quantity;
    resolvedItems.push({ product, quantity: item.quantity });
  }

  const placeOrder = db.transaction(() => {
    const orderResult = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.user.id, total);
    const orderId = orderResult.lastInsertRowid;
    for (const { product, quantity } of resolvedItems) {
      db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)').run(orderId, product.id, quantity, product.price);
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product.id);
    }
    return orderId;
  });

  const orderId = placeOrder();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare(`
    SELECT oi.*, p.name, p.image FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(orderId);
  res.status(201).json({ ...order, items: orderItems });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const ordersWithItems = orders.map(order => {
    const items = db.prepare(`
      SELECT oi.*, p.name, p.image FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);
    return { ...order, items };
  });
  res.json(ordersWithItems);
});

app.get('/api/orders/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare(`
    SELECT oi.*, p.name, p.image FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order.id);
  res.json({ ...order, items });
});

app.post('/api/orders/:id/cancel', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'pending') return res.status(400).json({ error: `Cannot cancel order with status '${order.status}'` });

  const cancelOrder = db.transaction(() => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    for (const item of items) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
    }
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
  });

  cancelOrder();
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id));
});

// ─── CART ROUTES ────────────────────────────────────────────────────────────────

app.get('/api/cart', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT ci.id, ci.user_id, ci.product_id, ci.quantity,
           p.name, p.price, p.image, p.stock
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `).all(req.user.id);
  res.json(items);
});

app.post('/api/cart', authMiddleware, (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity || quantity < 1) return res.status(400).json({ error: 'product_id and quantity (>=1) required' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(req.user.id, product_id, quantity);

  const item = db.prepare(`
    SELECT ci.id, ci.user_id, ci.product_id, ci.quantity,
           p.name, p.price, p.image, p.stock
    FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ? AND ci.product_id = ?
  `).get(req.user.id, product_id);
  res.status(201).json(item);
});

app.put('/api/cart', authMiddleware, (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity || quantity < 1) return res.status(400).json({ error: 'product_id and quantity (>=1) required' });

  const item = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });

  db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?').run(quantity, req.user.id, product_id);

  const updated = db.prepare(`
    SELECT ci.id, ci.user_id, ci.product_id, ci.quantity,
           p.name, p.price, p.image, p.stock
    FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ? AND ci.product_id = ?
  `).get(req.user.id, product_id);
  res.json(updated);
});

app.delete('/api/cart/:productId', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ message: 'Item removed from cart' });
});

// ─── WISHLIST ROUTES ─────────────────────────────────────────────────────────────

app.get('/api/wishlist', authMiddleware, (req, res) => {
  const items = db.prepare(`
    SELECT w.id, w.created_at, p.id as product_id, p.name, p.price, p.image, p.category, p.stock
    FROM wishlist w JOIN products p ON w.product_id = p.id
    WHERE w.user_id = ? ORDER BY w.created_at DESC
  `).all(req.user.id);
  res.json(items);
});

app.post('/api/wishlist', authMiddleware, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id required' });
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product_id);
  if (existing) return res.status(409).json({ error: 'Product already in wishlist' });

  db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, product_id);
  const item = db.prepare(`
    SELECT w.id, w.created_at, p.id as product_id, p.name, p.price, p.image, p.category, p.stock
    FROM wishlist w JOIN products p ON w.product_id = p.id
    WHERE w.user_id = ? AND w.product_id = ?
  `).get(req.user.id, product_id);
  res.status(201).json(item);
});

app.delete('/api/wishlist/:productId', authMiddleware, (req, res) => {
  const item = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, req.params.productId);
  if (!item) return res.status(404).json({ error: 'Product not in wishlist' });
  db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId);
  res.json({ message: 'Removed from wishlist' });
});

// ─── COUPON ROUTES ───────────────────────────────────────────────────────────────

app.get('/api/coupons/validate', (req, res) => {
  const code = sanitizeStr(req.query.code);
  if (!code) return res.status(400).json({ error: 'code query param required' });
  const coupon = db.prepare('SELECT id, code, discount_percent, valid_until FROM coupons WHERE code = ?').get(code);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  if (new Date(coupon.valid_until) < new Date()) return res.status(410).json({ error: 'Coupon has expired' });
  res.json(coupon);
});

app.post('/api/coupons', adminMiddleware, (req, res) => {
  const code = sanitizeStr(req.body.code);
  const discount_percent = parseFloat(req.body.discount_percent);
  const valid_until = sanitizeStr(req.body.valid_until);

  if (!code) return res.status(400).json({ error: 'code required' });
  if (!discount_percent || discount_percent <= 0 || discount_percent > 100) return res.status(400).json({ error: 'discount_percent must be 1-100' });
  if (!valid_until || isNaN(Date.parse(valid_until))) return res.status(400).json({ error: 'valid_until must be a valid date' });

  const existing = db.prepare('SELECT id FROM coupons WHERE code = ?').get(code);
  if (existing) return res.status(409).json({ error: 'Coupon code already exists' });

  const result = db.prepare('INSERT INTO coupons (code, discount_percent, valid_until) VALUES (?, ?, ?)').run(code, discount_percent, valid_until);
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);
  logAdminAction(req.user.id, 'create_coupon', `code=${code} discount=${discount_percent}%`);
  res.status(201).json(coupon);
});

app.get('/api/admin/coupons', adminMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all());
});

app.put('/api/admin/coupons/:id', adminMiddleware, (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

  const code = sanitizeStr(req.body.code) || coupon.code;
  const discount_percent = req.body.discount_percent !== undefined ? parseFloat(req.body.discount_percent) : coupon.discount_percent;
  const valid_until = sanitizeStr(req.body.valid_until) || coupon.valid_until;

  if (discount_percent <= 0 || discount_percent > 100) return res.status(400).json({ error: 'discount_percent must be 1-100' });
  if (isNaN(Date.parse(valid_until))) return res.status(400).json({ error: 'valid_until must be a valid date' });

  if (code !== coupon.code) {
    const taken = db.prepare('SELECT id FROM coupons WHERE code = ? AND id != ?').get(code, req.params.id);
    if (taken) return res.status(409).json({ error: 'Coupon code already exists' });
  }

  db.prepare('UPDATE coupons SET code=?, discount_percent=?, valid_until=? WHERE id=?').run(code, discount_percent, valid_until, req.params.id);
  logAdminAction(req.user.id, 'update_coupon', `id=${req.params.id} code=${code}`);
  res.json(db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id));
});

app.delete('/api/admin/coupons/:id', adminMiddleware, (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  logAdminAction(req.user.id, 'delete_coupon', `id=${req.params.id} code=${coupon.code}`);
  res.json({ message: 'Coupon deleted' });
});

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────────

app.get('/api/admin/stats', adminMiddleware, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders').get().sum;
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({ totalUsers, totalOrders, totalRevenue, totalProducts });
});

app.get('/api/admin/orders', adminMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
  const ordersWithItems = orders.map(order => {
    const items = db.prepare(`
      SELECT oi.*, p.name FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(order.id);
    return { ...order, items };
  });
  res.json(ordersWithItems);
});

app.put('/api/admin/orders/:id/status', adminMiddleware, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  logAdminAction(req.user.id, 'update_order_status', `order_id=${req.params.id} status=${status}`);
  res.json({ message: 'Status updated' });
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC').all());
});

app.get('/api/admin/activity-log', adminMiddleware, (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
  const logs = db.prepare(`
    SELECT al.id, al.action, al.details, al.created_at, u.name as admin_name, u.email as admin_email
    FROM activity_log al JOIN users u ON al.admin_id = u.id
    ORDER BY al.created_at DESC LIMIT ?
  `).all(limit);
  res.json(logs);
});

// Serve SPA for all other routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`E-commerce server running at http://localhost:${PORT}`);
  console.log(`Also accessible at http://<your-local-ip>:${PORT}`);
});
