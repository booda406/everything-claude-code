---
name: pr-followup
description: >
  Optional coordination after agent PR review (/review, /code-review): one-shot or --watch polling,
  triage version-bound Gate/CI evidence, and hand off to /merge with existing authorization or back to /dev.
disable-model-invocation: true
---

# PR 審查後續跟進（`/pr-followup`）

本 skill 是**選用的 PR 狀態協調入口**：需要等待審查、CI 或整理回饋時使用。它不重做深度 code review，也不另外定義合併門檻；合併前核對與實際執行統一依 **`skills/merge/SKILL.md`**。

## 與其他指令的分工

| 指令／skill | 時機 |
|-------------|------|
| **`/dev`** | 開發、測試與開 PR；有必改項或衝突時回到開發。 |
| **`/review`／`/code-review`** | 產出審查證據、阻擋項及 GitHub 審查結論。 |
| **`/pr-followup`** | **選用**：等待審查／CI、辨識證據版本並整理下一步。 |
| **`/merge`** | 審查與檢查就緒時，可直接使用；統一核對最新 SHA、專案目標分支、授權與合併狀態。 |
| **`/commit`** | 合併或階段收工後的 lessons learned 與文件整理。 |

沒有 PR 的本地工作不需要本 skill。已有最新有效審查與檢查、且已有合併授權時，直接交 `/merge`，**不必先跑 `/pr-followup`**。有未解阻擋項時回 `/dev`；等待或協調才選用本 skill。

## Phase 0 — 解析目標、模式與既有授權

### 0.1 `OWNER/REPO`、PR 編號 `N` 與工作目錄 `ROOT`

優先採用使用者指定的 repo／PR URL；否則由目前 clone 的 PR 與 remote 核對。分開記錄 host 與 `OWNER/REPO`；`gh pr` 使用 `--repo HOST/OWNER/REPO`，`gh api` 使用 `--hostname HOST` 且 API 路徑只放 `OWNER/REPO`。若僅有分支名，可用 `gh pr list --repo HOST/OWNER/REPO --head '<branch>' --state open --json number` 找單一 PR；零筆或多筆才請使用者釐清。

`ROOT` 由 `git rev-parse --show-toplevel` 取得（可執行時），用於讀取 `CLAUDE.md`、`AGENTS.md` 及本機審查 artifact。不同 repo 的同號 PR 不得共用狀態或授權。

### 0.2 模式旗標

| 旗標 | 意義 |
|------|------|
| **`--watch`** | 輪詢審查與 checks；預設間隔 60 秒、最多 30 輪，可用 `--watch-interval`／`--watch-max` 調整。 |
| **`--dry-run`** | 只讀取與回報，不交接執行合併、不改 PR、不清理分支。 |
| **`--merge`** | 使用者對本次目標的合併授權；就緒後交 `/merge`，仍須通過其全部門檻。 |
| **`--since <ISO8601>`** | 僅將指定時間後的留言／review 視為新一輪審查訊號，不代替 SHA 核對。 |

### 0.3 既有授權

- 沿用本次對話中已明確給出的合併授權，記錄其 **host、repo、PR／批次清單、目標分支、條件及是否限定 SHA**。`--merge` 不是唯一授權方式，沒有此旗標不代表先前授權失效；跨 host 不沿用同號 PR 的授權。
- 同一 repo、PR、目標分支及已約定工作範圍內，不因從 `/dev` 交接至本 skill 或 `/merge` 而重問。一般修正提交需要重新驗證證據，但不必然撤銷任務級授權。
- **`--dry-run`、使用者明確「不要合併」、撤回授權或更窄的新指示優先**。授權限定的 SHA 已變，或 repo、PR、目標分支／範圍超出授權時，停止合併交接並釐清。
- `--watch`、Gate OK、CI 綠及「幫我開發」本身都不構成合併授權。未授權時回報就緒程度與待決事項，不執行合併。

開始時簡述目標、模式及已取得的授權範圍；資訊已明確時不再請使用者重述。

## Phase 1 — 讀取目前 PR 版本與目標分支

```bash
gh pr view N --repo HOST/OWNER/REPO --json number,title,state,isDraft,mergeable,mergeStateStatus,baseRefName,baseRefOid,headRefName,headRefOid,reviewDecision,url
gh pr checks N --repo HOST/OWNER/REPO
```

- 記錄本輪 **`headRefOid`、`baseRefName`、`baseRefOid`**。目標分支依 `skills/merge/SKILL.md` 的專案政策與使用者指定解析，再與 PR 實際 base 比對；不寫死 `main`，不為配合流程自行改 PR base。
- Draft、衝突、目標不符或狀態未知都不能回報為就緒。`MERGED` 則核對合併結果後直接回報，不再次合併；`CLOSED` 且未合併時停止合併路徑。
- 等待中 head、base SHA 或目標分支變動時更新本輪版本，先前 Gate／CI 只保留作歷史；受影響證據需重新驗證。

## Phase 2 — 偵測審查訊號（可輪詢）

需要等待時讀取 PR 留言、正式 reviews，或本機 `ROOT/.claude/PRPs/reviews/pr-<N>-review.md`。API 結果須涵蓋目前相關審查，不只看一頁或假設 API 已由新到舊排列：

