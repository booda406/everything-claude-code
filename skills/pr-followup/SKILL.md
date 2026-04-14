---
name: pr-followup
description: >
  After agent PR review (/review, /code-review): one-shot or --watch polling for review landing on a PR,
  triage Gate/CI, optional merge + branch hygiene, handoff to /dev or /commit. Cross-project; reads ROOT/CLAUDE.md when present.
disable-model-invocation: true
---

# PR 審查後續跟進（`/pr-followup`）

你是 **Release / PR 收尾協調**：在 **`/review`** 或 **`/code-review`**（或等效 agent）已對 GitHub PR 產出結論後，負責**讀狀態 → 判斷是否可合併 → 執行或建議**後續動作（CI、合併、刪分支、專案內 Notion／文件一句話 handoff）。  
本 skill **不**重做深度 code review；**不**保證全自動合併（合併前須符合專案政策與使用者明示授權）。

---

## 與其他指令的分工

| 指令／skill | 時機 |
|-------------|------|
| **`/review`** | 守門審查、artifact、`gh pr comment` 全文、`gh pr review`。 |
| **`/code-review`** | 單一 PR／本地變更深度審查＋ PRP artifact（見 `commands/code-review.md`）。 |
| **`/pr-followup`（本 skill）** | **審查結論已上 PR 之後**：確認 Gate／檢查 CI、必要時合併與清理、專案追蹤收尾。 |
| **`/dev`** | 開發主線：分支、TDD、PR 前檢查、開 PR；審查後若需**改 code** 回到 **`/dev`**。 |
| **`/commit`** | **合併或收工後** lessons learned、文件整理（見 `skills/commit/SKILL.md`）。 |

**建議流水線**：`/dev` … → Step 5b **`/code-review`** 或遠端 **`/review`** → 結論上 PR → **`/pr-followup <N>`**（必要時 **`--watch`** 等 agent 留言出現）→ 若需修法再 **`/dev`**；合併與日結後 **`/commit`**。

---

## Phase 0 — 解析參數與目標 repo

### 0.1 `OWNER/REPO`

與 **`skills/review/SKILL.md` Phase 0.1** 相同優先序：使用者訊息中的 `owner/repo`、PR URL、`gh pr view` 於 git 根目錄、`git remote` 解析（`origin` 與 **`github`** 等皆嘗試，以能還原 `owner/repo` 者為準）。

### 0.2 PR 編號 `N`

- 訊息含 **`https://github.com/o/r/pull/N`**、`#N`（且語境為 PR）、**`pr N`**、**`/pr-followup N`** → 取 `N`。  
- 若僅有分支名：  
  `gh pr list --repo OWNER/REPO --head '<branch>' --state open --json number` 取單一 PR；0 或多筆則請使用者指定。

### 0.3 工作目錄 `ROOT`

`git rev-parse --show-toplevel`（可執行時）。用於讀 **`ROOT/CLAUDE.md`**、本機 **`ROOT/.claude/PRPs/reviews/pr-<N>-review.md`**。

### 0.4 模式旗標（由使用者訊息解析）

| 旗標 | 意義 |
|------|------|
| **`--watch`** | **輪詢** PR 對話串／checks，直到偵測到「審查已落地」或逾時（見 Phase 2）。可選 **`--watch-interval 60`**（秒）、**`--watch-max 30`**（輪數）；未寫則預設 **60s × 30 次**。 |
| **`--dry-run`** | 只產出報告與建議指令，**不**執行 `gh pr merge`、不刪分支。 |
| **`--merge`** | 使用者**明示**可合併時，才在 Phase 5 呼叫 `gh pr merge`；未出現則只列建議。 |
| **`--since <ISO8601>`** | 僅把該時間**之後**的留言／review 視為「新一輪審查」（選用）。 |

開始執行前用 2～4 行簡報：`OWNER/REPO`、`N`、`ROOT`、`--watch`／`--merge`／`--dry-run`。

---

## Phase 1 — 讀取 PR 與 CI 現況

```bash
gh pr view N --repo OWNER/REPO --json number,title,state,isDraft,mergeable,mergeStateStatus,baseRefName,headRefName,author,updatedAt
gh pr checks N --repo OWNER/REPO
```

- **Draft**：合併前提醒需 **Ready for review**；若政策禁止 bot approve，與 **`/review`** 一致僅 **comment** 路徑。  
- **mergeable / merge conflict**：若不可合併，**停止**合併路徑，建議 **`/dev`** 或人工解衝突後再跑本 skill。

---

## Phase 2 — 偵測「agent review 已落地」（可輪詢）

**目的**：使用者希望「一發現 agent review 有反饋就開始」時，以 **`gh` 輪詢** 近似監聽（**非** GitHub Webhook 長連線；Cursor／Claude 無內建訂閱 API）。

在 **`--watch`** 下：每輪執行下列**任一條件**成立即視為「已落地」，進入 Phase 3：

1. **Issue 留言**（PR 在 API 上為 issue）：  
   `gh api "repos/OWNER/REPO/issues/N/comments?per_page=20"`  
   由新到舊找：**正文含** `Gate`、`pr-<N>-review.md`、`**Decision**`、`Severity`（大小寫不敏感組合亦可）**且**建立時間在 `--since` 之後（若有）。  
