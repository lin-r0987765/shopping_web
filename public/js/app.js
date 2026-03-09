// ─── DARK MODE ────────────────────────────────────────────────────────────────
(function() {
  const saved = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'true' || (saved === null && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  const btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ─── STATE ───────────────────────────────────────────────────────────────────
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let allProducts = [];
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

// ─── INIT ────────────────────────────────────────────────────────────────────
window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem('token');
  const u = localStorage.getItem('user');
  if (t && u) { token = t; currentUser = JSON.parse(u); }

  const btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';

  updateNav();
  handleRoute();
  loadProducts();
  document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.quantity, 0);
  initReveal();
  initBackToTop();
  initScrollProgress();
  initFlashSaleTimer();
  initTypewriter();
  initHeroCounters();

  // Hide preloader
  const preloader = document.getElementById('premium-preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.style.opacity = '0';
      setTimeout(() => preloader.style.visibility = 'hidden', 600);
    }, 600);
  }
});

function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.documentElement, b = document.body;
    const percent = (h.scrollTop || b.scrollTop) / ((h.scrollHeight || b.scrollHeight) - h.clientHeight) * 100;
    bar.style.width = percent + '%';
  }, { passive: true });
}

function initFlashSaleTimer() {
  const hEl = document.getElementById('fs-hours');
  const mEl = document.getElementById('fs-minutes');
  const sEl = document.getElementById('fs-seconds');
  if (!hEl || !mEl || !sEl) return;
  const endTime = new Date().getTime() + 12 * 60 * 60 * 1000;
  const update = () => {
    const dist = endTime - Date.now();
    if (dist < 0) { hEl.textContent = mEl.textContent = sEl.textContent = '00'; return; }
    hEl.textContent = String(Math.floor(dist / 3600000) % 24).padStart(2, '0');
    mEl.textContent = String(Math.floor(dist / 60000) % 60).padStart(2, '0');
    sEl.textContent = String(Math.floor(dist / 1000) % 60).padStart(2, '0');
  };
  update();
  setInterval(update, 1000);
}

function initTypewriter() {
  const el = document.getElementById('typewriter-text');
  if (!el) return;
  const words = ['專業設備', '精密零組件', '高端儀器', '工業機械', '電子元件'];
  let wi = 0, ci = 0, del = false;
  const tick = () => {
    const w = words[wi];
    if (!del) { el.textContent = w.slice(0, ++ci); if (ci === w.length) { setTimeout(() => { del = true; tick(); }, 1800); return; } }
    else { el.textContent = w.slice(0, --ci); if (ci === 0) { del = false; wi = (wi + 1) % words.length; } }
    setTimeout(tick, del ? 50 : 90);
  };
  tick();
}

function initHeroCounters() {
  const stats = document.querySelectorAll('[data-hero-count]');
  if (!stats.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.dataset.counted) return;
      entry.target.dataset.counted = '1';
      const el = entry.target;
      const target = parseFloat(el.dataset.heroCount);
      const suffix = el.dataset.suffix || '';
      const dec = parseInt(el.dataset.decimal || '0');
      const start = performance.now();
      const animate = now => {
        const p = Math.min((now - start) / 1800, 1);
        const eased = 1 - Math.pow(2, -10 * p);
        el.textContent = (target >= 1000 ? Math.floor(eased * target).toLocaleString() : (eased * target).toFixed(dec)) + suffix;
        if (p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    });
  }, { threshold: 0.5 });
  stats.forEach(el => obs.observe(el));
}

function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
}

// ─── ROUTING ─────────────────────────────────────────────────────────────────
function handleRoute() {
  const hash = location.hash.replace('#', '') || 'products';
  _navigate(hash, false);
}

