---
description: 每日工作結束的 Git commit 流程（與 Claude Code `/commit` skill 同源）。觸發詞：commit、工作結束、今天做完了。
argument-hint: (無需參數，直接呼叫即可)
---

# /commit

執行與 Claude Code **`/commit` skill** 相同之**每日收工 commit** 流程。

## 載入流程內容（擇一成功即可）

**唯一真相來源（請優先讀）**：ECC 倉庫根目錄之  
`skills/commit/SKILL.md`  
（維護時只改此檔；同步到本機 home 請跑 `bash scripts/sync-commit-skill.sh`。）

1. **`skills/commit/SKILL.md`**（workspace 根目錄相對路徑）

2. **`.cursor/skills/commit/SKILL.md`** — 若專案由 ECC 安裝且含 `skills/commit`，路徑通常為此。

3. **`~/.claude/skills/commit/SKILL.md`** — 在**非 ECC 根目錄**開啟 Cursor／Claude Code 時**優先讀此檔**；若 (1)(2) 不存在也讀此檔。（由 `bash scripts/sync-commit-skill.sh` 從 ECC 之 `skills/commit/SKILL.md` 同步。）

讀到後，依該檔之 **步驟 1 → 6** 完整執行。

## 使用者輸入

將 **`/commit` 之後的文字**（若有）視為補充說明；本流程**無必填參數**。

## 與 `/prp-commit` 之分流

- **`/commit`**：收工儀式 — 含 lessons learned、文件整理、多行訊息與 Co-authored-by。
- **`/prp-commit`**：快 commit — 可選檔、單行訊息，見 `commands/prp-commit.md`。

## 舊指令

若專案中仍有獨立的 `commit-today` 指令檔，與本流程同源；請逐步改為 **`/commit`** 以避免兩份文案漂移。
