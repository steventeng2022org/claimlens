# ClaimLens

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**繁體中文** | [English](README.en.md)

**查主張，看證據。**

ClaimLens 協助讀者檢視文字或文章網址中的說法，拆解可查證的主張、搜尋支持與矛盾來源，並提供附來源連結的證據報告。目前應用介面與生成報告使用繁體中文。

## 功能

- 支援文字與網址輸入，每次最多四項主張、每項最多四筆證據。
- 證據狀態包含支持、矛盾、脈絡不全、資訊過時、證據不足與主觀意見。
- 後端使用 OpenAI Responses API、網路搜尋與結構化 JSON 輸出。
- 內建虛構示範案例，不呼叫分析 API。
- 網址結果快取 24 小時；每個 IP 每日限 20 次，依 Asia/Taipei 日期計算，快取命中也計入額度。
- 瀏覽器 localStorage 保存最近 12 份報告。
- 管理台可檢視保存的報告及管理加密 API 金鑰。
- 支援 Cloudflare Access JWT 驗證及選用的代理簽章 IP 轉送。

報告與分數是自動化閱讀輔助，不是真偽保證。請查閱原始來源。示範來源為介面示意，不是真實引文。

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `dist/client/` | 目前靜態前端：HTML、CSS 與可讀 JavaScript |
| `server/` | Worker、管理 API、驗證與 IP 處理 |
| `dist/server/` | 已追蹤的 Worker 模組副本 |
| `dist/index.html`、`dist/app.js`、`dist/styles.css` | 較早的前端快照 |
| `db/schema.ts` | Drizzle schema |
| `drizzle/` | SQL migration 與 schema metadata |
| `cloudflare-proxy/worker.js` | 可選的反向代理及 IP 簽章轉送 |
| `.openai/hosting.json` | 既有託管專案 metadata，並非可攜部署設定 |

此 repository 包含部署快照與可讀的執行模組，目前沒有 package.json、lockfile、自動測試或原始前端建置流程，不能假設可直接使用 npm install / npm run build。

## 本地預覽

安裝 Python 3 後，在根目錄執行：

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory dist/client
```

Windows 可改用 `py`。開啟 [http://localhost:8000](http://localhost:8000)，載入示範案例再開始分析。內建範例完全在瀏覽器執行；其他輸入需要 `/api/analyze` 後端，靜態預覽無法處理。字型可用時會從 Google Fonts 載入。

## 後端部署需求

後端是匯出 `fetch(request, env)` 的 module Worker，需要 Workers 相容環境與綁定為 `DB` 的 D1 資料庫，不是 Node.js HTTP server。

獨立部署需自行提供 Wrangler 設定、指向 `dist/client/` 的 `ASSETS` 靜態資源綁定、D1、secret 與驗證設定，並將 `/api/*`、`/admin` 路由交給 Worker。

新資料庫依序套用：

1. `drizzle/0000_sweet_post.sql`
2. `drizzle/0001_abnormal_marvel_zombies.sql`

這些 migration 建立額度、快取、報告與加密金鑰資料表，不可直接對既有資料庫重複執行。目前模型在 `server/index.js` 設為 `gpt-5.6-luna`，可用性取決於部署帳號。修改後端時需同步實際部署的副本。

平台設定參考官方 [Wrangler 文件](https://developers.cloudflare.com/workers/wrangler/configuration/) 與 [D1 指令](https://developers.cloudflare.com/d1/wrangler-commands/)。Fork 不會自動取得既有託管專案。

### 環境綁定

| 名稱 | 用途 |
| --- | --- |
| `DB` | D1 資料庫 |
| `ASSETS` | 靜態前端資源 |
| `OPENAI_API_KEY` | 後端環境的預設分析金鑰 |
| `ADMIN_ENCRYPTION_KEY` | Base64url 編碼的 32-byte AES-GCM 金鑰 |
| `CF_ACCESS_TEAM_DOMAIN` | Access issuer origin，例如 https://your-team.cloudflareaccess.com |
| `CF_ACCESS_AUD` | Access application audience |
| `CF_ACCESS_ADMIN_EMAIL` | 允許的管理員 email |
| `PUBLIC_ORIGIN` | Access 模式下管理寫入請求的公開 origin |
| `ADMIN_OWNER_ID` | 託管平台的替代身分，需可信平台提供 oai-authenticated-user-id |
| `PROXY_SHARED_SECRET` | 代理與後端共用的 IP 簽章 secret |

真實金鑰只放 secret store 或已忽略的本地環境檔，不放入前端、網址、文件或 Git。獨立部署優先採用經驗證的 Cloudflare Access；一般公開 server 若直接信任用戶提供的身分 header，不能證明管理員身分。

代理中的 upstream 目前寫死於 `cloudflare-proxy/worker.js`，fork 應改成自己的後端，兩端設定相同代理 secret。

## API

| 端點 | 用途 |
| --- | --- |
| `POST /api/analyze` | JSON：`{"input":"文字或網址"}`，至少八個字元 |
| `GET /api/health` | 服務狀態、環境金鑰與 DB 是否存在 |
| `GET /admin` | 管理台 |
| `GET /api/admin/reports` | 分頁報告列表 |
| `GET /api/admin/reports/{id}` | 報告詳情 |
| `DELETE /api/admin/reports/{id}` | 刪除報告 |
| `GET /api/admin/keys` | 金鑰 metadata，不含明文 |
| `POST /api/admin/keys` | 加密保存金鑰 |
| `POST /api/admin/keys/{id}/activate` | 啟用金鑰，default 代表環境金鑰 |
| `DELETE /api/admin/keys/{id}` | 刪除管理台新增的金鑰 |

管理路由需要授權，非 GET 請求另需符合 Origin 檢查。D1 中啟用的加密金鑰優先於環境金鑰；health 的 configured 只檢查環境金鑰。

## 資料處理與限制

- 正式分析將輸入傳送給 OpenAI 並使用網路搜尋，提交機密內容前請考量資料流向。
- 網址快取保存正規化網址與報告 JSON，報告可能含有提交的主張及證據摘要。
- 管理列表排除超過 30 天的報告，實體清除在下一次保存報告時執行。
- 額度資料保存 IP 的 SHA-256 雜湊與每日次數，雜湊是持續性識別碼，不代表完全匿名。
- 本機歷史與主題設定放在 localStorage；複製的報告連結使用本機歷史 ID，不是跨裝置公開報告。
- 引用網址會與搜尋回應比對，但不保證內容正確或完整。
- 分數是固定權重平均：支持 100、脈絡不全 35、過時 25、不足 20、矛盾 0，主觀意見不計分；不是經校準的真實機率。
- 目前未提供自動測試與可重現的 dependency lockfile。

## 參與貢獻

歡迎回報問題、改善文件與提交 PR，詳見 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權

原創程式碼與文件採用 [MIT License](LICENSE)，© 2026 steventeng2022。散布時保留版權與授權聲明。

第三方套件、字型、服務與連結證據維持各自授權與條款。MIT 不授予託管資料庫、API 帳號、生產 secret 或第三方文章及研究的使用權。