async function _navigate(page, pushState = true) {
  const gp = document.getElementById('global-progress');
  if (gp) { gp.style.opacity = '1'; gp.style.width = '30%'; }

  if (['dashboard', 'admin'].includes(page) && !token) { if (gp) { gp.style.width = '100%'; setTimeout(() => gp.style.opacity = '0', 200); } _navigate('login'); return; }
  if (page === 'admin' && currentUser?.role !== 'admin') { if (gp) { gp.style.width = '100%'; setTimeout(() => gp.style.opacity = '0', 200); } _navigate('dashboard'); return; }

  if (gp) gp.style.width = '60%';

  const curr = document.querySelector('.page.active');
  if (curr && curr.id !== `page-${page}`) {
    curr.classList.add('exiting');
    await new Promise(r => setTimeout(r, 300));
    curr.classList.remove('active', 'exiting');
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active', 'exiting'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const el = document.getElementById(`page-${page}`);
  if (!el) { _navigate('products'); return; }
  el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (pushState) history.pushState(null, null, `#${page}`);

  if (gp) { gp.style.width = '100%'; setTimeout(() => { gp.style.opacity = '0'; setTimeout(() => { if (gp) gp.style.width = '0'; }, 300); }, 300); }

  if (page === 'cart') { openCartDrawer(); return; }
  if (page === 'dashboard') loadDashboard();
  if (page === 'admin') loadAdmin();
  if (page === 'products') loadProducts();
}

function navigate(page, pushState = true) {
  closeMobileMenu();
  if (page === 'cart') { openCartDrawer(); return; }
  return _navigate(page, pushState);
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
function openCartDrawer() {
  document.getElementById('cart-drawer').classList.add('open');
  renderCartInDrawer();
}
function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('open');
}

// ─── MOBILE MENU ──────────────────────────────────────────────────────────────
function toggleMobileMenu() {
  const isOpen = document.getElementById('nav-links').classList.toggle('active');
  document.getElementById('hamburger-btn').classList.toggle('active', isOpen);
  document.getElementById('nav-backdrop').style.display = isOpen ? 'block' : 'none';
}
function closeMobileMenu() {
  document.getElementById('nav-links')?.classList.remove('active');
  document.getElementById('hamburger-btn')?.classList.remove('active');
  document.getElementById('nav-backdrop').style.display = 'none';
}

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function updateNav() {
  const loggedIn = !!token;
  document.getElementById('nav-auth').style.display = loggedIn ? 'none' : '';
  document.getElementById('nav-user').style.display = loggedIn ? '' : 'none';
  document.getElementById('nav-admin-btn').style.display = (currentUser?.role === 'admin') ? '' : 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent = '登入中...'; btn.disabled = true;
  try {
    const data = await api('POST', '/api/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    token = data.token; currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateNav();
    showToast('歡迎回來，' + currentUser.name);
    navigate(currentUser.role === 'admin' ? 'admin' : 'products');
  } catch (err) { showAlert('login-alert', err.message, 'danger'); }
  finally { btn.textContent = orig; btn.disabled = false; }
}

function togglePassword(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

function subscribeNewsletter(e) {
  e.preventDefault();
  showToast('訂閱成功');
  e.target.reset();
}

async function handleRegister(e) {
  e.preventDefault();
  try {
    const data = await api('POST', '/api/auth/register', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value
    });
    token = data.token; currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateNav();
    showToast('帳號已建立');
    navigate('products');
  } catch (err) { showAlert('register-alert', err.message, 'danger'); }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  showAlert('forgot-alert', '若此電子郵件已註冊，重設連結將發送至您的信箱。', 'success');
  document.getElementById('forgot-email').value = '';
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  updateNav();
  showToast('已登出');
  navigate('products');
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const sugg = document.getElementById('search-suggestions');
  const input = document.getElementById('search-input');
  if (sugg && input && !input.contains(e.target) && !sugg.contains(e.target)) sugg.classList.remove('active');
});

async function loadProducts() {
  renderSkeletons();
  try {
    const res = await api('GET', '/api/products');
    allProducts = res.data;
    renderProducts(allProducts);
    renderCategoryPills(allProducts);
  } catch { showToast('加載產品失敗'); }
}

function renderSkeletons() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  grid.innerHTML = Array(8).fill(0).map(() => `
    <div class="skeleton" style="border-radius:var(--radius-md)">
      <div class="skeleton-img"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `).join('');
}

function renderCategoryPills(products) {
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
  const el = document.getElementById('category-pills');
  if (!el) return;
  el.innerHTML = `
    <button class="category-pill active" onclick="filterByPill('',this)">全部</button>
    ${cats.map(c => `<button class="category-pill" onclick="filterByPill('${esc(c)}',this)">${esc(c)}</button>`).join('')}
  `;
}

function filterByPill(cat, el) {
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const f = document.getElementById('category-filter');
  if (f) { f.value = cat; filterProducts(); }
}

function filterProducts() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('category-filter').value;
  const sort = document.getElementById('sort-filter')?.value || 'default';

  let filtered = allProducts.filter(p =>
    (!q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) &&
    (!cat || p.category === cat)
  );

  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  renderProducts(filtered);

  // Search suggestions
  const sugg = document.getElementById('search-suggestions');
  if (sugg) {
    if (q.length > 0 && filtered.length > 0) {
      sugg.classList.add('active');
      sugg.innerHTML = filtered.slice(0, 5).map(p => `
        <div class="search-suggestion-item" onclick="showProductDetail(${p.id}); document.getElementById('search-suggestions').classList.remove('active'); document.getElementById('search-input').value='';">
          ${esc(p.name)} — <span style="color:var(--text-muted)">$${p.price.toFixed(2)}</span>
        </div>
      `).join('');
    } else { sugg.classList.remove('active'); }
  }
}

