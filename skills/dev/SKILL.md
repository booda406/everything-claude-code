---
name: dev
description: >
  TDD feature/bugfix flow: persisted task tracking (Notion/GitHub issues), safe branching from BASE,
  pre-PR checks (test/lint/typecheck), optional /code-review, conventional commit, push and PR.
disable-model-invocation: true
---

# 功能開發標準流程 /dev

收到開發任務後，請依照以下流程逐步執行。每個步驟完成後再進行下一步，需要用戶確認時請先停下來詢問。

**輸入**：使用者在 `/dev` 後提供的**任務描述**（或對話中的明確開發請求）；可一併附上 **Notion／GitHub issue／PR** 連結。

**測試與 TDD**：本流程假設**一定要有自動化測試**；節奏採 **TDD／紅綠重構**。測試與工具鏈**依專案**設置，不略過。

**中止原則**：任一步驟若 **git／pull／測試／lint** 失敗或需人類決策（髒工作區、合併衝突），**停止並說明**，**不可假裝繼續**後續 Step。

---

## Step 1：任務追蹤（讀記錄 → 若空則問 → 再寫回記錄）

目標：依**專案已保存約定**決定 Notion／GitHub issue／略過，避免每任務重問。

### 1.1 讀取專案記錄（優先）

依序尋找**任務追蹤**設定：

1. **`CLAUDE.md`** / **`AGENTS.md`** — 建議標題：`## /dev 任務追蹤` 或 `## Task tracking`
2. **`.cursor/rules/*.mdc`**
3. **`docs/context/dev-tracking.md`**（若專案固定用此檔，之後讀寫同一路徑）

記錄建議含：

- **模式**：`notion` / `github-issues` / `jira` / `none`
- **Notion**：`collection://…` 或 database ID、欄位對照（可簡述）
- **GitHub**：預設 **repo**（`owner/repo`）若與本機 `gh repo view` 不同則必寫；可寫預設 **labels**
- **略過條件**：例「使用者已貼 task／issue URL 則不新建」

### 1.2 記錄為空或不足以行動時

**停下來問使用者**，釐清後**寫回**上述擇一位置（優先 **`CLAUDE.md`**），條列化以便 grep。

### 1.3 依記錄執行 — Notion

- 使用者已貼 **Notion task URL／ID** → **不新建**，進 Step 2。
- 記錄為 **`notion`** 且有 database → **notion MCP** 建任務；欄位以 **Notion schema** 為準（下表為概念）：

| 概念 | 規則 |
|---|---|
| 標題 | 一句話、動詞開頭 |
| 類型 | feat→Feature；fix→Bug；refactor→Refactor |
| 優先級 | High / Medium / Low |
| 工作量 | Small / Medium / Large |
| 狀態 | In progress 或等同 |
| 說明 | 需求／影響 + Sub-tasks |

**Sub-tasks**（寫入說明）：

```
## Sub-tasks
- [ ] 閱讀相關程式碼
- [ ] 規劃實作與測試（與用戶確認）
- [ ] TDD：測試先行 → 實作 → 綠燈
- [ ] PR 前檢查全過（測試／lint／型別等）
- [ ] Commit & PR（可搭配 /code-review）
```

- **notion MCP 不可用** → 請使用者手動建 task 並貼 URL，或暫改記錄為「手動 URL」模式。

### 1.4 依記錄執行 — GitHub Issues（best practice）

若模式為 **`github-issues`** 且本次需**新建** issue（使用者未貼現有 issue URL）：

