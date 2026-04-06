---
description: TDD 開發流程：任務追蹤記錄循環、安全開 branch（BASE／遠端）、PR 前檢查、建議 /code-review、commit、push／PR。觸發：幫我實作、修 bug、implement、新增功能等。
argument-hint: 任務描述（可附 Notion／GitHub issue URL；已開 PR 可附 PR 號供審查）
---

# /dev

執行與 Claude Code **`/dev` skill** 相同之**功能開發標準流程**（**TDD**、**測試必須**、**PR 前檢查**、**與 `/code-review` 搭配**）。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/dev/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-dev-skill.sh`。）

1. **`skills/dev/SKILL.md`**（workspace 根目錄相對路徑）

2. **`.cursor/skills/dev/SKILL.md`** — 若專案由 ECC 安裝且含 `skills/dev`。

3. **`~/.claude/skills/dev/SKILL.md`** — 非 ECC 根開啟時；若 (1)(2) 不存在則讀此檔。（由 `sync-dev-skill.sh` 同步。）

讀到後，依該檔 **Step 1 → 8** 與 **Step 5b** 執行。

## 使用者輸入

將 **`/dev` 之後的文字**視為任務描述；可含 **issue／task URL**、**補充規格**。若流程已到審查階段，參數可含 **PR 號或 URL** 供轉交 **`/code-review`**。

## 與其他指令之分流

- **`/dev`**：開發主線（追蹤 → branch → 規劃 → TDD → **PR 前檢查** → 建議 **`/code-review`** → commit → push／PR）。
- **`/code-review`**：**單一**變更或 **單一 PR** 深度審查＋驗證（無參數＝本地未推送 diff；有 PR 號／URL＝PR 模式）。詳見 `commands/code-review.md`。
- **`/review`**：**守門／多 PR 掃描**等流程（見 `skills/review/SKILL.md`），**不**取代 `/code-review` 的單 PR 深度管線。
- **`/prp-commit`**：僅需快速 commit、自然語言選檔。
- **`/commit`**：收工與 lessons learned／文件整理（見 `skills/commit/SKILL.md`）。

## 專案設定建議

- **任務追蹤**：`CLAUDE.md` 或 `docs/context/dev-tracking.md` 的 **`/dev 任務追蹤`**；GitHub issue 模式請在專案內約定 **labels／repo**。
- **BASE／GitFlow**：明文寫 **feature 從哪條分支切**（例 `develop`）。
- **PR 前必跑**：在 `CLAUDE.md` 列出與 CI 一致的 **lint／typecheck／test** 指令。
- **`git_remote`**：非 `origin` 時明寫。
