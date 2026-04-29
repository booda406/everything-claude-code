---
description: Squash-merge a PR into main（與 Claude Code `/merge` skill 同源）。觸發詞：merge、合併、合 PR、squash merge。
argument-hint: PR 編號（例如 24）
---

# /merge

執行與 Claude Code **`/merge` skill** 相同之 **PR squash merge** 流程。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/merge/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-merge-skill.sh`。）

1. **`skills/merge/SKILL.md`**（workspace 根目錄相對路徑，在 ECC 目錄開啟時）

2. **`~/.claude/skills/merge/SKILL.md`** — 在**非 ECC 根目錄**開啟 Claude Code 時讀此檔。（由 `bash scripts/sync-merge-skill.sh` 從 ECC 之 `skills/merge/SKILL.md` 同步。）

讀到後，依該檔之 **Step 1 → 5** 完整執行。

## 使用者輸入

將 **`/merge` 之後的數字**視為 PR 編號；若未提供，執行 `gh pr list` 讓用戶選擇。