function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
      <p style="font-size:1rem;margin-bottom:16px">找不到符合的商品</p>
      <button class="btn btn-outline" onclick="document.getElementById('search-input').value='';document.getElementById('category-filter').value='';filterProducts()">清除篩選</button>
    </div>`;
    return;
  }

  // Recently Viewed
  const rvIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  const rvEl = document.getElementById('recently-viewed-rail');
  if (rvEl && rvIds.length > 0) {
    const rvProds = rvIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
    rvEl.innerHTML = `
      <div style="font-size:0.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">最近瀏覽</div>
      <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
        ${rvProds.map(p => `
          <div onclick="showProductDetail(${p.id})" style="cursor:pointer;flex-shrink:0;width:120px">
            <img src="${p.image || ''}" style="width:120px;height:80px;object-fit:cover;border-radius:10px;background:var(--bg-secondary)" onerror="this.style.display='none'" />
            <div style="font-size:0.78rem;font-weight:500;margin-top:6px;color:var(--text)">${esc(p.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">$${p.price.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>`;
    rvEl.style.display = 'block';
  } else if (rvEl) { rvEl.style.display = 'none'; }

  grid.innerHTML = products.map(p => {
    const inWl = wishlist.includes(p.id);
    const stockLabel = p.stock === 0 ? '<span style="color:var(--danger)">缺貨</span>'
      : p.stock <= 5 ? `<span style="color:var(--warning)">僅剩 ${p.stock} 件</span>`
      : `${p.stock} 件`;
    return `
    <div class="product-card" onclick="showProductDetail(${p.id})">
      <div class="img-wrap">
        <img src="${p.image || ''}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22260%22><rect fill=%22%23f5f5f7%22 width=%22400%22 height=%22260%22/><text fill=%22%23ccc%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-size=%2248%22>📦</text></svg>'" />
        ${p.stock <= 5 && p.stock > 0 ? `<span class="stock-badge low">僅剩 ${p.stock}</span>` : ''}
        ${p.stock === 0 ? '<span class="stock-badge out">缺貨</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-category">${esc(p.category)}</div>
        <h3>${esc(p.name)}</h3>
      </div>
      <div class="card-footer">
        <span class="price">$${p.price.toFixed(2)}</span>
        <div class="card-actions">
          <button class="wishlist-btn ${inWl ? 'active' : ''}" id="wl-${p.id}" onclick="toggleWishlist(${p.id});event.stopPropagation()" title="${inWl ? '取消收藏' : '收藏'}">${inWl ? '❤' : '♡'}</button>
          <button class="cart-add-btn" onclick="addToCart(${p.id});event.stopPropagation()" ${p.stock === 0 ? 'disabled' : ''} title="加入採購車">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── PRODUCT DETAIL ──────────────────────────────────────────────────────────
async function showProductDetail(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  // Track recently viewed
  let rv = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  rv = [id, ...rv.filter(x => x !== id)].slice(0, 8);
  localStorage.setItem('recentlyViewed', JSON.stringify(rv));

  let reviews = [], avgRating = 0;
  try { const r = await api('GET', `/api/products/${id}/reviews`); reviews = r.reviews || []; avgRating = r.average_rating || 0; } catch {}

  const inWl = wishlist.includes(product.id);
  const el = document.getElementById('product-detail-content');
  if (!el) return;

  el.innerHTML = `
    <div class="product-detail">
      <div style="margin-bottom:24px">
        <a onclick="navigate('products')" style="color:var(--primary);cursor:pointer;font-size:0.85rem;font-weight:500">← 返回所有商品</a>
      </div>
      <div class="product-detail-grid">
        <div>
          <img class="product-detail-img" src="${product.image || ''}" alt="${esc(product.name)}" onerror="this.style.background='var(--bg-secondary)'" />
        </div>
        <div class="product-detail-info">
          <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">${esc(product.category) || '未分類'}</div>
          <h1>${esc(product.name)}</h1>
          <div class="price">$${product.price.toFixed(2)}</div>
          <p class="description">${esc(product.description) || '無描述'}</p>
          <div class="stock-info">庫存：${product.stock === 0 ? '<span style="color:var(--danger)">缺貨</span>' : product.stock <= 5 ? '<span style="color:var(--warning)">僅剩 ' + product.stock + ' 件</span>' : '<span style="color:var(--success)">' + product.stock + ' 件</span>'}</div>

          ${product.stock > 0 ? `
          <div class="qty-selector">
            <span style="font-size:0.85rem;color:var(--text-secondary)">數量</span>
            <button onclick="document.getElementById('detail-qty').value=Math.max(1,+document.getElementById('detail-qty').value-1)">−</button>
            <span id="detail-qty-display">1</span>
            <input type="hidden" id="detail-qty" value="1" />
            <button onclick="const v=Math.min(${product.stock},+document.getElementById('detail-qty').value+1);document.getElementById('detail-qty').value=v;document.getElementById('detail-qty-display').textContent=v">+</button>
          </div>
          <div class="detail-actions">
            <button class="btn btn-primary" onclick="addToCartQty(${product.id})">加入採購車</button>
            <button class="btn btn-outline" id="wl-detail-${product.id}" onclick="toggleWishlist(${product.id})" style="${inWl ? 'color:#ff2d55;border-color:#ff2d55' : ''}">${inWl ? '❤ 已收藏' : '♡ 收藏'}</button>
          </div>
          ` : `
          <div class="detail-actions">
            <button class="btn btn-secondary" disabled>缺貨中</button>
            <button class="btn btn-outline" id="wl-detail-${product.id}" onclick="toggleWishlist(${product.id})" style="${inWl ? 'color:#ff2d55;border-color:#ff2d55' : ''}">${inWl ? '❤ 已收藏' : '♡ 收藏'}</button>
          </div>`}

          <div style="display:flex;gap:24px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border)">
            <div style="font-size:0.82rem;color:var(--text-secondary)"><span style="margin-right:4px">🔒</span> 安全結帳</div>
            <div style="font-size:0.82rem;color:var(--text-secondary)"><span style="margin-right:4px">🛡️</span> 原廠保固</div>
            <div style="font-size:0.82rem;color:var(--text-secondary)"><span style="margin-right:4px">🔄</span> 15天退貨</div>
          </div>
        </div>
      </div>

      <div class="reviews-section">
        <h2>評論 ${reviews.length > 0 ? `<span style="color:#f5a623;font-size:0.9rem">${'★'.repeat(Math.round(avgRating))} ${avgRating.toFixed(1)}</span>` : ''} <span style="font-size:0.85rem;font-weight:400;color:var(--text-muted)">(${reviews.length} 則)</span></h2>

        ${token ? `
        <div class="review-form">
          <h3>撰寫評論</h3>
          <div class="star-rating-input" id="star-selector">
            ${[1, 2, 3, 4, 5].map(n => `<span data-val="${n}" onclick="setReviewStar(${product.id},${n})" onmouseover="hoverStar(${n})" onmouseout="unhoverStar(${product.id})">☆</span>`).join('')}
          </div>
          <input type="hidden" id="review-rating-${product.id}" value="0">
          <textarea id="review-comment-${product.id}" placeholder="分享您的使用心得..."></textarea>
          <button class="btn btn-primary btn-sm" onclick="submitReview(${product.id})">送出評論</button>
        </div>` : `<p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:16px"><a style="color:var(--primary);cursor:pointer" onclick="navigate('login')">登入</a>後可撰寫評論</p>`}

        ${reviews.length === 0 ? '<p style="color:var(--text-muted);font-size:0.88rem">尚無評論</p>' : reviews.map(r => `
          <div class="review-item">
            <div class="review-header">
              <div>
                <span class="review-user">${esc(r.user_name || '匿名')}</span>
                <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
              </div>
              <span class="review-date">${new Date(r.created_at).toLocaleDateString('zh-TW')}</span>
            </div>
            <p class="review-comment">${esc(r.comment || '')}</p>
          </div>
        `).join('')}
      </div>

      ${allProducts.filter(p => p.category === product.category && p.id !== product.id).length > 0 ? `
      <div style="margin-top:48px;padding-top:32px;border-top:1px solid var(--border)">
        <h2 style="font-size:1.2rem;font-weight:600;margin-bottom:20px">相關商品</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">
          ${allProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(p => `
            <div class="product-card" onclick="showProductDetail(${p.id})">
              <div class="img-wrap">
                <img src="${p.image || ''}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'" />
              </div>
              <div class="card-body">
                <h3>${esc(p.name)}</h3>
              </div>
              <div class="card-footer">
                <span class="price">$${p.price.toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
    </div>`;

  navigate('product');
}

// Qty selector helper for detail page
document.addEventListener('click', e => {
  const btn = e.target;
  if (btn.closest('.qty-selector button')) {
    const display = document.getElementById('detail-qty-display');
    const input = document.getElementById('detail-qty');
    if (display && input) display.textContent = input.value;
  }
});

// ─── REVIEW HELPERS ──────────────────────────────────────────────────────────
function hoverStar(n) {
  document.querySelectorAll('#star-selector span').forEach((s, i) => {
    s.textContent = i < n ? '★' : '☆';
    s.style.color = i < n ? '#f5a623' : '';
  });
}
function unhoverStar(pid) {
  const c = parseInt(document.getElementById(`review-rating-${pid}`)?.value || '0');
  document.querySelectorAll('#star-selector span').forEach((s, i) => {
    s.textContent = i < c ? '★' : '☆';
    s.style.color = i < c ? '#f5a623' : '';
  });
}
function setReviewStar(pid, n) {
  const inp = document.getElementById(`review-rating-${pid}`);
  if (inp) inp.value = n;
  document.querySelectorAll('#star-selector span').forEach((s, i) => {
    s.textContent = i < n ? '★' : '☆';
    s.style.color = i < n ? '#f5a623' : '';
  });
}
async function submitReview(pid) {
  const r = parseInt(document.getElementById(`review-rating-${pid}`)?.value || '0');
  const c = document.getElementById(`review-comment-${pid}`)?.value || '';
  if (!r || r < 1) { showToast('請選擇評分'); return; }
  try {
    await api('POST', `/api/products/${pid}/reviews`, { rating: r, comment: c });
    showToast('評論已送出');
    await showProductDetail(pid);
  } catch (e) { showToast(e.message); }
}

// ─── CART ─────────────────────────────────────────────────────────────────────
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) { showToast('庫存不足'); return; }
    existing.quantity++;
  } else {
    cart.push({ product_id: productId, quantity: 1, product });
  }
  saveCart();
  showToast(`已加入「${product.name}」`);
  openCartDrawer();
}

function addToCartQty(productId) {
  const qty = parseInt(document.getElementById('detail-qty')?.value || '1');
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(i => i.product_id === productId);
  const currentQty = existing ? existing.quantity : 0;
  const toAdd = Math.min(qty, product.stock - currentQty);
  if (toAdd <= 0) { showToast('庫存不足'); return; }
  if (existing) existing.quantity += toAdd;
  else cart.push({ product_id: productId, quantity: toAdd, product });
  saveCart();
  showToast(`已加入 ${toAdd} 件「${product.name}」`);
  openCartDrawer();
}

function toggleWishlist(pid) {
  const idx = wishlist.indexOf(pid);
  const btn = document.getElementById(`wl-${pid}`);
  const bd = document.getElementById(`wl-detail-${pid}`);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast('已取消收藏');
    if (btn) { btn.textContent = '♡'; btn.classList.remove('active'); }
    if (bd) { bd.innerHTML = '♡ 收藏'; bd.style.color = ''; bd.style.borderColor = ''; }
  } else {
    wishlist.push(pid);
    showToast('已收藏');
    if (btn) { btn.textContent = '❤'; btn.classList.add('active'); }
    if (bd) { bd.innerHTML = '❤ 已收藏'; bd.style.color = '#ff2d55'; bd.style.borderColor = '#ff2d55'; }
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

function removeFromCart(pid) { cart = cart.filter(i => i.product_id !== pid); saveCart(); renderCartInDrawer(); }
function updateQty(pid, d) {
  const item = cart.find(i => i.product_id === pid);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + d);
  const p = allProducts.find(x => x.id === pid);
  if (p && item.quantity > p.stock) item.quantity = p.stock;
  saveCart(); renderCartInDrawer();
}
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  document.getElementById('cart-count').textContent = cart.reduce((s, i) => s + i.quantity, 0);
}

function renderCartInDrawer() {
  const el = document.getElementById('cart-drawer-content');
  const countEl = document.getElementById('cart-drawer-count');
  if (countEl) countEl.textContent = `(${cart.reduce((s, i) => s + i.quantity, 0)})`;
  if (!el) return;

  if (!cart.length) {
    el.innerHTML = `<div style="padding:60px 20px;text-align:center;color:var(--text-muted)">
      <div style="font-size:2.5rem;margin-bottom:12px">🛒</div>
      <p>您的採購車是空的</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="closeCartDrawer()">開始採購</button>
    </div>`;
    return;
  }

  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const freeShipThreshold = 500;
  const progress = Math.min(100, (total / freeShipThreshold) * 100);
  const remaining = Math.max(0, freeShipThreshold - total);

  el.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-sm);text-align:center">
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px">
          ${remaining > 0
    ? `還差 <strong style="color:var(--primary)">$${remaining.toFixed(2)}</strong> 即享免運`
    : `<strong style="color:var(--success)">已獲得免運資格</strong>`}
        </div>
        <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${progress}%;background:var(--primary);transition:width 0.4s ease"></div>
        </div>
      </div>
    </div>

    ${cart.map(i => `
      <div class="cart-item">
        <img src="${i.product.image || ''}" onerror="this.style.background='var(--bg-secondary)'" />
        <div class="cart-item-info">
          <div class="name">${esc(i.product.name)}</div>
          <div class="meta">
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:0.75rem;min-width:24px" onclick="updateQty(${i.product_id},-1)">−</button>
            <span style="margin:0 8px;font-size:0.85rem;font-weight:600">${i.quantity}</span>
            <button class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:0.75rem;min-width:24px" onclick="updateQty(${i.product_id},1)">+</button>
          </div>
          <div class="price">$${(i.product.price * i.quantity).toFixed(2)}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${i.product_id})">×</button>
      </div>
    `).join('')}

    <div class="cart-summary">
      <div class="coupon-form">
        <input type="text" id="coupon-code" placeholder="輸入優惠碼" style="text-transform:uppercase" />
        <button class="btn btn-outline btn-sm" onclick="applyCoupon()">套用</button>
      </div>
      <div id="coupon-result"></div>
      <div class="cart-summary-row total">
        <span>預估總計</span>
        <span id="cart-final-total">$${total.toFixed(2)}</span>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="checkoutFromDrawer()">立即結帳</button>
      <button class="btn btn-outline btn-full" style="margin-top:8px" onclick="closeCartDrawer()">繼續採購</button>
    </div>`;
}

async function checkoutFromDrawer() {
  if (!token) { showToast('請先登入'); navigate('login'); closeCartDrawer(); return; }
  await checkout();
  closeCartDrawer();
}

// ─── COUPON ───────────────────────────────────────────────────────────────────
let appliedCoupon = null;
async function applyCoupon() {
  const code = document.getElementById('coupon-code').value.trim().toUpperCase();
  if (!code) return;
  try {
    const res = await api('GET', '/api/coupons/validate?code=' + code);
    appliedCoupon = res;
    const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const disc = total * (res.discount_percent / 100);
    const final_ = total - disc;
    document.getElementById('coupon-result').innerHTML = `<div class="coupon-result">✓ ${esc(res.code)} (${res.discount_percent}% off) — 省 $${disc.toFixed(2)}</div>`;
    const f = document.getElementById('cart-final-total');
    if (f) f.textContent = `$${final_.toFixed(2)}`;
    showToast(`節省 $${disc.toFixed(2)}`);
  } catch (e) {
    document.getElementById('coupon-result').innerHTML = `<div style="color:var(--danger);font-size:0.82rem;margin-bottom:8px">${esc(e.message)}</div>`;
    appliedCoupon = null;
  }
}

async function checkout() {
  if (!cart.length) return;
  try {
    const items = cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    const order = await api('POST', '/api/orders', { items });
    cart = []; saveCart();
    showToast(`訂單 #${order.id} 已成立`);
    await loadProducts();
    setTimeout(() => navigate('dashboard'), 800);
  } catch (err) { showToast(err.message); }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const statusMap = { pending: '待處理', processing: '處理中', shipped: '已出貨', delivered: '已送達', cancelled: '已取消' };
const statusColors = { pending: '#ff9500', processing: '#007aff', shipped: '#34c759', delivered: '#5ac8fa', cancelled: '#ff3b30' };

async function loadDashboard() {
  const el = document.getElementById('dashboard-content');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">載入中...</div>';
  try {
    const orders = await api('GET', '/api/orders');
    const totalOrders = orders.length;
    const totalSpent = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    el.innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-profile">
          <div class="profile-avatar">${(currentUser?.name || '?')[0].toUpperCase()}</div>
          <div class="profile-info">
            <h3>${esc(currentUser?.name || '用戶')}</h3>
            <p>${esc(currentUser?.email || '')}</p>
          </div>
        </div>
        <div class="dashboard-stats">
          <div class="dashboard-stat"><div class="stat-value">${totalOrders}</div><div class="stat-label">訂單</div></div>
          <div class="dashboard-stat"><div class="stat-value">$${totalSpent.toFixed(0)}</div><div class="stat-label">總消費</div></div>
          <div class="dashboard-stat"><div class="stat-value">${pendingOrders}</div><div class="stat-label">待處理</div></div>
        </div>
        ${!orders.length
      ? `<div style="text-align:center;padding:48px;color:var(--text-muted)"><p style="margin-bottom:16px">尚無訂單紀錄</p><button class="btn btn-primary" onclick="navigate('products')">開始採購</button></div>`
      : orders.map(o => `
          <div class="order-card">
            <div class="order-card-header">
              <span class="order-id">#${o.id}</span>
              <div style="display:flex;align-items:center;gap:12px">
                <span class="order-status ${o.status}">${statusMap[o.status] || o.status}</span>
                <span style="font-size:0.78rem;color:var(--text-muted)">${new Date(o.created_at).toLocaleDateString('zh-TW')}</span>
              </div>
            </div>
            <div class="order-items-list">
              ${o.items.map(i => `<div class="order-item-row"><span>${esc(i.name)} × ${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('')}
            </div>
            <div class="order-total">
              <span>總計</span>
              <span>$${o.total.toFixed(2)}</span>
            </div>
            ${o.status === 'pending' ? `<button class="btn btn-danger btn-sm" style="margin-top:12px" onclick="cancelOrder(${o.id})">取消訂單</button>` : ''}
          </div>
        `).join('')}
      </div>`;
  } catch { el.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted)">載入失敗</p>'; }
}

async function cancelOrder(id) {
  if (!confirm('確定要取消此訂單？')) return;
  try { await api('POST', `/api/orders/${id}/cancel`); showToast('訂單已取消'); await loadDashboard(); }
  catch (e) { showToast(e.message); }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function switchAdminTab(tab) {
  const tabs = ['products', 'orders', 'users', 'coupons', 'log'];
  document.querySelectorAll('.admin-tab').forEach((t, i) => t.classList.toggle('active', tabs[i] === tab));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`admin-${tab}`)?.classList.add('active');
  if (tab === 'log') loadAdminLog();
}

async function loadAdmin() {
  try {
    const stats = await api('GET', '/api/admin/stats');
    const sg = document.getElementById('admin-stats');
    if (sg) {
      sg.innerHTML = `
        <div class="stat-card"><div class="stat-value">${stats.totalProducts}</div><div class="stat-label">商品</div></div>
        <div class="stat-card"><div class="stat-value">${stats.totalUsers}</div><div class="stat-label">客戶</div></div>
        <div class="stat-card"><div class="stat-value">${stats.totalOrders}</div><div class="stat-label">訂單</div></div>
        <div class="stat-card"><div class="stat-value">$${Math.floor(Number(stats.totalRevenue)).toLocaleString()}</div><div class="stat-label">營收</div></div>`;
    }

    // Revenue chart
    const chart = document.getElementById('admin-revenue-chart');
    if (chart) {
      const data = [45, 60, 55, 80, 70, 95, 88];
      const days = ['一', '二', '三', '四', '五', '六', '日'];
      chart.innerHTML = data.map((v, i) => `
        <div class="chart-bar" style="height:${v}%"><span class="chart-bar-label">${days[i]}</span></div>
      `).join('');
    }

    // Recent activity
    const feed = document.getElementById('admin-recent-activity');
    if (feed) {
      const logs = await api('GET', '/api/admin/activity-log?limit=5').catch(() => []);
      feed.innerHTML = (Array.isArray(logs) ? logs : []).map(l => `
        <div class="activity-item">
          <div style="font-weight:600;font-size:0.82rem">${esc(l.admin_name)}: ${esc(l.details)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${new Date(l.created_at).toLocaleString('zh-TW')}</div>
        </div>
      `).join('') || '<div style="color:var(--text-muted);font-size:0.82rem">尚無近期活動</div>';
    }

    await Promise.all([loadAdminProducts(), loadAdminOrders(), loadAdminUsers(), loadAdminCoupons()]);
  } catch { showToast('載入管理資料失敗'); }
}

async function loadAdminProducts() {
  const body = document.getElementById('admin-products-body');
  if (!body) return;
  const res = await api('GET', '/api/products');
  allProducts = res.data;
  body.innerHTML = res.data.map(p => `
    <tr>
      <td>${p.id}</td>
      <td><img src="${p.image}" onerror="this.style.display='none'" /></td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.category)}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.stock}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">編輯</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">刪除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadAdminOrders() {
  const body = document.getElementById('admin-orders-body');
  if (!body) return;
  const orders = await api('GET', '/api/admin/orders');
  body.innerHTML = orders.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td>${esc(o.user_name)}<br><small style="color:var(--text-muted)">${esc(o.user_email)}</small></td>
      <td style="font-size:0.82rem">${o.items.map(i => `${esc(i.name)} ×${i.quantity}`).join(', ')}</td>
      <td>$${o.total.toFixed(2)}</td>
      <td>
        <select onchange="updateOrderStatus(${o.id},this.value)" style="padding:4px 8px;border-radius:8px;border:1px solid var(--border);font-size:0.82rem;background:var(--bg);color:var(--text)">
          ${[['pending', '待處理'], ['processing', '處理中'], ['shipped', '已出貨'], ['delivered', '已送達'], ['cancelled', '已取消']].map(([v, l]) => `<option value="${v}" ${o.status === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </td>
      <td style="font-size:0.82rem">${new Date(o.created_at).toLocaleDateString('zh-TW')}</td>
    </tr>
  `).join('');
}

async function loadAdminUsers() {
  const body = document.getElementById('admin-users-body');
  if (!body) return;
  const users = await api('GET', '/api/admin/users');
  body.innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${esc(u.name)}</td>
      <td>${esc(u.email)}</td>
      <td><span class="order-status ${u.role === 'admin' ? 'processing' : 'delivered'}" style="font-size:0.72rem">${u.role === 'admin' ? '管理員' : '用戶'}</span></td>
      <td style="font-size:0.82rem">${new Date(u.created_at).toLocaleDateString('zh-TW')}</td>
    </tr>
  `).join('');
}

async function loadAdminCoupons() {
  const body = document.getElementById('admin-coupons-body');
  if (!body) return;
  const coupons = await api('GET', '/api/admin/coupons');
  const now = new Date();
  body.innerHTML = coupons.map(c => {
    const expired = new Date(c.valid_until) < now;
    return `
    <tr>
      <td>${c.id}</td>
      <td><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;font-size:0.82rem">${esc(c.code)}</code></td>
      <td>${c.discount_percent}%</td>
      <td style="font-size:0.82rem">${new Date(c.valid_until).toLocaleDateString('zh-TW')}</td>
      <td style="font-size:0.82rem">${new Date(c.created_at).toLocaleDateString('zh-TW')}</td>
      <td><span class="order-status ${expired ? 'cancelled' : 'delivered'}" style="font-size:0.72rem">${expired ? '已過期' : '有效'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="openCouponModal(${c.id})">編輯</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCoupon(${c.id})">刪除</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function loadAdminLog() {
  const tb = document.getElementById('admin-log-body');
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">載入中...</td></tr>';
  try {
    const logs = await api('GET', '/api/admin/activity-log?limit=50');
    const labels = { create_product: '新增商品', update_product: '更新商品', delete_product: '刪除商品', create_coupon: '新增優惠券', update_coupon: '更新優惠券', delete_coupon: '刪除優惠券', update_order_status: '更新訂單' };
    tb.innerHTML = logs.length ? logs.map(l => `
      <tr>
        <td style="font-size:0.78rem;white-space:nowrap">${new Date(l.created_at).toLocaleString('zh-TW')}</td>
        <td>${esc(l.admin_name)}</td>
        <td><span class="order-status processing" style="font-size:0.72rem">${labels[l.action] || esc(l.action)}</span></td>
        <td style="font-size:0.78rem;color:var(--text-muted)">${esc(l.details)}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">尚無紀錄</td></tr>';
  } catch { tb.innerHTML = '<tr><td colspan="4" style="color:var(--danger);text-align:center">載入失敗</td></tr>'; }
}

// ─── ADMIN MODALS ─────────────────────────────────────────────────────────────
function openCouponModal(id) {
  let code = '', discount = '', validUntil = '';
  if (id) {
    const rows = document.querySelectorAll('#admin-coupons-body tr');
    for (const row of rows) {
      if (row.cells[0].textContent == id) {
        code = row.cells[1].querySelector('code').textContent;
        discount = parseFloat(row.cells[2].textContent);
        const parts = row.cells[3].textContent.split('/');
        if (parts.length === 3) validUntil = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
        break;
      }
    }
  }
  document.getElementById('modal-title').textContent = id ? '編輯優惠券' : '新增優惠券';
  document.getElementById('modal-body').innerHTML = `
    <form onsubmit="saveCoupon(event,${id || 'null'})">
      <label>優惠碼</label>
      <input type="text" id="cp-code" value="${esc(code)}" required style="text-transform:uppercase" placeholder="例如：SAVE20" />
      <label>折扣百分比 (1-100)</label>
      <input type="number" id="cp-discount" value="${discount}" min="1" max="100" step="0.01" required />
      <label>有效期至</label>
      <input type="date" id="cp-valid-until" value="${validUntil}" required />
      <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px">${id ? '更新' : '建立'}</button>
    </form>`;
  openModal();
}

async function saveCoupon(e, id) {
  e.preventDefault();
  const body = {
    code: document.getElementById('cp-code').value.trim().toUpperCase(),
    discount_percent: parseFloat(document.getElementById('cp-discount').value),
    valid_until: document.getElementById('cp-valid-until').value
  };
  try {
    if (id) await api('PUT', `/api/admin/coupons/${id}`, body);
    else await api('POST', '/api/coupons', body);
    closeModal();
    showToast(id ? '已更新' : '已建立');
    await loadAdminCoupons();
  } catch (err) { showToast(err.message); }
}

async function deleteCoupon(id) {
  if (!confirm('確定刪除？')) return;
  try { await api('DELETE', `/api/admin/coupons/${id}`); showToast('已刪除'); await loadAdminCoupons(); }
  catch (e) { showToast(e.message); }
}

async function updateOrderStatus(oid, status) {
  try { await api('PUT', `/api/admin/orders/${oid}/status`, { status }); showToast('已更新'); }
  catch (e) { showToast(e.message); }
}

async function deleteProduct(id) {
  if (!confirm('確定刪除？')) return;
  try { await api('DELETE', `/api/products/${id}`); showToast('已刪除'); await loadAdminProducts(); }
  catch (e) { showToast(e.message); }
}

function openProductModal(id) {
  const p = id ? allProducts.find(x => x.id === id) : null;
  document.getElementById('modal-title').textContent = p ? '編輯商品' : '新增商品';
  document.getElementById('modal-body').innerHTML = `
    <form onsubmit="saveProduct(event,${id || 'null'})">
      <label>商品名稱</label>
      <input type="text" id="mp-name" value="${p ? esc(p.name) : ''}" required />
      <label>商品描述</label>
      <textarea id="mp-desc" rows="3">${p ? esc(p.description) : ''}</textarea>
      <label>價格</label>
      <input type="number" id="mp-price" step="0.01" min="0" value="${p ? p.price : ''}" required />
      <label>圖片網址</label>
      <input type="text" id="mp-image" value="${p ? esc(p.image) : ''}" placeholder="https://..." />
      <label>類別</label>
      <input type="text" id="mp-category" value="${p ? esc(p.category) : ''}" />
      <label>庫存數量</label>
      <input type="number" id="mp-stock" min="0" value="${p ? p.stock : 0}" required />
      <button type="submit" class="btn btn-primary btn-full" style="margin-top:8px">${p ? '更新' : '新增'}</button>
    </form>`;
  openModal();
}

async function saveProduct(e, id) {
  e.preventDefault();
  const body = {
    name: document.getElementById('mp-name').value,
    description: document.getElementById('mp-desc').value,
    price: parseFloat(document.getElementById('mp-price').value),
    image: document.getElementById('mp-image').value,
    category: document.getElementById('mp-category').value,
    stock: parseInt(document.getElementById('mp-stock').value)
  };
  try {
    if (id) await api('PUT', `/api/products/${id}`, body);
    else await api('POST', '/api/products', body);
    closeModal();
    showToast(id ? '已更新' : '已新增');
    await loadAdminProducts();
    await loadProducts();
  } catch (e) { showToast(e.message); }
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openModal() { document.getElementById('modal-overlay').classList.add('active'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }
document.getElementById('modal-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

// ─── TOAST & ALERT ────────────────────────────────────────────────────────────
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.textContent = msg;
  const container = document.getElementById('toast');
  if (container) container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showAlert(cid, msg, type) {
  const el = document.getElementById(cid);
  if (el) el.innerHTML = `<div class="alert alert-${type}">${esc(msg)}</div>`;
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function toggleFAQ(el) {
  const item = el.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Nav border on scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) nav.style.borderBottomColor = window.scrollY > 10 ? 'var(--border-strong)' : 'var(--border)';
}, { passive: true });
