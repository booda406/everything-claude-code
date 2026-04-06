# Everything Claude Code（ECC）— 子代理（Agent）指引

> **與上游的關係：** 根目錄 `[AGENTS.md](../../AGENTS.md)` 維持**完整、利於 merge 上游**的列表。  
> `**apply-ecc-prune` 安裝到 `~/.claude/` 時**，會複製的是裁剪版 `[overlays/AGENTS.md](../../overlays/AGENTS.md)`（由 `ecc-prune.json` → `copyIntoClaudeHome` 指定）。  
> 若要**加回**某類 agent：從 `ecc-prune.json` 的 `remove` 拿掉對應項，重新安裝並再跑 prune；必要時編輯 `overlays/AGENTS.md`。

**English 裁剪版（與本檔對齊）：** `[overlays/AGENTS.md](../../overlays/AGENTS.md)`

本說明對齊**裁剪後**情境：**29** 個專職子代理（`ecc-prune` 後與保留的 `agents/*.md` 一致）、**156** 項技能、**72** 條指令與 Hook 流程。

**版本：** 1.9.0

## 核心原則

1. **Agent 優先** — 領域任務交給對應的專職子代理。
2. **測試驅動** — 先寫測試再實作，覆蓋率要求 **80%+**。
3. **安全優先** — 安全不讓步；所有輸入皆需驗證。
4. **不可變性** — 建立新物件，不就地修改既有物件。
5. **先規劃再動手** — 複雜功能先規劃再寫程式。

## 可用子代理（Agents）


| Agent                  | 用途                           | 何時使用            |
| ---------------------- | ---------------------------- | --------------- |
| planner                | 實作規劃                         | 複雜功能、重構         |
| architect              | 系統設計與擴充性                     | 架構決策            |
| tdd-guide              | 測試驅動開發                       | 新功能、修 bug       |
| code-reviewer          | 程式品質與可維護性                    | 寫完或改完程式後        |
| security-reviewer      | 弱點偵測                         | 提交前、敏感程式碼       |
| build-error-resolver   | 修正建置／型別錯誤                    | 建置失敗時           |
| e2e-runner             | 端對端 Playwright 測試            | 關鍵使用者流程         |
| refactor-cleaner       | 無用程式清理                       | 維護程式庫           |
| doc-updater            | 文件與 codemap                  | 更新文件時           |
| docs-lookup            | 透過 Context7 查文件              | API／文件問題        |
| go-reviewer            | Go code review               | Go 專案           |
| go-build-resolver      | Go 建置錯誤                      | Go 建置失敗         |
| database-reviewer      | PostgreSQL／Supabase          | Schema、查詢最佳化    |
| python-reviewer        | Python code review           | Python 專案       |
| loop-operator          | 自主迴圈執行                       | 安全跑迴圈、監控卡住、介入   |
| harness-optimizer      | Harness 設定調校                 | 可靠度、成本、吞吐量      |
| rust-reviewer          | Rust code review             | Rust 專案         |
| rust-build-resolver    | Rust 建置錯誤                    | Rust 建置失敗       |
| pytorch-build-resolver | PyTorch 執行期／CUDA／訓練錯誤        | PyTorch 建置／訓練失敗 |
| typescript-reviewer    | TypeScript／JavaScript review | TS／JS 專案        |


## 子代理編排（何時主動用）

不必等使用者逐句提醒，應主動委派：

- 複雜功能需求 → **planner**
- 剛寫完或改完程式 → **code-reviewer**
- 修 bug 或新功能 → **tdd-guide**
- 架構決策 → **architect**
- 安全敏感程式 → **security-reviewer**
- 自主迴圈／迴圈監控 → **loop-operator**
- Harness 可靠度與成本 → **harness-optimizer**

彼此獨立的工作可**平行**執行——可同時啟用多個子代理。

## 安全守則

**每次 commit 前：**

- 不可寫死密鑰（API key、密碼、token）
- 所有使用者輸入須驗證
- 防 SQL 注入（參數化查詢）
- 防 XSS（HTML 適當清理）
- 啟用 CSRF 防護
- 驗證認證／授權
- 端點皆應有速率限制
- 錯誤訊息不得洩漏敏感資料

**密鑰管理：** 絕不寫死在程式裡。使用環境變數或密鑰管理服務。啟動時驗證必要密鑰。外洩密鑰須**立即輪換**。

