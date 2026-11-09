---
name: merge
description: >
  Merge an authorized PR into its project-defined target branch: verify current head/base SHAs,
  applicable review and CI, reuse valid prior authorization, then merge and verify the actual outcome.
  When user says "merge", "合併", "合 PR", "squash merge"; pr-followup is optional.
argument-hint: PR 編號（例如 24）
disable-model-invocation: true
---

# PR Merge 標準流程 /merge

收到 PR 編號後，依照以下步驟執行。每個步驟確認後才進行下一步。

## 使用方式

```
/merge <PR 編號>
```

若未提供 PR 編號，依目前 repo 與對話找唯一目標；仍不明確才列出開放 PR 請使用者指定。從 PR URL／remote 核對 `API_HOST` 與 `REPO=OWNER/REPO`，並設 `PR_REPO=API_HOST/OWNER/REPO`；GitHub.com 與 Enterprise 的同名 repo 不共用身分。`gh pr` 使用 `--repo "$PR_REPO"`，`gh api` 使用 `--hostname "$API_HOST"`，API 的 `repos/` 路徑仍只放 `OWNER/REPO`。

本 skill 是合併門檻與執行的唯一流程。`/pr-followup` 只在等待或協調時選用；已就緒的 PR 可直接執行 `/merge`。先前只授權開發、審查或追蹤狀態，不等於合併授權。

## Step 0：確認目標分支與既有授權

先讀本對話授權與專案 `AGENTS.md`、`CLAUDE.md`、貢獻規範的分支政策，再讀 PR 現況：

```bash
gh pr view "$N" --repo "$PR_REPO" \
  --json number,title,url,state,isDraft,baseRefName,baseRefOid,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision
```

- 以使用者指定及適用於本類 PR 的專案政策確定 `BASE`；未規定固定分支時，可採 PR 現有 `baseRefName` 並記錄依據，不硬猜 `main`／`master`。
- 比對 PR 的 `baseRefName` 與 `BASE`。若不同或授權與政策有衝突，停止並釐清；使用者已明確授權的政策例外可記錄採用，但不繞過 GitHub 的保護規則。不可自行改 PR 目標分支來消除不一致。
- 記錄 `(API_HOST, REPO, N, BASE, headRefOid, baseRefOid)`，將兩個 SHA 分別記為 `EXPECTED_HEAD_SHA`、`EXPECTED_BASE_SHA`。這是本輪證據與授權的身分及版本範圍；跨 host 不沿用。
- 沿用本對話中仍有效、涵蓋相同 repo／PR／目標分支及工作範圍的合併授權，包括「檢查通過就合併」；不要求使用者重複確認，也不強制再輸入旗標。批次授權只適用指定的 PR 清單。
- 沒有授權、已撤回、或最新指示為只看狀態／`--dry-run` 時，只讀取並回報。若授權限定特定 SHA，必須與目前 head 相符；若目標分支、工作範圍或授權條件改變，重新釐清。任務範圍內修正導致 head 更新須重驗，但不會自動撤銷未限定 SHA 的任務級授權。

---

## Step 1：確認 CI 狀態

```bash
gh pr checks "$N" --repo "$PR_REPO"
```

- 依專案與 branch protection 找齊必要檢查，讀取 check/run 的 SHA，確認涵蓋 `EXPECTED_HEAD_SHA` 與適用的 `EXPECTED_BASE_SHA`。測試可能跑在 PR merge commit；須能證明該測試版本包含這一組 head／base，不能只看一個舊綠燈。
- 必要檢查失敗、pending、取消、未知或無法證明版本歸屬時，不合併；需要修復回 `/dev`，等待結果才選用 `/pr-followup`。
- 沒有 checks 不是全綠。只有專案明確不要求 CI，且所要求的替代驗證有可核對證據時，才能記錄為不適用；不可用空清單跳過檢查。
- 本地測試與遠端 CI 分開記錄。已查到失敗的檢查不可隱藏或自行豁免；必要時按專案規則處理後重驗。

---

## Step 2：確認目前版本的審查與 mergeability

```bash
gh pr view "$N" --repo "$PR_REPO" \
  --json number,title,state,isDraft,baseRefName,baseRefOid,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,url
gh api --hostname "$API_HOST" --paginate "repos/$REPO/pulls/$N/reviews?per_page=100"
```