2. **Pull request reviews**：  
   `gh api "repos/OWNER/REPO/pulls/N/reviews?per_page=20"`  
   若有新 submitted review 且 body 或關聯留言指向守門報告。  
3. **本機 artifact**：`ROOT/.claude/PRPs/reviews/pr-<N>-review.md` **存在**且 **mtime 晚於** 工作開始時間或 `--since`（僅在 `ROOT` 可讀時）。

**作者啟發式**（可選，與 1 併用）：留言作者 `login` 為 `cursoragent`、`github-actions[bot]`、`copilot-pull-request-reviewer` 等常見 bot／agent 帳號時，提高權重；**仍須**內文或連結像「審查報告」再進 Phase 3，避免一般對話誤觸發。

**逾時**：達 **`--watch-max`** 仍無訊號 → 回報最後一次 API 摘要，建議人工刷新 PR 或改單次執行（不加 `--watch`）。

**非 `--watch`**：只做**一輪** Phase 2；若尚未落地 → 列出目前最後一則留言摘要，建議使用者待 artifact 上線後再執行 **`/pr-followup N`** 或改用 **`--watch`**。

---

## Phase 3 — 解讀 Gate 與阻擋項

1. **優先讀本機**：`ROOT/.claude/PRPs/reviews/pr-<N>-review.md`（若存在）。  
2. 否則從 PR **最新長留言**或 **`gh pr view N --comments`** 擷取與 **Gate**、**CRITICAL / HIGH / MUST** 相關段落。  
3. 結論：  
   - **阻擋合併**（例：Gate **BLOCKED**、開放 MUST 未勾、CI 失敗）→ **不**進 Phase 5 合併；輸出**待辦清單**，建議 **`/dev`**（附 PR 連結與必改項）或人工處理。  
   - **實質可合併**（Gate **OK** 或等效、無未解 MUST、CI 綠或專案接受之 waiver）→ 進 Phase 4～5。

---

## Phase 4 — CI 確認（合併前）

- `gh pr checks N --repo OWNER/REPO`；必要時建議使用者本機跑 **`CLAUDE.md`** 所列 **PR 前必跑**（與 **`/dev` Step 5** 對齊）。  
- 若有 **`gh pr checks --watch`** 且使用者願意等待，可建議在終端執行直至全綠。

---

## Phase 5 — 合併與分支衛生（需授權且非 `--dry-run`**）

僅當 Phase 3 為「可合併」**且**使用者已給 **`--merge`** 或明確文字「**可以合併**／**merge this PR**」等：

1. **髒工作區**：與專案慣例一致，建議先 **`git stash push`** 再於本機切換／pull（見各 repo `CLAUDE.md` 或 **`lessons-learned`**）。  
2. **`gh pr merge N --repo OWNER/REPO`**：策略（`--squash`／`--merge`／`--rebase`）依專案預設；不確定時 **問一句**再執行。  
3. 合併後：  
   - `git push OWNER_REPO_REMOTE --delete <headRefName>`（remote 名稱以專案為準，可能是 **`github`**）。  
   - `git fetch --prune`、`git checkout <baseRefName>`、`git pull` 更新本機 base。

未授權合併時：只輸出**建議指令**區塊，供使用者複製執行。

---

## Phase 6 — 專案特定收尾（可選）

若 **`ROOT/CLAUDE.md`** 或 **`ROOT/docs/context/ai-collaboration-and-tooling.md`** 存在：

- **Notion／工單**：依文件將 **MEDIUM／Optional** 等追蹤項建在看板（例：paper3-temple **§1.5**）；可用 **`/notion-pm-task`**（若專案已安裝該 command）。  
- **`docs/context/implementation-notes.md`**：只在有**階段共識**時建議**一句話 handoff**＋ Notion／PR URL，**勿**整頁貼進 repo（除非使用者要求）。

---

## Phase 7 — 回覆使用者（固定要含）

- **PR 連結**、**Gate／CI 結論**、是否已合併、遠端分支是否已刪。  
- **下一步**：若還有開放 finding → **`/dev` + PR/issue**；若已合併且當日收工 → **`/commit`**。  
- **`--watch`** 時附**輪詢次數**與觸發來源（留言／artifact）。

---

## 限制與誠實說明

- **非即時 Webhook**：「監聽」僅能透過 **`--watch` + `gh api` 輪詢** 或使用者手動再次呼叫本指令；無法在 Cursor 內註冊 GitHub 事件。  
- **合併權限**：受 branch protection、review 數量、bot 不可 approve 等限制；失敗時轉**人工**並保留 log。  
- **多專案**：一律帶 **`--repo OWNER/REPO`** 或在對應 clone 根目錄執行，避免 merge 錯倉。

---

## 維護

- **唯一真相來源**：ECC 倉庫 **`skills/pr-followup/SKILL.md`**。  
- **同步到本機**：`bash scripts/sync-pr-followup-skill.sh`（安裝 **`~/.claude/skills/pr-followup/SKILL.md`** 與 **`~/.cursor/commands/pr-followup.md`**）。
