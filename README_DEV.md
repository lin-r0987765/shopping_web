# 📦 Premium Sourcing — 企業採購電商平台

> 全端電商系統：Node.js / Express 後端 + 純 HTML/CSS/JS 前端，Apple 風格 UI 設計。

---

## 目錄

- [專案架構](#專案架構)
- [技術棧](#技術棧)
- [檔案結構與說明](#檔案結構與說明)
- [安裝與啟動](#安裝與啟動)
- [執行流程](#執行流程)
- [資料庫結構](#資料庫結構)
- [API 路由總覽](#api-路由總覽)
- [前端頁面與路由](#前端頁面與路由)
- [功能說明](#功能說明)
- [預設帳號](#預設帳號)
- [部署注意事項](#部署注意事項)

---

## 專案架構

```
購物網站/
├── server.js          # Express 伺服器 (所有 API 路由)
├── database.js        # SQLite 資料庫初始化 + 種子資料
├── package.json       # Node.js 依賴與設定
├── shop.db            # SQLite 資料庫檔案 (自動產生)
├── update.md          # 開發更新日誌
├── README_DEV.md      # 本文件 — 專案技術文檔
├── scripts/
│   └── admin_bootstrap.js  # 管理員帳號初始化腳本
└── public/                 # 靜態前端檔案 (由 Express 託管)
    ├── index.html          # SPA 主頁面 (所有頁面區塊)
    ├── css/
    │   └── style.css       # Apple 風格 CSS 設計系統
    └── js/
        └── app.js          # 前端邏輯 (路由/渲染/API 呼叫)
```

---

## 技術棧

| 層級 | 技術 | 說明 |
|------|------|------|
| **後端框架** | Express 5 | RESTful API 伺服器 |
| **資料庫** | SQLite via `better-sqlite3` | 嵌入式 SQL 資料庫，WAL 模式 |
| **認證** | JWT (`jsonwebtoken`) | Bearer Token 驗證 |
| **密碼** | `bcryptjs` | 密碼雜湊 (10 rounds) |
| **安全** | `helmet`, `express-rate-limit` | HTTP 安全標頭、限速 |
| **Session** | `express-session` | 伺服器端 Session |
| **前端** | 原生 HTML + CSS + JavaScript | 無框架 SPA |
| **字體** | Google Fonts — Inter | Apple 風格字型 |

---

## 檔案結構與說明

### 後端

| 檔案 | 行數 | 說明 |
|------|------|------|
| `server.js` | ~573 行 | 主伺服器，包含全部 API 路由（認證、商品、訂單、購物車、收藏、優惠券、管理員）、中間件（JWT 驗證、管理員權限、限速）|
| `database.js` | ~126 行 | 建立 SQLite 連線、定義 8 張資料表、種子管理員帳號與 5 筆範例商品 |
| `package.json` | 設定檔 | 定義依賴項：express, better-sqlite3, bcryptjs, jsonwebtoken, cors, helmet 等 |

### 前端

| 檔案 | 行數 | 說明 |
|------|------|------|
| `public/index.html` | ~610 行 | 單頁應用 (SPA) 主結構：所有頁面區塊以 `<section>` 存在，透過 JS 切換顯示/隱藏 |
| `public/css/style.css` | ~1500 行 | 完整 CSS 設計系統：CSS 變數、明/暗主題、RWD、動畫、所有元件樣式 |
| `public/js/app.js` | ~1088 行 | 前端邏輯：SPA 路由、API 串接、商品渲染、購物車、認證、管理後台 |

---

## 安裝與啟動

```bash
# 1. 安裝依賴
npm install

# 2. 啟動伺服器
node server.js

# 伺服器啟動於 http://localhost:3000
```

> **注意**：首次啟動時，`database.js` 會自動建立 `shop.db` 並寫入管理員帳號與 5 筆範例商品。

---

## 執行流程

### 啟動流程

```
node server.js
    │
    ├── 1. 載入 database.js
    │      ├── 開啟 / 建立 shop.db (SQLite)
    │      ├── 啟用 WAL 模式 + 外鍵約束
    │      ├── 建立 8 張資料表 (IF NOT EXISTS)
    │      ├── 種子管理員帳號 (admin@shop.com / admin123)
    │      └── 種子 5 筆範例商品 (僅首次)
    │
    ├── 2. 設定 Express 中間件
    │      ├── CORS 跨域
    │      ├── express.json() 解析
    │      ├── express-session
    │      ├── express-rate-limit (100 req / 15min)
    │      └── express.static('public/')
    │
    ├── 3. 註冊所有 API 路由 (/api/*)
    │
    └── 4. 監聽 0.0.0.0:3000
```

### 頁面載入流程 (前端)

```
使用者訪問 http://localhost:3000
    │
    ├── 1. Express 回傳 public/index.html
    │
    ├── 2. 瀏覽器載入 css/style.css + js/app.js
    │
    ├── 3. DOMContentLoaded 事件觸發
    │      ├── 恢復 Dark Mode (localStorage)
    │      ├── 恢復登入狀態 (localStorage token/user)
    │      ├── 更新導覽列 (updateNav)
    │      ├── 處理 hash 路由 (handleRoute)
    │      ├── 載入商品列表 (loadProducts → GET /api/products)
    │      ├── 渲染商品卡片 (renderProducts)
    │      ├── 渲染類別篩選鈕 (renderCategoryPills)
    │      ├── 初始化：捲軸進度條、閃購倒數、打字機動畫、計數器
    │      └── 隱藏 Preloader
    │
    └── 4. 使用者互動 → JS 處理 → API 呼叫 → 畫面更新
```

### SPA 路由機制

```
navigate('products')
    │
    ├── window.location.hash = '#products'
    ├── hashchange 事件 → handleRoute()
    │      ├── 隱藏所有 .page 區塊
    │      ├── 顯示 #page-products
    │      └── 依頁面載入資料 (loadProducts/loadDashboard/loadAdmin)
    └── fadeUp 進場動畫
```

---

## 資料庫結構

```sql
-- 使用者
users (id, name, email, password, role, created_at)

-- 商品
products (id, name, description, price, image, category, stock, created_at)

-- 訂單
orders (id, user_id, total, status, created_at)

-- 訂單明細
order_items (id, order_id, product_id, quantity, price)

-- 購物車 (伺服器端)
cart_items (id, user_id, product_id, quantity)  -- UNIQUE(user_id, product_id)

-- 商品評論
reviews (id, product_id, user_id, rating, comment, created_at)  -- UNIQUE(product_id, user_id)

-- 收藏清單
wishlist (id, user_id, product_id, created_at)  -- UNIQUE(user_id, product_id)

-- 優惠券
coupons (id, code, discount_percent, valid_until, created_at)

-- 管理操作記錄
activity_log (id, admin_id, action, details, created_at)
```

---

## API 路由總覽

### 認證 (Auth)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/auth/register` | — | 註冊新用戶 |
| POST | `/api/auth/login` | — | 登入取得 JWT |
| POST | `/api/auth/forgot-password` | — | 取得密碼重設 Token |
| POST | `/api/auth/reset-password` | — | 使用 Token 重設密碼 |
| GET | `/api/auth/me` | ✅ JWT | 取得當前使用者資訊 |
| PUT | `/api/auth/profile` | ✅ JWT | 更新個人資料 |

### 商品 (Products)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/products` | — | 商品列表 (支援 search/category/page/limit) |
| GET | `/api/products/:id` | — | 單一商品詳情 |
| POST | `/api/products` | ✅ Admin | 新增商品 |
| PUT | `/api/products/:id` | ✅ Admin | 更新商品 |
| DELETE | `/api/products/:id` | ✅ Admin | 刪除商品 (含串聯刪除) |

### 類別

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/categories` | — | 取得所有商品類別 |

### 評論 (Reviews)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/products/:id/reviews` | — | 商品評論列表 + 平均分 |
| POST | `/api/products/:id/reviews` | ✅ JWT | 新增評論 (1-5 星) |
| DELETE | `/api/reviews/:id` | ✅ JWT | 刪除自己的評論 |

### 訂單 (Orders)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/orders` | ✅ JWT | 建立訂單 (扣庫存) |
| GET | `/api/orders` | ✅ JWT | 我的訂單列表 |
| GET | `/api/orders/:id` | ✅ JWT | 訂單詳情 |
| POST | `/api/orders/:id/cancel` | ✅ JWT | 取消訂單 (回補庫存) |

### 購物車 (Cart)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/cart` | ✅ JWT | 取得購物車 |
| POST | `/api/cart` | ✅ JWT | 加入購物車 |
| PUT | `/api/cart` | ✅ JWT | 更新數量 |
| DELETE | `/api/cart/:productId` | ✅ JWT | 移除商品 |

### 收藏 (Wishlist)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/wishlist` | ✅ JWT | 收藏列表 |
| POST | `/api/wishlist` | ✅ JWT | 加入收藏 |
| DELETE | `/api/wishlist/:productId` | ✅ JWT | 移除收藏 |

### 優惠券 (Coupons)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/coupons/validate?code=XXX` | — | 驗證優惠碼 |
| POST | `/api/coupons` | ✅ Admin | 建立優惠券 |
| GET | `/api/admin/coupons` | ✅ Admin | 優惠券列表 |
| PUT | `/api/admin/coupons/:id` | ✅ Admin | 更新優惠券 |
| DELETE | `/api/admin/coupons/:id` | ✅ Admin | 刪除優惠券 |

### 管理員 (Admin)

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/admin/stats` | ✅ Admin | 概覽統計 (用戶/訂單/營收/商品) |
| GET | `/api/admin/orders` | ✅ Admin | 全部訂單管理 |
| PUT | `/api/admin/orders/:id/status` | ✅ Admin | 更新訂單狀態 |
| GET | `/api/admin/users` | ✅ Admin | 使用者清單 |
| GET | `/api/admin/activity-log` | ✅ Admin | 操作記錄 |

---

## 前端頁面與路由

前端使用 hash-based SPA 路由 (`#hash` → `navigate('hash')`)。

| Hash | 頁面 ID | 說明 |
|------|---------|------|
| `#products` | `page-products` | 首頁：Hero、Marquee、商品列表、篩選、搜尋 |
| `#product` | `page-product` | 商品詳情：圖片、評論、相關商品 |
| `#cart` | `page-cart` | 購物車清單頁 |
| `#login` | `page-login` | 登入 (雙面板佈局) |
| `#register` | `page-register` | 註冊 (雙面板佈局) |
| `#forgot-password` | `page-forgot-password` | 忘記密碼 |
| `#dashboard` | `page-dashboard` | 使用者後台 (訂單紀錄) |
| `#admin` | `page-admin` | 管理員後台 (CRUD 全功能) |

---

## 功能說明

### 首頁 (Homepage)
- Hero 區塊：打字機文字動畫、統計數據計數器 (IntersectionObserver)
- 品牌 Marquee 輪播條 (漸層淡出邊緣)
- 為何選擇我們 — 4 卡片特色區塊
- 限時閃購倒數計時器
- 商品類別 Pill 篩選 + 即時搜尋 + 排序
- 最近瀏覽橫向捲軸
- 客戶評價旋轉木馬
- FAQ 手風琴
- CTA 行動呼籲區塊

### 商品功能
- 商品卡片：圖片、類別標籤、價格、庫存指示、收藏、加入購物車
- 商品詳情：大圖、數量選擇、規格、評論系統 (1-5 星)
- 收藏清單 (localStorage + API)

### 購物體驗
- 側滑式購物車抽屜 (Cart Drawer)
- 免運費進度條 (>$500 免運)
- 優惠碼輸入與套用
- 訂單建立 (自動扣庫存)
- 訂單取消 (自動回補庫存)

### 管理後台
- 儀表板統計 (用戶/訂單/營收/商品)
- 商品 CRUD (新增/編輯/刪除)
- 訂單狀態管理 (pending → processing → shipped → delivered)
- 使用者清單
- 優惠券管理
- 操作記錄 (Activity Log)

### UI/UX 特色
- 明/暗主題切換 (localStorage 持久化)
- Apple 風格設計系統 (Inter 字體、圓角、微動畫)
- 全站平滑捲動 (scroll-behavior: smooth)
- 捲軸進度條
- 回到頂部按鈕
- 響應式設計 (RWD)
- Skeleton Loading 骨架屏
- Toast 通知系統

---

## 預設帳號

| 角色 | 電子郵件 | 密碼 |
|------|---------|------|
| 管理員 | `admin@shop.com` | `admin123` |

> 一般使用者可透過註冊頁面建立帳號。

---

## 部署注意事項

1. **JWT Secret** — `server.js` 中的 `JWT_SECRET` 應改為環境變數
2. **Session Secret** — 同理，改為環境變數
3. **Rate Limit** — 預設 100 req / 15 min，依部署環境調整
4. **SQLite** — 適合中小型應用；大型生產環境建議遷移至 PostgreSQL / MySQL
5. **HTTPS** — 部署時需啟用 HTTPS (反向代理如 Nginx)
6. **Helmet** — 目前因內聯腳本停用，部署時應啟用並設定 CSP
7. **圖片** — 商品圖片使用 Unsplash 外部 URL，生產環境建議使用 CDN 或本地存儲
