---
name: done
description: >
  End-of-session wrap-up workflow: repo hygiene (status/branch/PR/CI), docs and knowledge capture,
  optional Notion sync, final commit/push checklist, and concise closure report. Trigger when user says
  "done", "收尾", "今天完成", "結束今天工作", or "/done".
disable-model-invocation: true
---

# 收尾流程 /done

當使用者表示「今天先到這裡、請收尾整理」時，執行本流程，目標是把專案留在可交接、可部署、可追蹤的狀態。

---

## Step 1：Repo 健康檢查（必要）

依序執行並回報：

1. `git status -sb`
2. `git branch`（確認目前分支與殘留分支）
3. `gh pr list --state open --limit 20`（確認是否有未收斂 PR）
4. 若本次有 push／部署：`gh run list --limit 10`（確認最新 CI / Deploy）

判準：
- 工作樹乾淨（或明確列出剩餘檔案）
- 分支狀態清楚（是否僅保留 main）
- PR 狀態清楚（是否皆已關閉）
- CI / Deploy 狀態清楚（成功/失敗/進行中）

---

## Step 2：文件同步與知識沉澱

依「內容性質」更新對應檔案（勿混用）：

- **單次修法、根因、驗證證據** → `docs/context/implementation-notes.md`
- **會反覆提醒 AI 的行為準則** → 同步更新
  - `CLAUDE.md`
  - `.cursor/rules/lessons-learned.mdc`

判斷原則：
- 三個月後還會再次提醒 AI 的規範 → 行為準則
- 主要給人查歷史脈絡與除錯復盤 → implementation notes

文件更新完成後，需在回覆中列出：
- 更新了哪些檔案
- 每個檔案新增了什麼重點

---

## Step 3：Notion / 任務看板同步（若專案有規範）

若 `CLAUDE.md` 或專案規範要求同步 Notion：

1. 關閉已完成任務（補完成記錄）
2. 建立本次衍生待辦（避免重複）
3. 更新進行中任務進度
4. 重整優先級（若今日風險改變）

若本輪不需 Notion，同步回報「本次略過 Notion（原因）」即可。

---

## Step 4：收尾 commit / push（依使用者意圖）

若使用者要求 `/done` 後直接完成版本控制收尾：

1. 檢查：`git status` + `git diff` + `git log -5 --oneline`
2. 產生英文 Conventional Commit（含 body）
3. 加上 Co-authored-by（依當前環境規範）
4. commit 完回報 hash
5. 若使用者要求部署前同步遠端：執行 push 並回報結果

若使用者未明確要求 commit/push，先詢問一次再執行。

---

## Step 5：結案摘要（回覆模板）

以精簡條列回覆：

- **Repo**：工作樹/分支/PR/CI 狀態
- **Docs**：本次更新文件與重點
- **Tasks**：Notion/工單同步結果（若有）
- **Git**：本次 commit / push（若有）
- **Next**：下一輪建議起手式（1-2 點）

---

## 觸發語句

- `/done`
- 「今天任務完成，幫我收尾」
- 「做一下文檔、branch、PR 整理」
- 「收工前幫我關帳」