1. **先看範本（選用，非每個專案都要有）**：若 repo **已有** **`.github/ISSUE_TEMPLATE/`**，優先依範本類型填寫（`gh issue create` 可互動或 `--body-file`）。**若沒有範本**，略過此步，直接用下方 Markdown 結構即可。
2. **標題**：祈使句、簡短、可搜尋（例：`Add retry backoff to Notion client`）；bug 可前綴 `fix:` 風格。
3. **本體結構**（依類型擇用；與 [GitHub 建議](https://docs.github.com/en/issues/tracking-your-work-with-issues) 一致 — 清楚、可重現、可驗收）：

**功能／任務（feat/refactor）**：

```markdown
## Summary
（1～2 句：做什麼、為何值得做）

## Acceptance criteria
- [ ] （可驗收的條件 1）
- [ ] （可驗收的條件 2）

## Context（選填）
- 關聯文件／設計連結

## Notes for implementer（選填）
- 可能涉及的檔案或 API
```

**Bug**：

```markdown
## Summary
（一句話描述錯誤現象）

## Steps to reproduce
1.
2.
3.

## Expected behavior


## Actual behavior


## Environment（選填）
- OS / runtime 版本
- Commit 或 release 版本

## Possible cause / notes（選填）
```

4. **建立**（範例，實際 `--repo` 以記錄或 `gh` 預設為準）：

```bash
gh issue create --title "..." --body-file issue-body.md --label "enhancement"
# bug 常用 label: bug；可複合 --label
```

5. 將 **issue URL** 寫入後續 PR 描述「Closes #N」或「Refs #N」（合併策略依團隊）。

- 記錄為 **`none`** → 略過建立，進 Step 2。

完成後告知 task／issue URL（若有）。

---

## Step 2：建立 Feature Branch（feature branch 不變；釐清 BASE／遠端）

**說明**：開發仍是 **`feature/…`、`fix/…`**。此處處理的是**從哪條主線切出**（`BASE`）以及**安全 git 狀態**。

### 2.1 遠端名稱 `REMOTE`

**優先序**：

1. **`CLAUDE.md`／`AGENTS.md`** 明寫 `git_remote: upstream` 等 → 使用該名稱
2. 否則預設 **`origin`**
3. 若 `git remote -v` 無預期遠端 → **停下來問使用者**

### 2.2 工作區必須乾淨或可接受

執行 **`git status`**（含未追蹤檔若會干擾 checkout，一併考量）。

- 若有**未提交變更**（或與即將切換分支衝突的狀態）→ **停下來問使用者**如何處理，例如：
  - `git stash push -m "wip before /dev"` 後繼續；
  - 先 **commit／WIP commit**（若使用者同意）；
  - **中止** `/dev`，待工作區整理後再跑；
  - 少數情況：使用者明示「保留髒狀態」且你了解風險 → 記錄在回覆中並**仍謹慎**執行 checkout。

**不可**在使用者未決策前強行 `checkout` 導致遺失或混線。

### 2.3 解析 `BASE`（主線分支名）

**優先序**（**GitFlow／固定從 `develop` 開 feature 時，務必用文件，勿盲信 origin HEAD**）：

1. **`CLAUDE.md`／`AGENTS.md`** 明寫 **`BASE`／`integration branch`／`feature branch from`**（例：`develop`）→ **採用**
2. 否則：`git remote show "$REMOTE" 2>/dev/null | sed -n '/HEAD branch/s/.*: //p'`
3. 若仍空：依序嘗試 **`main`**、**`master`**
4. 仍無法確定 → **問使用者**

### 2.4 更新主線並開分支（失敗即中止）

```bash
git fetch "$REMOTE"
git checkout "$BASE"
git pull "$REMOTE" "$BASE"
```

- **`pull` 失敗**（網路、權限、或非 fast-forward 合併衝突）→ **停止**，輸出錯誤摘要，請使用者在本機解決（merge／rebase／找同事）後再重新執行 Step 2。**不可**在衝突未解下繼續 Step 3。

成功後：

```bash
git checkout -b <branch-name>
```

**命名**（kebab-case）：`feature/`、`fix/`、`refactor/`、`docs/`（同前）。

**約定**：從 **`BASE`** 切出，勿從他人長命 feature 再切（除非使用者明示）。

**開 PR**：`gh pr create --base "$BASE" --repo …`（`--repo` 依 `gh` 上下文）。

確認目前在正確 branch 後進 Step 3。

---

## Step 3：閱讀程式碼，規劃實作與測試（含 TDD）

- **定位**、**依賴**、**資料／外部系統**、**變更清單**
- **測試規劃（必須）**：測試檔路徑與命名、情境（正常／邊界／失敗）、**RED** 階段預期失敗的**斷言**／案例描述
- 尚無測試骨架 → 與使用者對齊**最小可跑結構**與**一條標準測試指令**

**實作 + 測試規劃**經使用者確認後再進 Step 4。

---

## Step 4：TDD 實作（測試先行 → 綠燈 → 重構）

1. **RED**：測試先寫／改，執行相關測試，**預期失敗**（或型別／編譯失敗），確認測試有效。
2. **GREEN**：**最小** production 變更使測試通過。
3. **REFACTOR**：綠燈下整理；必要時補測試。

遵守專案規則與可測性（mock 邊界依賴）。

**Commit 粒度**：本 `/dev` 流程**預設**在 Step 6 以**一顆（或少量）語意完整 commit** 收斂本次功能；若團隊要求 **RED／GREEN 分段 commit** 或 checkpoint，請對齊專案規範或參考 **`skills/tdd-workflow/SKILL.md`**（若已安裝）。

---

## Step 5：PR 前檢查（測試 + lint／型別等，必過）

**目標**：與 **CI／`CLAUDE.md` 約定**一致，**全部通過**才可進 Step 6。

### 5.1 解析「要跑什麼」

**優先序**：

1. **`CLAUDE.md`／`AGENTS.md`／`CONTRIBUTING.md`** 中的 **「PR 前必跑」／`pre-PR`／`ci locally`** 清單（若有多行指令，依序執行）
2. 否則依專案慣例組合（**僅執行存在的 script**）：
   - Node：`npm run lint`、`npm run typecheck`、`npm test`（或 `pnpm`／`yarn` 對應）
   - Python：`ruff`／`flake8`、`mypy`、`pytest`
   - Rust：`cargo clippy`、`cargo test`
   - Go：`go vet`、`go test ./...`
3. **測試**指令解析同前版（`package.json`、`Makefile`、`pytest`…）
4. 仍不確定 → **問使用者**與 CI 對齊的一組指令

### 5.2 通過準則

- **任一檢查失敗** → 修復至全過；**不可**帶著失敗的測試／lint 進功能 commit。
- **Coverage**：依專案設定；本模板不寫死百分比。

---

## Step 5b：與 `/code-review` 結合（強烈建議）

與 **`/review`**（守門、多 PR 掃描、artifact）**不同**；**`/code-review`** 適合**單一變更或單一 PR 的深度審查**（見 **`commands/code-review.md`**）。

| 時機 | 做法 |
|---|---|
| **已 commit、尚未 push** | 執行 **`/code-review`**（**無參數**）→ **Local Review Mode**，審未推送的變更；若有 **CRITICAL／HIGH** 或明確阻擋項，先修再 push。 |
| **已開 PR** | 執行 **`/code-review <PR 號>`** 或 **PR URL**（**`--pr`** 語意）→ **PR Review Mode**；依指令內流程決定 APPROVE／REQUEST CHANGES／產出 artifact。 |

**建議順序**：Step 5 全綠 → **Step 5b**（本地 `/code-review`）→ Step 6 若需因審查再修則迴圈 → Step 7 push／PR → 可再對 **PR 號** 跑一次 `/code-review` 以對齊 GitHub 留言。

若環境無 **`gh`** 或使用者略過審查，需在回覆中**明示**風險自負。

---

## Step 6：Commit

**Conventional Commits**，英文；**`Co-authored-by`** 同 **`skills/commit/SKILL.md`**（**勿** `Made-with:`）。

```bash
git add <path> ...
git commit -m "..."   # 或 git commit -F message.txt
```

---

## Step 7：Push、開 PR（失敗即中止）、Draft 選項

```bash
git push -u "$REMOTE" <branch-name>
```

- **push 失敗** → **停止**，說明原因（權限、protected branch、需 pull --rebase 等），請使用者處理後再推。**不可**假裝 PR 已建立。

### 7.1 選填：提早開 Draft PR

若團隊習慣**早開佔位**：首次 push 後可：

```bash
gh pr create --draft --base "$BASE" --title "WIP: ..." --body "..."
```

後續 push 更新同一 branch 即可；準備好再 **Ready for review**。

### 7.2 正式 PR

```bash
gh pr create --base "$BASE" --title "..." --body "..."
```

body 含 **Summary**、**變更檔案**、**Test plan**、**Closes #N／Refs #N**（若有 issue）、**已跑過的 pre-PR 指令**。

**選填頁尾**：`Assisted with [Claude Code](https://claude.com/claude-code) · [Cursor](https://cursor.com)`

### 7.3 PR 建立後

建議再執行 **`/code-review <PR#>`**（見 Step 5b）。

---

## Step 8：回報完成

PR URL、檢查與測試摘要、Notion／issue 是否改 **In review**、部署驗證待辦。

> **PR 合併、階段收工後**：執行 **`/commit`** 做 lessons learned 與文件整理。

---

## 設定備忘（給專案維護者）

在 **`CLAUDE.md`**（或 `AGENTS.md`）建議維護：

| 項目 | 說明 |
|---|---|
| **`/dev 任務追蹤`** | 模式、Notion／GitHub、預設 labels、`--repo` 若需要 |
| **`BASE` 或 GitFlow** | 例：feature **一律從 `develop` 切**（勿只靠 origin HEAD） |
| **`git_remote`** | 非 `origin` 時明寫 |
| **PR 前必跑** | 多行指令：lint、typecheck、unit、integration（與 CI 一致） |
| **測試** | 與 CI 相同的一鍵指令 |
