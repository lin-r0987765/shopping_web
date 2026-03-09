# 系統更新日誌 (Update Log)


此檔案紀錄網站開發每次迭代過程中所完成的功能更新、UI/UX 美化與修復項目。

## 2026-03-10 使用者回報修復 (第二輪)
**[Gemini 2.5 Pro]**
- [修復] 限時閃購 (Flash Sale) 區塊在深色主題下文字不可見 — 容器背景改為固定色 `#1d1d1f`，深色主題自動反轉為淺底深字 (`#f5f5f7` 背景 + 黑色文字)。
- [移除] 首頁「極速部署 / 銀行級安全 / 數據驅動」3 卡片區塊 (`features-grid-section`)，依使用者要求刪除。
- [修復] 商品類別篩選器 (Category Pills) 無法正常運作 — 根本原因：隱藏的 `<select>` 元素只有一個 `<option>` (所有類別)，當 JS 嘗試設定 `select.value = 'Electronics'` 時因無對應選項而被瀏覽器忽略。修復方式：改為 `<input type="hidden">` 可存任意字串。

## 2026-03-10 Phase 10: Apple-Style Code Cleanup & Polish
**[Gemini 2.5 Pro]**
- [清理] 移除 Hero 區塊中已被 CSS 隱藏的 `<canvas>` 畫布與 3 顆浮動光球 (`hero-orb`) HTML 元素，減少 DOM 節點。
- [清理] 移除 Hero 內容多餘的 `z-index:2` 包裹 `<div>`，因為新的 Apple 風格設計不需要該層級管理。
- [清理] 移除重複的 `trust-marquee` 區塊（已有 `marquee-container` 提供相同功能）。
- [修復] 字體載入從 Inter + Outfit 改為僅載入 Inter，與 CSS 設計系統一致。
- [新增] `<html>` 加入 `scroll-behavior: smooth` 提供全站平滑捲動體驗。
- [新增] Marquee 輪播條兩側新增漸層淡出遮罩 (CSS pseudo-elements)，營造無縫滾動的視覺效果。
- [清理] 移除 CSS 中已無對應 HTML 的 `.hero-orb` display:none 規則。

## 2026-03-10 Hero 背景美術特效升級 (簡約時尚風格)
**[Gemini 2.5 Pro]**
- [更新] Hero 區塊背景新增三層視覺效果：(1) 多焦點漸變色光暈 (Gradient Mesh) 搭配 hue-rotate 動畫慢速色彩漂移、(2) 細緻顆粒紋理覆蓋層 (Grain Texture + mix-blend-mode: overlay)、(3) 三顆不同尺寸的浮動光球 (Floating Orbs) 各自以獨立的軌道動畫緩慢漂浮。
- [更新] 所有 Hero 文字內容包裹在 z-index:2 容器中，確保內容始終位於背景特效之上。
- [風格] 靈感來自 Linear、Vercel 等現代 SaaS 首頁的簡約時尚 (Minimalist Premium) 美學。

## 2026-03-10 使用者回報修復
**[Gemini 2.5 Pro]**
- [修復] 購物車抽屜新增優惠碼輸入欄位與「套用」按鈕，連接現有 `applyCoupon()` 功能。
- [移除] 移除自訂游標的藍色跟隨圓點 (Custom Cursor)，恢復為系統預設游標。
- [修復] 漸變色邊框動畫 (iridescent) 現在套用到所有商品卡片，而非僅前 3 張。
- [修復] 商品詳情頁移除突兀的「← 返回列表」按鈕，改由已有的麵包屑導航 (Breadcrumb) 提供返回路徑。

## 2026-03-10 Phase 9: Premium Polish & Launch-Ready Features
**[Gemini 2.5 Pro]**
- [新增] Hero 區塊數據卡片升級為 IntersectionObserver 驅動的動態計數器 (easeOutExpo 動畫)，滾動至可見區域時自動觸發數字跳動。
- [新增] 首頁新增「為何選擇我們」4 欄玻璃擬物化特色卡片區塊 (Features Grid)，帶有懸停上浮動畫。
- [新增] 商品詳情頁頂部新增麵包屑導航 (Breadcrumb Navigation)，顯示 首頁 > 分類 > 商品名稱 路徑。
- [新增] 精選商品卡片 (前 3 張) 新增漸變色邊框動畫 (Gradient Border Shift)，懸停時顯示流動彩虹色邊框。
- [更新] 登入/註冊頁面全面重設為雙面板 (Split-Panel) 佈局：左側為品牌訊息面板 (漸層背景 + 信任清單)，右側為表單卡片。

