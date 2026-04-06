---
description: 功能開發／Bug 修復標準流程：可選 Notion、開 branch、規劃後實作、測試、commit、PR。觸發：幫我實作、修 bug、implement、新增功能等。
argument-hint: 任務描述（可直接描述功能或貼上問題說明）
---

# /dev

執行與 Claude Code **`/dev` skill** 相同之**功能開發標準流程**。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/dev/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-dev-skill.sh`。）

1. **`skills/dev/SKILL.md`**（workspace 根目錄相對路徑）

2. **`.cursor/skills/dev/SKILL.md`** — 若專案由 ECC 安裝且含 `skills/dev`。

3. **`~/.claude/skills/dev/SKILL.md`** — 非 ECC 根開啟時；若 (1)(2) 不存在則讀此檔。（由 `sync-dev-skill.sh` 同步。）

讀到後，依該檔 **Step 1 → 8** 執行。

## 使用者輸入

將 **`/dev` 之後的文字**視為任務描述；若訊息中已含完整需求，一併納入。

## 與其他指令之分流

- **`/dev`**：單一功能／修 bug，從追蹤→branch→實作→測試→**精準 stage 的 commit**→PR。
- **`/prp-commit`**：僅需快速 commit、自然語言選檔時使用。
- **`/commit`**：PR 合併或**收工**時，做 lessons learned、文件與較完整的歷程整理（見 `skills/commit/SKILL.md`）。

## 專案設定建議

Notion 資料庫、測試指令、預設分支等**勿寫死在 skill**；請在專案 **`CLAUDE.md`**／**`AGENTS.md`** 註明，或設定 **`NOTION_TASK_COLLECTION_URI`**，以便 Step 1／5 自動解析。