```bash
gh api --hostname HOST --paginate "repos/OWNER/REPO/issues/N/comments?per_page=100"
gh api --hostname HOST --paginate "repos/OWNER/REPO/pulls/N/reviews?per_page=100"
```

`Gate`、`Severity`、bot 作者、留言時間與 artifact 的 mtime **只用來觸發 Phase 3 查核**；它們不能證明目前 head 已受審。`--since` 也只是篩選訊號，不會使舊 SHA 的審查變成有效。

- **單次模式**：只讀一輪；證據尚未就緒時回報目前缺項，可依需要再呼叫或選 `--watch`。
- **`--watch`**：每輪重讀 Phase 1。發現可核對的結論後進 Phase 3；達最大輪數／期限仍無結果就回報最後狀態，不無限等待。等待工具每次不超過 60 秒，較長間隔分段等待；持續工作時維持簡短進度訊息，僅在重要狀態變化時通知結果。
- 本輪追蹤在目前工作中完成，不另外建立排程或自動化。

## Phase 3 — 核對證據版本與阻擋項

結合遠端 reviews／留言與本機 artifact，依 `skills/merge/SKILL.md` 的證據規則確認：

1. 正式 review 以 **`commit_id` 對應目前 `headRefOid`**，並核對是否仍為有效結論；留言或本機 artifact 須明示同一 repo、PR 與受審 SHA。缺少或無法對應 SHA 時列為「尚未證實」，不能以新 mtime 補足。
2. 核對審查適用的目標分支及 base／整合背景。base 已變時，由 `/merge` 重新驗證受影響的 review 與整合證據，不直接沿用舊結論。
3. **不以本機 artifact 優先蓋過遠端較新的阻擋**。若來源矛盾、存在未解 Must fix／其他專案阻擋，先列明待辦；需要改 code、更新分支或解衝突時交 `/dev`。
4. 證據完整且無阻擋時只標為「可交合併前檢查」，不是已授權或已合併。最新留言內容、PR 狀態欄或單一 Gate 都不單獨決定結果。

## Phase 4 — 核對必要檢查

- 重新查 checks，記錄其涵蓋的 head 與適用 base／整合提交；僅知道「綠燈」而無法核對所屬提交時，證據仍不完整。
- 依專案政策核對所有必跑檢查及本機驗證。失敗、pending、未知、無法讀取或沒有 checks 都不自動視為通過；專案明定不需 CI 時，須有適用目前提交的替代驗證證據，不能臨時由 agent 豁免。
- 需等待可回 Phase 2；檢查失敗交 `/dev`。就緒時進 Phase 5，由 `/merge` 在執行前再次確認版本與全部門檻。

## Phase 5 — 選擇交接

| 目前情況 | 下一步 |
|-----------|--------|
| 未解阻擋、失敗檢查、衝突或需改 code | 回 `/dev`，附 PR、版本與必改項。 |
| 審查／CI 尚未就緒或版本無法證實 | 回報缺項；需要等待時選用 Phase 2。 |
| 證據就緒，但未授權或為 dry-run／禁止合併 | 僅回報狀態與待決事項。 |
| 證據就緒，且既有授權仍涵蓋目前目標與範圍 | 讀取並依 `skills/merge/SKILL.md` 交接同一目標、版本與授權。 |

本 skill 不另執行直接合併、刪分支或 stash 流程，也不以交接摘要取代 `/merge` 的最後查核。若合併能力／規則不可用，回報缺少項目，不繞過門檻。髒工作區保留原狀，本機切換與更新的處理依 `/merge` 規則。

啟用 auto-merge、加入 merge queue 或命令成功退出都不等於已合併；只有查證 PR 為 **`MERGED`** 且取得合併 commit 後，才回報完成或進行已授權的合併後清理。

## Phase 6 — 專案追蹤收尾（選用）

依 `ROOT/CLAUDE.md`、`AGENTS.md` 或 `docs/context/ai-collaboration-and-tooling.md` 的約定及本次工作範圍，整理後續項與 handoff，沿用已有的 Notion／工單更新授權；不因跟進 PR 擴張到無關紀錄。

專案既有 `docs/context/implementation-notes.md` 需要階段結論時，依其格式記錄精簡 handoff 與 PR URL。合併、部署驗證、業務／正式驗收各自記錄，不把合併成功當成其餘項目完成。

## Phase 7 — 回報

- repo／PR 連結、目前 **head SHA、base 分支及 SHA**。
- review／Gate／checks 的適用版本、已確認結果與尚缺證據。
- 既有授權範圍，以及本次是否交接 `/merge`、是否仍在等待／排隊，或已核實 `MERGED` 與合併 commit。
- 分支清理與本機同步的實際結果／待辦，部署與驗收分開說明。
- `--watch` 時附輪數與觸發來源；需要修正則交 `/dev`，合併或階段收工後可依需求交 `/commit`。

## 維護

- 唯一原始維護位置：ECC 的 **`skills/pr-followup/SKILL.md`**。
- `scripts/sync-pr-followup-skill.sh` 是另行部署技能的入口；修改本檔不代表要執行同步，必須依使用者本次範圍決定。