確認：
- PR 為 `OPEN` 且非 Draft，repo 與目標 `BASE` 均正確。
- 正式 review 用 `commit_id` 核對 `EXPECTED_HEAD_SHA`；Gate 留言或本機 artifact 必須能辨識 repo／PR／受審 head SHA 與適用 base。僅「最新留言」、bot 名稱、檔案存在或 mtime 新不能證明已審這一版。
- 依專案規則滿足必要審查，確認目前有效結論；已 dismissed、被後續審查取代或屬舊 SHA 的結果不能直接放行。存在新的阻擋時，不能用另一份較舊的 OK 報告覆蓋它。版本歸屬不足時，補做目前版本審查或驗證並留下 SHA 證據。
- `mergeable` 必須是 `MERGEABLE`
- `mergeStateStatus` 不可為 `DIRTY` / `BLOCKED` / `UNKNOWN`。若為 `UNKNOWN`，等待 GitHub 重新計算後再查一次；仍不明確就停止。
- 無未解的 `BLOCK`／Must fix 等阻擋項；專案允許的非阻擋跟進項須記錄處置，不以沒有 `BLOCK` 字樣推定審查已完成。

若 PR 為 `CONFLICTING`、`DIRTY`，或需更新 branch，停止合併，先對齊目前專案 `BASE`、解衝突，再重跑必要檢查與審查。讀取過程若 head 或 base SHA 改變，回 Step 0 重新建立證據範圍；base 前進須重新確認整合影響及必要 CI，原審查若依賴舊 base 也須更新。

---

## Step 3：Batch / consecutive merge guard（連續合併防護）

若連續合併多個 PR，每個 PR 都重新執行 Step 0～2；前一個成功不授權未列入範圍的下一個 PR，也不能沿用它的綠燈。

前一個 PR 真正 `MERGED` 後重新讀取下一個的 `headRefOid`／`baseRefOid`。若 base 從 B1 變成 B2，重新確認下一個 PR 對 B2 的整合與檢查證據；不能把 H／B1 的結果當成 H／B2 已通過。本地同步依 Step 5 的工作區條件另行處理，不把自動 stash／checkout 當成遠端查核前提。

另外檢查檔案重疊風險：

```bash
gh pr diff "$NEXT_N" --repo "$PR_REPO" --name-only
```

- 若下一個 PR 與剛合併的 PR 修改相同檔案，或都修改 CI/CD、依賴、路由、schema、shared component 等高影響面，提醒用戶「需要重新 review 或至少重新確認整合風險」。
- 若 GitHub 回報不再 mergeable、必要 CI 未通過或 base 適用性不明，停止；先對齊該 PR 的最新 `BASE`、解衝突並重驗。
- 若懷疑兩個 PR 各自綠但合起來可能壞掉，建議先建立 integration branch 或使用 GitHub Merge Queue，跑整合 CI 後再合併。

---

## Step 4：執行前重查並合併

在讀完審查與 CI 後、發出合併命令前，重新執行 Step 0 的 PR 查詢，確認 repo、PR、`baseRefName`、`headRefOid`、`baseRefOid` 均與已驗證範圍相同，PR 仍為 OPEN、非 Draft、可合併且沒有新阻擋，必要 checks 仍通過，既有授權仍有效。版本或目標變動就回 Step 0 重驗；出現新審查／檢查變化則重新判斷 Step 1～2，不自動換成新的 SHA 重試合併。

合併策略依專案及既有授權；未指定時沿用本流程預設 **Squash merge**。記錄以下內容：

- 將 feature branch 的 commits 壓縮成目標 `BASE` 上的一個 commit
- Commit message 採用 PR title（Conventional Commits 格式）
- 分支清理只在確認 `MERGED` 後，依授權與專案政策處理；不要在本機有他人變更時自動切換或刪除本機分支。

**Co-authored-by 自識別步驟（執行前在內部完成）**：

1. 盤點線索：系統訊息中的 model、產品說明、使用者可見的模型選單標籤（含 Opus / Sonnet / Haiku、代次如 4.5、4.6 等）
2. 盡量寫滿版本粒度（在證據範圍內），例如 `Claude Sonnet 4.6`；若線索僅到系列，則 `Claude Sonnet`
3. 依執行環境選擇格式：
   - **Claude Code（非 Cursor）**：`Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
   - **Cursor**：`Co-Authored-By: Cursor (Claude Sonnet 4.6) <cursoragent@cursor.com>`
   - **Gemini**：`Co-Authored-By: Gemini <gemini-cli@google.com>`
4. 禁止略過括號；禁止虛構線索中不存在的細版本

以檔案寫入已確認的多行合併訊息（摘要及上面的 Co-authored-by），將其路徑設為 `MERGE_MESSAGE_FILE`，再執行：

```bash
gh pr merge "$N" --repo "$PR_REPO" \
  --match-head-commit "$EXPECTED_HEAD_SHA" \
  --squash \
  --subject "<PR title>" \
  --body-file "$MERGE_MESSAGE_FILE"
