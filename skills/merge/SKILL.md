---
name: merge
description: >
  Squash-merge a PR into main: CI check, PR content review (OPEN + no BLOCK), squash merge with Co-authored-by,
  local main sync, conditional deploy reminder from CLAUDE.md. When user says "merge", "合併", "合 PR", "squash merge".
argument-hint: PR 編號（例如 24）
disable-model-invocation: true
---

# PR Merge 標準流程 /merge

收到 PR 編號後，依照以下步驟執行。每個步驟確認後才進行下一步。

## 使用方式

```
/merge <PR 編號>
```

若未提供 PR 編號，執行 `gh pr list` 列出所有開放 PR，讓用戶選擇。

---

## Step 1：確認 CI 狀態

```bash
gh pr checks <PR 編號>
```

- ✅ 所有 checks pass → 繼續
- ❌ 有任何 check 失敗 → **停止**，告知用戶並說明哪個 check 失敗，等待修復

---

## Step 2：確認 PR 內容（快速回顧）

```bash
gh pr view <PR 編號>
```

確認：
- PR 狀態為 `OPEN`
- 目標 branch 為 `main`
- 無 `BLOCK` 標記（來自 /review 的 CRITICAL/HIGH 問題未解決）

---

## Step 3：Squash Merge

採用 **Squash merge**（本流程 best practice）：

- 將 feature branch 的所有 commits 壓縮成 main 上的一個 clean commit
- Commit message 採用 PR title（Conventional Commits 格式）
- 自動刪除 remote feature branch

**Co-authored-by 自識別步驟（執行前在內部完成）**：

1. 盤點線索：系統訊息中的 model、產品說明、使用者可見的模型選單標籤（含 Opus / Sonnet / Haiku、代次如 4.5、4.6 等）
2. 盡量寫滿版本粒度（在證據範圍內），例如 `Claude Sonnet 4.6`；若線索僅到系列，則 `Claude Sonnet`
3. 依執行環境選擇格式：
   - **Claude Code（非 Cursor）**：`Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
   - **Cursor**：`Co-Authored-By: Cursor (Claude Sonnet 4.6) <cursoragent@cursor.com>`
   - **Gemini**：`Co-Authored-By: Gemini <gemini-cli@google.com>`
4. 禁止略過括號；禁止虛構線索中不存在的細版本

```bash
gh pr merge <PR 編號> \
  --squash \
  --subject "<PR title>" \
  --body "Squash-merge of PR #<PR 編號>.

<一到三條最重要的變更摘要>

Co-Authored-By: <自識別結果>" \
  --delete-branch
```

**為何選 Squash merge：**
- main 歷史保持線性、每個功能對應一個 commit，`git log` 清晰易讀
- feature branch 的 WIP commits（"fix typo"、"try again"）不污染 main
- 回滾時只需 `git revert` 一個 commit

**其他策略比較（供參考）：**

| 策略 | 適用情境 | 何時選用 |
|---|---|---|
| Squash merge | 單一功能 PR，歷史整潔優先 | ✅ 預設策略 |
| Merge commit | 需要保留完整 branch 歷史 | 造成 merge bubble，謹慎使用 |
| Rebase merge | 線性歷史但保留個別 commits | 適合已有良好 commit 紀律的 PR |

---

## Step 4：同步 local main

```bash
git checkout main
REMOTE=$(git remote | head -1)
git pull "$REMOTE" main
git log --oneline -5
```

> `REMOTE` 動態取第一個 remote（通常是 `origin`；有些專案用 `github` 等自訂名稱）。

確認 merge commit 出現在 main 頂端，告知用戶。

---

## Step 5：回報完成

告知用戶：
- ✅ Merge 完成，commit SHA 與 message
- 🗑️ Remote branch 已刪除
- 📋 main 最新 5 個 commits（`git log --oneline -5`）

**條件式 deploy 提醒**（讀取 `CLAUDE.md`）：

讀取當前專案根目錄的 `CLAUDE.md`（若不存在則跳過）。搜尋以下慣例標記：

```markdown
## Deploy

- **指令**：`<deploy command>`
```

或類似的 `deploy command`、`bash scripts/deploy.sh`、`npm run deploy` 等關鍵字。

- **若找到 deploy 指令** → 提醒用戶：「若需部署，執行 `<指令>`」
- **若未找到** → 略過 deploy 提醒，不憑空猜測

---

## 專案規則提醒

- **目標 branch**：永遠是 `main`
- **不可 force push main**：如用戶要求，警告並拒絕
- **CI 必須全過才能 merge**：不跳過任何 failing check
- **`--no-verify` 禁止**：不跳過 commit hooks

---

## 範例觸發說法

- 「幫我 merge PR #24」
- 「/merge 24」
- 「把 PR 24 合進 main」
- 「squash merge PR #24」
