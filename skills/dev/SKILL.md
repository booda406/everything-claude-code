---
name: dev
description: >
  Standard feature/bugfix flow: optional Notion task, feature branch from default branch,
  plan-then-implement, tests via project conventions, conventional commit, push and PR.
disable-model-invocation: true
---

# 功能開發標準流程 /dev

收到開發任務後，請依照以下流程逐步執行。每個步驟完成後再進行下一步，需要用戶確認時請先停下來詢問。

**輸入**：使用者在 `/dev` 後提供的**任務描述**（或對話中的明確開發請求）。

---

## Step 1：任務追蹤（Notion 或略過）

在正式動手前，先確保任務有可追溯紀錄（若團隊使用 Notion）。

- 若用戶已提供 **Notion task URL / page ID** → **略過建立**，直接 Step 2。
- 否則，**解析 Task 資料庫**（**勿**在公開模板寫死私人 `collection://`），依下列**優先序**擇一：
  1. 環境變數 **`NOTION_TASK_COLLECTION_URI`**（或專案文件約定之同名變數）
  2. 專案 **`CLAUDE.md`** / **`AGENTS.md`** / **`.cursor/rules/*.mdc`** 中明確記載的 Notion database／collection 識別（例：`collection://…`、database ID、或「Task DB 名稱 + workspace」）
  3. 用戶在對話中**當場提供** collection／database 識別
- 若 **notion MCP 不可用** 且無法建立分頁 → **詢問用戶**：要手動建 task 並貼 URL、或**略過** Step 1 僅用 git／PR 追蹤。

建立任務時，欄位名稱**以你們實際 Notion schema 為準**；下表為**建議對應**（可調整 property 名稱）：

| 概念 | 規則 |
|---|---|
| 標題 | 一句話、動詞開頭（例：「Add save_user_alias helper」） |
| 類型 | feat → Feature；fix → Bug；refactor → Refactor（emoji／選項依你們資料庫） |
| 優先級 | 依影響範圍：High / Medium / Low |
| 工作量 | Small / Medium / Large（時間區間由團隊定義） |
| 狀態 | In progress 或等同欄位 |
| 說明 | 症狀／需求、影響、方向 + 下方 Sub-tasks |

**Sub-tasks 框架**（寫入說明區）：

```
## Sub-tasks
- [ ] 閱讀相關程式碼
- [ ] 規劃實作方案（與用戶確認）
- [ ] 代碼實作
- [ ] 撰寫／更新測試
- [ ] 執行測試確認通過
- [ ] Commit & PR
```

完成後告知用戶 task URL（若有）。

**專案自訂**：可在 `CLAUDE.md` 註明固定 collection、欄位對照表，本步驟優先採信。

---

## Step 2：建立 Feature Branch

1. 解析**預設分支** `BASE`（勿硬編碼假設一定叫 `main`）：
   - `git remote show origin 2>/dev/null | sed -n '/HEAD branch/s/.*: //p'`
   - 若空，嘗試 `main`，再嘗試 `master`，或讀專案文件／問用戶。
2. 更新並分支：

```bash
git fetch origin
git checkout "$BASE"
git pull origin "$BASE"
git checkout -b <branch-name>
```

**Branch 命名**（kebab-case）：

- 新功能：`feature/<簡短描述>`
- Bug：`fix/<簡短描述>`
- 重構：`refactor/<簡短描述>`
- 文件：`docs/<簡短描述>`

**約定**：從遠端預設分支切出，**不要**從他人長命 feature branch 再切（除非用戶明示）。

確認目前在正確 branch 後告知用戶，再進入 Step 3。

---

## Step 3：閱讀程式碼，規劃實作方案

動手前先做功課：

- **定位相關檔案**：模組、測試、設定
- **依賴與邊界**：import、公開 API、既有錯誤處理與 log 慣例
- **資料與外部系統**：若專案使用 DB、Notion、HTTP API 等，對照**實際 schema／合約**（以程式與文件為準，勿臆測）
- **變更清單**：逐檔說明要做什麼、影響範圍