## 2026-03-10 全域 Bug 修復 (Global Bug Fix Pass)
**[Gemini 2.5 Flash]** - 全面程式碼審查與 Bug 修復
- [修復] CSS 缺少 `--bg2` 與 `--text2` 變數別名，JS 大量內聯樣式使用這些變數造成顏色顯示異常，已補充定義。
- [修復] `navigate()` 被雙重包裝導致每次頁面切換額外延遲 600ms，已移除重複包裝層。
- [修復] 導覽列「採購車」按鈕原本呼叫 `navigate('cart')` 觸發頁面轉場動畫後再開啟抽屉，現改為直接呼叫 `openCartDrawer()` 避免不必要的動畫。
- [修復] 導覽按鈕文字「採購量」誤植，已更正為「🛒 採購車」語意更清晰。
- [修復] 搜尋建議框的 `onclick` 呼叫了不存在的 `navigate('product')`，導致轉場動畫後回跳首頁，已移除該呼叫。

## 2026-03-10 迭代 8 (Homepage Hero Upgrade & Footer Redesign)
**[Gemini 2.5 Flash]**
- [更新] Hero 區塊副標願升級為動態打字機特效 (Typewriter Animation)，循環展示商品類別關鍵詞。
- [更新] 全面重設網站頁尾 (Footer)，改用 4 欄 CSS Grid 排版，包含品牌區、導航連結、真實社群 SVG ICON，以及帶客認章誊的底部標認欄。
- [更新] 商品卡片新增動態星等評分與庫存進度条 (Stock Indicator Bar)。
- [新增] 「最近瀏覽 (Recently Viewed)」水平滾動軌道，自動追蹤并展示用戶最近瀏覽過的該品。

## 2026-03-10 迭代 7 (Premium Micro-Interactions)
**[Gemini 2.5 Flash]**
- [更新] 全局导航進度条 (Global Progress Bar)，在頁面切換時呈現流畅動態。
- [更新] 自訂滾動条 (Custom Scrollbar)。
- [更新] 商品詳情頁園格新增「信任徽章 (Trust Badges)」區塊 (100% 安全結帳、官方保固、15 天退貨)。
- [更新] 商品卡片新增鼠標追蹤的炮射点光敗 (Glare Effect)。
- [更新] 後台所有資料表格加入 Skeleton Loading 狀態載入中送占位符。

## 2024-03-xx 迭代 6 (Ultimate E-commerce UI)
**[Gemini 2.5 Pro]**
- [更新] 首頁新增動態倒數計時器 (Flash Sale Countdown) 促進轉換率。
- [更新] 首頁下方的客戶評價區塊升級為 3D 互動卡片 (3D Testimonials)。
- [更新] 商品詳情頁面新增「商品縮圖輪播 (Thumbnail Gallery)」與「可折疊手風琴選單 (Collapsible Accordions)」，提升版面整潔度。
- [更新] 後台管理系統 (Admin Dashboard) 數字統計卡片加入載入數字跳動特效 (CountUp Effect)。
- [更新] 後台資料表格套用玻璃擬物化懸停效果與固定表頭 (Sticky Headers)，增強大量數據的閱讀體驗。

## 2024-03-xx 迭代 5 (Pre-Launch Polish)
**[Gemini 2.5 Pro]**
- [更新] 在導覽列加入即時搜尋建議 (Live Search Dropdown) 的玻璃擬物化介面。
- [更新] 升級登入與註冊表單，採用現代化的「懸浮標籤 (Floating Labels)」與動態縮放效果。
- [更新] 改善手機版選單 (Mobile Menu) 體驗，加入交錯式的滑入淡出動畫 (Staggered Animations)。
- [修復] 整頓 CSS 檔案，修復因先重構遺失的部分類別（.modal, .auth-container, .footer-inner），修正頁尾與模態視窗的置中對齊問題。

## 2024-03-xx 迭代 4 (Dynamic Art & Premium UI)
**[Gemini 2.5 Pro]**
- [更新] 首頁 Hero 區塊加入動態網格背景 (Interactive Canvas) 與無限自動輪播的合作夥伴跑馬燈。
- [更新] 購物車加入「免運進度條 (Free Shipping Progress)」遊戲化元素。
- [更新] 商品詳情頁加入當滾動超過購買按鈕時出現的「懸浮加入購物車 (Sticky Add-to-Cart)」底列。
- [更新] 無縫的轉場動畫 (Page Transition) 與 Liquid 退出特效，提升沉浸感。
- [修復] CSS 全網使用 HSL 變數重構，完美支援深色/淺色模式。

## 2024-03-xx 迭代 3 (Frontend Refactoring)
**[Gemini 2.5 Pro]**
- [更新] 前端程式碼完全解耦，拆分成 `style.css`、`app.js` 與乾淨的 `index.html`。
- [更新] 移除首頁的冗餘 inline script，封裝各元件的初始化邏輯。

## 2024-03-xx 迭代 1-2 (Foundation & Backend)
**[Gemini]**
- [更新] 建立 Node.js (Express) + SQLite 後端 API (會員驗證、商品管理、訂單系統)。
- [更新] 建立 Admin Dashboard，支援 CRUD 商品與優惠券設定。
- [更新] 基礎 RWD 響應式網頁設計實作。
