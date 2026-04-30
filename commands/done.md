---
description: 每日／每輪收尾流程（repo 狀態、文檔沉澱、PR/CI 盤點、可選 commit/push）。觸發詞：done、收尾、關帳、今天完成。
argument-hint: （可選）補充說明，例如：只整理不 commit、或請直接 push
---

# /done

執行與 Claude Code **`/done` skill** 相同之收尾流程。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/done/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-done-skill.sh`。）

1. **`skills/done/SKILL.md`**（workspace 根目錄相對路徑，在 ECC 目錄開啟時）

2. **`~/.claude/skills/done/SKILL.md`** — 在**非 ECC 根目錄**開啟 Cursor／Claude Code 時讀此檔。（由 `bash scripts/sync-done-skill.sh` 從 ECC 之 `skills/done/SKILL.md` 同步。）

讀到後，依該檔之 **Step 1 → 5** 完整執行。

## 使用者輸入

將 `/done` 後文字視為收尾偏好，例如：
- 「只整理文檔，不要 commit」
- 「收尾後直接 commit + push」
- 「先確認 CI，再決定是否部署」