將規劃摘要給用戶確認，**取得確認後再寫程式**。

---

## Step 4：實作

依規劃修改，並遵守：

- **專案層規則優先**：`CLAUDE.md`、`.cursor/rules`、`AGENTS.md`、linter／formatter 設定
- **風格一致**：error handling、log、註解／docstring 與既有程式對齊
- **測試可測性**：優先 mock **邊界依賴**（HTTP、DB、外部 SDK），避免不當 patch 內部實作細節
- **專案特規**（若 `CLAUDE.md` 有寫才強制）：例如 Notion API 分頁（`has_more` / `start_cursor`）、idempotency、在地化數字解析等——**無則不強加**

---

## Step 5：撰寫／更新測試並執行

- 新邏輯：正常、邊界、失敗路徑
- 修改既有行為：回歸測試
- 與外部 API 互動：mock 邊界、覆蓋分頁／錯誤回應等**若專案存在此類程式**

**測試指令**（依序嘗試，**以專案為準**）：

1. `CLAUDE.md` / `AGENTS.md` / `CONTRIBUTING.md` 中的明確指令
2. `package.json` 的 `scripts.test`（或 `test:unit` 等）
3. `Makefile` 的 `test`／`check`
4. Python：`pytest`／`tox`（路徑與選項以 `pyproject.toml`、`pytest.ini`、專案慣例為準，**勿**假設一定是 `tests/unit/`）
5. 其他語言：對應專案標準指令（`cargo test`、`go test`、…）
6. 仍不確定 → **問用戶**一條常用指令

**通過準則**：專案約定之測試必須通過（含 coverage／門檻若 CI 或設定檔有定義）；**勿**在通用流程寫死百分比。

---

## Step 6：Commit

**Conventional Commits**，英文；可多行 body + bullets。

**`Co-authored-by`**：與 **`skills/commit/SKILL.md`** 第 4 步相同規則——**勿用** `Made-with:` 等非標準 trailer；Cursor 則 `Co-authored-by: Cursor (<模型顯示名稱>) <cursoragent@cursor.com>`（模型由當前助手自知填入；不確定則省略括號內）；Claude Code 單獨工作時可用官方建議的 Claude 地址。

```bash
git add <path> <path> ...   # 明確列出變更檔，避免誤加
git commit -m "..."         # 或 git commit -F message.txt
```

---

## Step 7：Push & 開 PR

```bash
git push -u origin <branch-name>
gh pr create --base <BASE> --title "..." --body "..."
```

`--base` 使用 Step 2 的 **`$BASE`**（若 CLI 可省略且預設正確則從簡）。

**PR body 建議結構**：

```markdown
## Summary
- 背景與動機（可連結 Notion task / issue）
- 核心變更（1～3 點）

## 變更檔案
| 檔案 | 說明 |
|---|---|
| ... | ... |

## Test plan
- [ ] 關鍵路徑／部署後驗證
- [ ] 自動測試已跑且通過
```

**選填頁尾**（擇一或並列，勿與 `Co-authored-by` 混淆）：

`Assisted with [Claude Code](https://claude.com/claude-code) · [Cursor](https://cursor.com)`

---

## Step 8：回報完成

告知用戶：

- PR URL
- 測試結果摘要
- Notion task 是否應改為 `In review`（若有）
- 部署或手動驗證待辦

> **PR 合併、階段收工後**：執行 **`/commit`**（或專案之收工流程）做 lessons learned、`CLAUDE.md`／`implementation-notes`、文件整理；與本流程「單一功能 PR 提交」互補。

---

## 設定備忘（給專案維護者）

在 **`CLAUDE.md`**（或 `AGENTS.md`）建議可寫：

- **Notion**：`NOTION_TASK_COLLECTION_URI=...` 或內嵌 collection／欄位對照
- **測試**：一行複製貼上即可的指令（含 integration／unit 若不同）
- **預設分支**：若非 `main`，註明遠端預設分支名稱
