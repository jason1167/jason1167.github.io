# 記帳 App（本機優先 / PWA）

快速記錄花費項目、金額、日期時間、分類、備註。資料只存在瀏覽器本機
（IndexedDB），需要備份時手動匯出 JSON / CSV；日後要接上 iCloud 自動
同步時，可直接沿用匯出資料的格式。

---

## 1. 架構

```
┌─────────────────────────────┐
│  index.html + style.css      │  畫面（純 HTML/CSS，無框架）
├─────────────────────────────┤
│  js/app.js                   │  UI 邏輯、事件處理、渲染
│  js/export.js                │  匯出 JSON/CSV、匯入還原
│  js/db.js                    │  IndexedDB 存取層（資料模型）
├─────────────────────────────┤
│  IndexedDB（瀏覽器本機資料庫）│  唯一的資料儲存位置
├─────────────────────────────┤
│  sw.js + manifest.json       │  PWA 離線快取、加入主畫面
└─────────────────────────────┘
```

資料流：表單送出 → `db.js` 寫入 IndexedDB → 重新讀出並渲染畫面。
全程不連網、不呼叫任何伺服器 API；匯出功能只是把 IndexedDB 內容包成
檔案，讓你自己存到 iCloud 雲端硬碟、Google Drive 或任何地方。

### 資料結構（IndexedDB）

**records（一筆消費紀錄）**

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | number | 自動編號 |
| amount | number | 金額 |
| categoryId | string | 對應 categories.id |
| occurredAt | string | ISO 時間，如 `2026-09-13T14:30:00` |
| memo | string | 備註（選填） |
| createdAt / updatedAt | string | 建立/修改時間，供未來同步比對用 |

**categories（分類）**

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | string | 分類代碼 |
| name | string | 顯示名稱 |
| icon | string | emoji 圖示 |
| order | number | 排序 |
| isDefault | boolean | 是否為預設分類 |

預設分類：餐飲、交通、購物、娛樂、居家、醫療、教育、其他（可在 App 內新增/刪除）。

---

## 2. 檔案結構

```
expense-tracker/
├── index.html
├── manifest.json          PWA 設定
├── sw.js                  Service Worker（離線快取）
├── css/style.css
├── js/
│   ├── db.js               IndexedDB 存取層
│   ├── export.js           匯出/匯入
│   └── app.js               UI 邏輯
└── icons/
    ├── icon-192.png / icon-512.png
    └── icon-192-maskable.png / icon-512-maskable.png
```

---

## 3. 功能清單

- **快速記一筆**：金額（數字鍵盤）＋分類（單點選取）＋日期時間（預設當下，可調整）＋備註（選填）
- **本月摘要**：本月總支出、可左右切換月份查看歷史月份
- **明細列表**：依日期分組，顯示每日小計，點任一筆可編輯/刪除
- **分類管理**：新增/刪除分類（右上角選單圖示）
- **匯出備份**：
  - JSON（完整資料，用於還原）
  - CSV（可用 Excel / Numbers 開啟）
  - 【已驗證】在 iOS Safari 15 以上，匯出會優先跳出系統分享面板，
    你可以直接選「儲存到檔案」→「iCloud 雲端硬碟」，等於手動同步一次；
    若裝置不支援分享 API，會自動改用一般檔案下載。
- **從備份還原**：匯入先前匯出的 JSON 檔，可選「合併」或「清空後還原」
- **離線可用**：安裝到主畫面後，沒有網路也能開啟、記帳（資料本來就在本機）

---

## 4. 部署 SOP（讓 iPhone 能透過網址開啟）

App 全部是靜態檔案，放到任何 Web 主機都可以執行。**要注意兩件事：**

1. **必須用 HTTPS**：Service Worker（離線快取）與「加入主畫面」在 iOS
   Safari 上都要求網站是 HTTPS（或 `localhost`）。【已驗證】
2. **保持資料夾結構**：`index.html` 與 `css/`、`js/`、`icons/`、
   `manifest.json`、`sw.js` 的相對路徑不能變。

### 方案 A：GitHub Pages（免費、最簡單）

1. 建立一個新的 GitHub repository，把這個資料夾內容全部上傳（或 `git push`）
2. Repository → Settings → Pages → Source 選擇 `main` 分支 / root
3. 幾分鐘後會拿到一個 `https://<你的帳號>.github.io/<repo>/` 網址
4. 用 iPhone Safari 打開這個網址即可

