---
description: PR 審查後續 — 偵測 review 落地、CI、可選合併與分支清理；可 --watch 輪詢單一 PR（與 /review、/dev 銜接）
argument-hint: [pr-number | pr-url | --watch [--watch-interval 60] [--watch-max 30] | --dry-run | --merge]
---

# /pr-followup

執行與 Claude Code **`/pr-followup` skill** 相同之 **PR 審查後收尾** 流程（**不**取代 **`/review`**／**`/code-review`** 的審查本體）。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/pr-followup/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-pr-followup-skill.sh`。）

1. **`skills/pr-followup/SKILL.md`**（workspace 根目錄相對路徑）

2. **`.cursor/skills/pr-followup/SKILL.md`** — 若專案由 ECC 安裝且含 `skills/pr-followup`，路徑通常為此。

3. **`~/.claude/skills/pr-followup/SKILL.md`** — 在**非 ECC 根目錄**開啟 Cursor／Claude Code 時**優先讀此檔**；若 (1)(2) 不存在也讀此檔。（由 `bash scripts/sync-pr-followup-skill.sh` 從 ECC 之 `skills/pr-followup/SKILL.md` 同步。）

讀到後，依該檔之 **Phase 0 → 7** 執行。

## 使用者輸入

將 **`/pr-followup` 之後的文字**（或本則 user 訊息全文）視為參數：`owner/repo`、PR 號、PR URL、**`--watch`**、**`--watch-interval`**、**`--watch-max`**、**`--since`**、**`--dry-run`**、**`--merge`** 等，依 skill **Phase 0** 解析。

## 注意

- 需已安裝並登入 **`gh`** 才能查 PR／留言／checks／merge。  
- **`--watch`** 為 **CLI 輪詢**，非 GitHub Webhook；適合同一會話內「等 agent 把 review 貼上 PR 再繼續」。  
- **合併**僅在使用者給出 **`--merge`** 或明確同意合併之文字時執行；預設 **`--dry-run` 等級的謹慎**（僅建議指令亦可，見 skill Phase 5）。  
- 審查產物仍依 **`/review`**（`skills/review/SKILL.md` **2.7**）或 **`/code-review`**：先 **`gh pr comment --body-file`** 再視情況 **`gh pr review`**。

## 與 `/dev` 的銜接

- **審查後要改 code**：回到 **`/dev`**（可附 PR／issue URL）。  
- **審查後可合併**：本指令收尾；合併與日結文件／lessons learned 建議再跑 **`/commit`**（見 `skills/dev/SKILL.md` Step 8 與 `skills/commit/SKILL.md`）。