```

此為一般 squash 範例。專案若要求 merge queue，依其佇列流程處理並保留 head 比對；不使用 `--admin` 繞過保護。`--match-head-commit` 只原子比對 head，既不鎖定 `baseRefOid`，也不鎖定 `baseRefName`。最後讀取之後仍可能被 retarget；不得宣稱此旗標保證了授權目標不變。專案要求最新 base 整合保證時使用適用的 branch protection／merge queue；若另要求目標分支的原子保證，或已發現並行 retarget 風險，須有能限制目標變更的伺服器規則或受控合併入口。沒有相應能力就停在預檢並回報限制，不以 head 相同自動合併。

命令失敗或 head 不符時，停止本次合併，重新讀狀態及證據；不移除 SHA 限制重試。命令退出 0 後也必須回讀：

```bash
gh pr view "$N" --repo "$PR_REPO" --json state,mergedAt,mergeCommit,baseRefName,headRefOid,url
```

只有 `state=MERGED` 且取得 merge commit 才回報完成。仍為 `OPEN`、已進 queue 或僅啟用 auto-merge 時，如實回報等待狀態；依已授權的等待範圍追蹤，不刪分支、不把它當成已合併再處理後續批次。

**為何選 Squash merge：**
- 目標分支歷史保持線性、每個功能對應一個 commit，`git log` 清晰易讀
- feature branch 的 WIP commits（"fix typo"、"try again"）不進入目標分支的逐筆歷史
- 回滾時只需 `git revert` 一個 commit

**其他策略比較（供參考）：**

| 策略 | 適用情境 | 何時選用 |
|---|---|---|
| Squash merge | 單一功能 PR，歷史整潔優先 | 預設策略 |
| Merge commit | 需要保留完整 branch 歷史 | 造成 merge bubble，謹慎使用 |
| Rebase merge | 線性歷史但保留個別 commits | 適合已有良好 commit 紀律的 PR |

---

## Step 5：合併後的本機同步與分支清理

確認已合併後才處理。先核對 `git status`、目前 checkout 的 repo 與 remote URL；`REMOTE` 必須對應已確認的 `REPO`，不要直接選第一個 remote。

工作區乾淨且切換不干擾其他工作時：

```bash
git fetch "$REMOTE"
git checkout "$BASE"
git pull --ff-only "$REMOTE" "$BASE"
git log --oneline -5
```

工作區有未提交修改、別的 worktree 佔用目標分支或其他衝突時，保留原狀並列出本機同步待辦；不自動 stash、reset、checkout 或覆蓋。這不改寫已確認的遠端合併結果。同步失敗要如實回報，不把遠端已合併與本機已更新混為一談。

遠端／本機 feature branch 是否刪除，依既有授權與專案政策；仍被 worktree 使用或有未保存工作時不刪本機分支。清理結果逐項回報，不能因合併成功便宣稱分支已刪。

---

## Step 6：回報完成

告知用戶：
- repo、PR、目標 `BASE`、本輪核對的 head／base SHA、審查與 CI 證據
- 沿用或新取得的授權範圍，以及實際狀態：未合併、排隊中或已合併
- 已合併時附 merge commit；另列本機同步及遠端／本機分支清理的實際結果或待辦
- 部署與業務／正式驗收另列，合併通過不代表這些階段也完成

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

- **目標 branch**：依 Step 0 的專案與使用者約定核對，不寫死 `main`
- **保護目標分支**：不以 force push、`--admin` 或移除 SHA 比對規避合併門檻
- **CI 必須全過才能 merge**：不跳過任何 failing check
- **`--no-verify` 禁止**：不跳過 commit hooks

---

## 範例觸發說法

- 「幫我 merge PR #24」
- 「/merge 24」
- 「把 PR 24 合進 main」
- 「squash merge PR #24」

## CLI 依據

- [GitHub CLI merge](https://cli.github.com/manual/gh_pr_merge)：head 比對、merge queue 與合併旗標。
- [GitHub PR reviews API](https://docs.github.com/en/rest/pulls/reviews#list-reviews-for-a-pull-request)：審查的 `commit_id`。