### 方案 B：Netlify Drop（免費、免帳號也可）

1. 打開 https://app.netlify.com/drop
2. 直接把整個 `expense-tracker` 資料夾拖進網頁
3. 幾秒後會拿到一個 `https://xxxx.netlify.app` 網址

### 方案 C：自架（公司內部 IIS / Nginx 等）

- 依你目前熟悉的 IIS：建立一個網站，Physical Path 指向這個資料夾，
  綁定憑證（TLS），確認 MIME type 有正確對應 `.json`（IIS 預設通常已支援）
- 注意 `manifest.json` 需回傳 `application/manifest+json` 或
  `application/json`，多數伺服器預設 `.json` 設定即可正常運作

> 【推論】以你目前的技術背景（IIS、憑證管理都熟悉），方案 C 最容易整合進
> 現有內部網域；但若只是個人使用，方案 A/B setup 時間最短。

### 加入 iPhone 主畫面

1. Safari 開啟你部署好的網址
2. 點下方「分享」圖示 → 「加入主畫面」
3. 之後從主畫面圖示開啟，會是全螢幕、沒有網址列的體驗（PWA `standalone` 模式）

---

## 5. 使用說明

- **記一筆**：輸入金額 → 點選分類 → （需要的話調整日期/時間、加備註）→「記一筆」
- **編輯/刪除**：點列表中任一筆紀錄，會跳出編輯視窗，可修改或刪除
- **切換月份**：摘要區塊左右的 `‹` `›` 按鈕
- **管理分類**：右上角 ☰ 圖示 → 可刪除或新增（emoji + 名稱）
- **備份資料**：右上角 ⤓ 圖示 → 選擇匯出 JSON（完整備份）或 CSV（看報表用）
- **還原資料**：同一個匯出視窗內「從 JSON 備份檔還原」

**建議習慣**：偶爾（例如每週）匯出一次 JSON，存到「檔案」App 的 iCloud
雲端硬碟資料夾，避免手機清除瀏覽器資料或重灌時遺失紀錄。

---

## 6. 關於「同步到 iCloud」的後續規劃

目前版本先做「匯出/備份」，還沒有自動同步。之後若要做到按一個按鈕就同步
到 iCloud，實務上有兩條路，列出來給你評估：

| 方案 | 說明 | 優點 | 缺點 |
|---|---|---|---|
| CloudKit JS | Apple 官方提供的 Web SDK，可直接讀寫你 Apple 帳號的 iCloud 私有資料庫 | 真正的自動雲端同步、多裝置即時共用 | 需要付費 Apple Developer 帳號、需在 Apple 後台設定 Container/Schema、網頁需掛在你註冊的網域下、【未驗證】目前 CloudKit JS 對純 PWA（非透過 Apple 帳號登入流程）的使用者授權流程仍需要另外測試 |
| iCloud Drive 檔案同步 | 沿用現在的 JSON 匯出，但改成「另存」到 Files App 指定的 iCloud Drive 資料夾，或用 iOS 捷徑（Shortcuts）自動化 | 不需要 Apple Developer 帳號、實作快 | 不是即時同步，需要手動或靠捷徑排程觸發；多裝置同時寫入時沒有衝突處理機制 |

`js/export.js` 裡的 `buildBackupPayload()` 已經把資料整理成單一 JSON
物件，未來不管走哪個方案，都可以直接把這個物件當作上傳/寫入的內容，
不需要重新設計資料格式。

---

## 7. 已知限制

- 目前分類刪除不會連動更新已使用該分類的舊紀錄（紀錄會保留原本的
  `categoryId`，只是清單裡找不到對應名稱時退回顯示代碼），若要嚴謹處理
  刪除前的資料遷移，需要再加一支「分類合併/轉移」的功能，目前版本未實作。
- 清除 Safari 瀏覽器資料（設定 → Safari → 清除瀏覽記錄）會連 IndexedDB
  一起清掉，這也是為什麼需要定期手動匯出備份。
- 目前沒有密碼鎖或 Face ID 驗證；如果需要，可以再加一層簡單的
  WebAuthn 或畫面鎖定。