**若發現安全問題：** **停止** → 使用 **security-reviewer** → 先修 **CRITICAL** → 輪換外洩密鑰 → 全庫檢查類似問題。

## 程式風格

**不可變性（關鍵）：** 一律建立新物件，不就地修改；變更以新副本回傳。

**檔案結構：** 寧可多檔、少巨檔。單檔約 **200–400** 行為常態，**800** 行上限。依功能／領域分組，勿只依「類型」分層。高內聚、低耦合。

**錯誤處理：** 每一層都要處理。面向 UI 給可讀訊息；伺服器端記錄完整脈絡。勿默默吞錯。

**輸入驗證：** 在系統邊界驗證。能用的話用 schema 驗證。快速失敗、訊息清楚。勿信任外部資料。

**品質核對：**

- 函式宜短（50 行），檔案聚焦（800 行）
- 避免過深巢狀（4 層）
- 錯誤處理到位，避免魔術數字／硬編碼
- 命名清楚可讀

## 測試要求

**最低覆蓋率：80%**

測試類型（皆需要）：

1. **單元測試** — 函式、工具、元件
2. **整合測試** — API、資料庫操作
3. **E2E 測試** — 關鍵使用者流程

**TDD 流程（必須）：**

1. 先寫測試（**RED**）— 測試應**失敗**
2. 寫最少實作（**GREEN**）— 測試應**通過**
3. 重構（**IMPROVE**）— 確認覆蓋率 80%+

排查失敗：檢查測試隔離 → 確認 mock → 修實作（除非測試本身錯了）。

## 開發流程

1. **Plan** — 使用 **planner**，釐清相依與風險，分段進行。
2. **TDD** — 使用 **tdd-guide**，先測試、再實作、再重構。
3. **Review** — 寫完即用 **code-reviewer**，處理 **CRITICAL**／**HIGH**。
4. **知識放對地方**
  - 個人除錯筆記、偏好、短期脈絡 → 自動記憶
  - 團隊／專案知識（架構決策、API 變更、runbook）→ 專案既有文件結構
  - 若本次任務已在文件或註解寫明，勿到處重複同一段
  - 若沒有合適文件位置，新建**頂層檔案**前請先問
5. **Commit** — Conventional Commits，PR 摘要完整。

## 工作流程表面政策（Workflow Surface）

- `**skills/`** 是**正式**的工作流程載體。
- 新的工作流程貢獻應**先**進 `skills/`。
- `**commands/`** 是舊版 slash 的**相容層**；僅在遷移或跨 harness 仍須 shim 時才新增或更新。

## Git 流程

**Commit 格式：** `<type>: <description>` — 類型：`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**PR：** 檢視**完整** commit 歷史 → 撰寫完整摘要 → 附測試計畫 → 新分支推送使用 `-u`。

## 架構模式

**API 回應：** 一致的外層格式：成功與否、資料本體、錯誤訊息、分頁後設資料。

**Repository 模式：** 資料存取包在標準介面後（findAll、findById、create、update、delete）。業務邏輯依賴抽象介面，不依賴具體儲存。

**骨架專案：** 找經戰場驗證的樣板，用平行子代理評估（安全、可擴充、是否適用），clone 最佳選項，在既有結構內迭代。

## 效能與脈絡

**脈絡管理：** 大型重構、多檔功能儘量避免塞滿視窗**最後 20%**。小改文件、單點修正可容忍較高脈絡使用率。

**建置排查：** **build-error-resolver** → 分析錯誤 → 小步修正 → 每步驗證。

## 專案結構

```
agents/          — 29 個專職子代理（本 fork 經 ecc-prune 後）
skills/          — 156 個工作流程技能與領域知識
commands/        — 72 個斜線指令
hooks/           — 事件驅動自動化
rules/           — 一律遵守的指引（通用 + 各語言）
scripts/         — 跨平台 Node 工具
mcp-configs/     — 14 組 MCP 伺服器設定
tests/           — 測試套件
```

`commands/` 仍保留在倉庫以相容，長期方向是 **以 skills 為主**。

## 成功指標

- 測試全過，覆蓋率 80%+
- 無明顯安全漏洞
- 程式可讀、可維護
- 效能可接受
- 滿足使用者需求

