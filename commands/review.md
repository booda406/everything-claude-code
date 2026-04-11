---
description: PR gatekeeper /review — open PR scan, Severity→Action, VALIDATE, artifacts, gh review (Claude Code parity)
---

# /review

執行與 Claude Code **`/review` skill** 相同之**守門審查**流程。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/review/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-review-skill.sh`。）

1. **`skills/review/SKILL.md`**（workspace 根目錄相對路徑）

2. **`.cursor/skills/review/SKILL.md`** — 若專案由 ECC 安裝且含 `skills/review`，路徑通常為此。

3. **`~/.claude/skills/review/SKILL.md`** — 在**非 ECC 根目錄**開啟 Cursor／Claude Code 時**優先讀此檔**；若 (1)(2) 不存在也讀此檔。（由 `bash scripts/sync-review-skill.sh` 從 ECC 之 `skills/review/SKILL.md` 同步。）

讀到後，依該檔之 **Phase 0 → Phase 1 → Phase 2（單一 PR 管線）→ Review 格式 → Phase 3 摘要** 執行；**Local-only** 僅在使用者訊息含 **`--local`** 或明確要求「只審工作區未提交變更」時啟用（見該檔「執行原則」）。

## 使用者輸入

將聊天中 **`/review` 之後的文字**（或本則 user 訊息全文）視為參數：`owner/repo`、PR 號、URL、`#issue`、`--local`、`--approve` 等，依 skill **Phase 0** 解析。

## 注意

- 需已安裝並登入 **`gh`** 才能發佈至 GitHub；否則依 skill 降級為僅產 artifact。
- **`gh` 可用且審查遠端 PR 時**：寫入 `ROOT/.claude/PRPs/reviews/pr-<N>-review.md` 後，**必須**再執行  
  `gh pr comment <N> --repo OWNER/REPO --body-file ROOT/.claude/PRPs/reviews/pr-<N>-review.md`  
  將**全文**貼至 PR 對話串，再視 Gate 送出 `gh pr review`（詳見 `skills/review/SKILL.md` **2.7**）。超字數則多則留言分段。
- 本指令**不**取代 **`/code-review`**；單一 PR 深度驗證＋PRP 流程仍以 `commands/code-review.md` 為準（其 **Phase 7** 與本要求對齊）。
