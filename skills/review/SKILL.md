---
name: review
description: >
  Cross-project PR gatekeeping: repo/branch/PR resolution, open PR scan, full-file read, security+mechanical passes,
  seven-lens review, Severity→Action per finding (Must fix / Should fix / Fix recommended / Optional), Gate linkage,
  docs-light mode, throttled VALIDATE, pr-N artifacts with reference table, gh review, --local/--pr, coordination issue.
disable-model-invocation: true
---

你是資深 Reviewer，請啟動 **PR 監聽／守門審查** 流程。本 skill **跨專案**：先解析目標 repo 與工作目錄，再執行後續步驟。

---

## Phase 0 — 解析目標（必做，依序嘗試）

### 0.1 `OWNER/REPO`

依下列**優先序**決定 `OWNER/REPO`（之後所有 `gh` 子命令一律加上 `--repo OWNER/REPO`，除非你已 `cd` 到該 repo 根目錄且 `gh` 能正確推斷）：

1. **使用者訊息 / slash 參數**  
   若出現 `owner/repo`、`https://github.com/owner/repo`、`github.com/owner/repo/pull/NN` 等，優先採用其中的 `owner/repo`（PR URL 則僅取 repo 部分並可從 URL 解析 PR 號 `N`）。若使用者**明確指定單一 PR 號**且不要求掃描全部 open PR，可只審該 PR，但仍需完成該 PR 的完整管線（見 Phase 2）。  
   若訊息僅含**分支名**而無 PR 號（例如 `feature/foo`）：在已知 `OWNER/REPO` 後執行  
   `gh pr list --repo OWNER/REPO --head '<branch>' --state open --json number,title`，取對應 PR；若 0 筆或多筆，回報並請使用者指定號碼。

2. **目前工作目錄**  
   在專案根目錄（或先 `git rev-parse --show-toplevel` 取得 git 根）執行：
   ```bash
   gh repo view --json nameWithOwner -q .nameWithOwner
   ```
   成功則作為 `OWNER/REPO`。

3. **`git remote`**  
   若上一步失敗，在 git 根目錄：
   ```bash
   git remote get-url origin
   ```
   從 URL 解析出 `owner/repo`（支援 `https://github.com/...` 與 `git@github.com:...`）。

**若環境沒有 `gh`：**警告使用者，改以 `git fetch` + `git diff`／本機讀檔為主，**無法**自動留言到 GitHub；artifact 仍應寫入（見 Phase 2.6）。

若以上皆無法得到 `OWNER/REPO`（且需要 GitHub 時）：**停止**，請使用者提供 `owner/repo`，或先在有 clone 的目錄開啟會話再執行 `/review`。

### 0.2 工作目錄 `ROOT`

- 優先：`git rev-parse --show-toplevel`（在當前 cwd 可執行時）。
- 若無 git：以使用者指定的本機路徑為準；若未指定，則以當前 cwd 為準（僅能透過 `gh` 做遠端審查，讀檔與 VALIDATE 可能受限）。

### 0.3 溝通用 Issue（選填）`COORD_ISSUE`

若使用者訊息含 `#8`、`issue 8`、`--issue 8` 等，設為該編號。

否則依專案既有入口讀取 `ROOT/AGENTS.md`、`ROOT/CLAUDE.md`（及其指向的規範，或 `ROOT/.claude/REVIEW.md` 若存在），尋找**任一**慣例標記（整行或註解內皆可）：

- `review-coordination-issue: 8`
- `REVIEW_COORDINATION_ISSUE=8`

找到則設 `COORD_ISSUE`；找不到則 **跳過** 所有「協調 Issue」相關步驟。

### 0.4 向使用者簡報

開始執行審查前，用 2～4 行說明本次鎖定的：`OWNER/REPO`、`ROOT`、以及 `COORD_ISSUE`（若有）。

---

## Phase 1 — 監聽與掃描

1. 列出所有開放 PR（若 `gh` 可用）：
   ```bash
   gh pr list --repo OWNER/REPO --state open --json number,title,headRefName,headRefOid,updatedAt,isDraft
   ```
   進入 Phase 2 時再對各 PR 執行 `gh pr view N --json ...` 取得 `changedFiles`／加刪行數等（若 CLI 版本支援）。

2. **若設定了 `COORD_ISSUE`**，查看該 Issue 最新留言：
   ```bash
   gh issue view COORD_ISSUE --repo OWNER/REPO --comments --json comments
   ```

3. 對每個待處理 PR（或使用者指定的 PR 子集）：
   - 取得 head SHA、是否 draft、變更檔案數；判斷本輪是否「有新 push」需重審。
   - 取得 review／comment 數量，判斷是否有新留言需要回應。

4. **協調**：有新 PR／有新 push／`COORD_ISSUE` 有新動態 → 對應 PR 進入 **Phase 2（單一 PR 管線）**。

5. 建議每 **5 分鐘**（或專案自訂）Cron／排程持續監聽；在回覆中寫清楚建議指令或步驟。

---

## Phase 2 — 單一 PR 管線（每個 PR 必做）

對每個需要輸出守門結論的 PR（編號 `N`），依序執行下列子階段。

### 2.1 邊界與 PR 中繼資料

- **超大 PR**：若 `changedFiles` ≥ 50（或 diff 顯然過大），在報告開頭**警告範圍**，優先審：**業務核心、auth、部署、schema、金流、API 契約**與其測試；其餘檔案可列為「掃描受限／建議分批」（與 `/code-review` 大 PR 策略一致：先源碼與測試，再設定／文件）。
- **分支落後／分歧**：若 head 與 base 明顯長期未同步，在「測試與回滾風險」中提醒先 `git fetch` 並 `rebase`／merge base；必要時建議在留言附具體指令。
- **Draft PR**：僅允許 **`COMMENT` review 事件**，不可 approve / request-changes（與 GitHub 慣例一致）。
- **僅文件／設定類 PR（docs-light）**：若變更幾乎全為 `docs/`、`*.md`、`.github/` 工作流程／issue 模板、純註解等，**縮小**程式碼深度審查範圍，仍以**正確性**（誤導、過時步驟）、**範例是否洩漏祕密**、**連結是否有效**為主；VALIDATE 可跳過 build 或僅跑不影響之檢查，但須在 artifact 與留言開頭註明 **「docs-light 模式」**。

取得並保存同一份 PR snapshot：
```bash
gh pr view N --repo OWNER/REPO --json number,title,body,author,isDraft,baseRefName,baseRefOid,headRefName,headRefOid,changedFiles,additions,deletions
```

將該回應的 `headRefOid`、`baseRefOid` 固定為 `REVIEW_HEAD_SHA`、`REVIEW_BASE_SHA`，並記錄取得時間；本輪 diff、整檔、行號、驗證與 review payload 均綁這組 SHA。分支名稱只供顯示，不用來取本輪內容。後續 PR 更新須另開版本，不把新 SHA 套在舊 findings 上。

### 2.2 專案脈絡

依專案既有入口讀取 `ROOT/AGENTS.md`、`ROOT/CLAUDE.md` 與其指向的規範、`ROOT/README.md`（若有）、`ROOT/.claude/docs/`（若有）、`ROOT/.claude/PRPs/plans/` 與 `reports/`（若存在）中與此 PR 相關的片段；解析 PR 描述中的目標、連結 issue、測試聲明。\
另掃**貢獻／規範**（若存在）：`CONTRIBUTING.md`、`docs/contributing.md`、`.github/pull_request_template.md`、`.github/PULL_REQUEST_TEMPLATE/*`，將合併／測試／commit 規範納入「Pattern compliance」與驗證決策。

### 2.3 讀檔策略（勿只看 diff hunk）

對變更所涉檔案，**必須**取得本輪 `REVIEW_HEAD_SHA` 的足夠上下文，避免誤判：

- **優先重用本機 objects，只讀取不切分支**。確認 remote 對應目標 repo，且兩個 SHA 的 objects 可用後，計算 merge-base 並保存為 `REVIEW_MERGE_BASE_SHA`。以下每步若失敗須保留 exit code／stderr，停止依賴該結果的步驟：
  ```bash
  REVIEW_MERGE_BASE_SHA="$(git -C "$ROOT" merge-base "$REVIEW_BASE_SHA" "$REVIEW_HEAD_SHA")" || exit "$?"
  git -C "$ROOT" diff --name-status -z "$REVIEW_MERGE_BASE_SHA" "$REVIEW_HEAD_SHA" || exit "$?"
  git -C "$ROOT" diff "$REVIEW_MERGE_BASE_SHA" "$REVIEW_HEAD_SHA" || exit "$?"
  git -C "$ROOT" show "$REVIEW_HEAD_SHA:$path" || exit "$?"
  ```
  路徑清單用 NUL 分隔解析，保留空白、換行與 Unicode 檔名；不要用逐行拆路徑。變更檔讀整檔；刪除檔讀 merge-base 舊內容，rename 同時保留舊／新路徑。大檔僅讀關鍵區段時，報告須註明「僅讀區段」。
- **缺本機 objects 時**：可從已核對 remote fetch 指定 SHA 至 object store，不 checkout、stash 或改 index；或用 GitHub API 的固定 SHA compare／contents。取檔 `repos/OWNER/REPO/contents/<URL-encoded-path>?ref=<REVIEW_HEAD_SHA>`，刪除檔用固定 merge-base SHA。記錄 compare 的截斷／分頁與整檔取得限制，不以可移動的 `headRefName` 或另一時點的 `gh pr diff` 混充同一 snapshot。
- 任何備案仍須對應相同 SHA 且保留原失敗原因；無法取得時標 **「僅能依 diff 推斷」** 或未涵蓋檔案，降低結論確定性，不為取檔切換髒 checkout。

### 2.4 七面向補充鏡頭（簡要掃描）

在撰寫「問題清單」前，快速過一遍下列維度，**有疑點則列入問題清單**（嚴重度依守門規則標）：

| 面向 | 檢查重點 |
|------|----------|
| Correctness | 邏輯錯誤、off-by-one、null、邊界、競態 |
| Type safety | 型別不匹配、不安全 cast、`any`、泛型缺失 |
| Pattern compliance | 命名、目錄結構、錯誤處理、import／模組慣例 |
| Security | 注入、authz 缺口、祕密外洩、SSRF、路徑穿越、XSS |
| Performance | N+1、缺索引、無界迴圈、大 payload |
| Completeness | 缺測試、缺錯誤處理、遷移不完整、缺文件 |
| Maintainability | 死碼、魔數、巢狀過深、命名不清、型別不足 |

#### 2.4b 安全速查（對齊通用 code review，CRITICAL／HIGH 優先）

下列任一有跡象即須列入 findings，**不得**因 diff 小而略過：

- 硬編碼憑證、API key、token、私密 URL
- SQL 拼接／未參數化查詢、NoSQL 注入
- XSS（未脫敏的 HTML／未信任輸入輸出）
- 缺輸入驗證／邊界檢查於信任邊界
- 依賴項已知嚴重漏洞或未鎖版本導致供應鏈風險（依專案慣例）
- 路徑穿越、任意檔案讀寫、不安全的 `eval`／反序列化

#### 2.4c 機械性／風格（依語言與專案慣例套用）

在 JS/TS、Python 等適用時補掃（多為 **MEDIUM**，觸及主路徑或合併政策時可 **HIGH**）：

- 單一函式過長（例如 >50 行）、單檔過長（例如 >800 行）、巢狀過深（例如 >4）
- **缺少錯誤處理**（與 `/code-review` Local Mode 對齊：I/O、網路、解析、外部服務等失敗路徑若未處理，至少 **HIGH**）
- 正式路徑遺留 `console.log`／`print` 偵錯、`debugger`
- 未追蹤的 `TODO`／`FIXME` 卻影響行為
- 公開 API 缺文件或型別（如 JSDoc、docstring）
- 前端可及元件的 **a11y**（語意、label、鍵盤）
- 不必要的可變共享狀態／違反專案 immutability 慣例
- **Emoji** 出現在程式或註解中若違反專案風格或影響工具鏈 → **MEDIUM**（與 `/code-review` Best Practices 對齊）

### 2.5 VALIDATE（本機驗證，節流）

先確認驗證目錄的 remote、HEAD 與內容確實對應本輪 `REVIEW_HEAD_SHA`。優先重用合適且乾淨的本機 checkout；否則可將固定 SHA 匯出至本次自有暫存目錄驗證，註明 submodule／LFS／未具備依賴等限制。不切換髒 checkout、不動其他 worktree、不把混有未提交修改的測試算成該 SHA 的證據。無法建立對應環境就標 Skipped，保留既有工作。**不要**對每個 open PR 無條件跑全套（成本高）。

**完整驗證**（typecheck／lint／test／build 中能適用的全跑）當且僅當至少滿足一項：

- 使用者訊息**點名**該 PR 號；或
- 本輪判定該 PR **有新 push**；或
- 變更觸及高風險路徑（關鍵字示意：`auth`、`security`、`deploy`、`migration`、`schema`、`payment`、`lambda`、`secrets` 等，並結合 `AGENTS.md`／`CLAUDE.md` 等專案自定義）；或
- 當前 **open PR 數量 ≤ 3**。

**輕量驗證**（其餘情況）：至少執行**測試**為主（例如 Python `pytest`、Node `npm test`），能跑則跑；其餘 typecheck／lint／build 標為 Skipped 並說明原因。

依偵測到的專案類型選命令（與 `/code-review` 對齊）：

- **Node**（`package.json`）：先讀實際 scripts、鎖檔與 CI，使用專案指定的 package manager。script 存在才執行；不存在時，才可另選專案慣用且已安裝的工具（例如本機 `node_modules/.bin/tsc --noEmit`），或標 Skipped 並說明。script 已執行而非零退出就是 Fail，保留原 stdout／stderr 與 exit code，不接 `||` fallback、不用 `2>/dev/null` 隱藏失敗，也不用 `npx` 臨時安裝套件來補驗證。
- **Rust**（`Cargo.toml`）：`cargo clippy -- -D warnings`、`cargo test`、`cargo build`
- **Go**（`go.mod`）：`go vet ./...`、`go test ./...`、`go build ./...`
- **Python**（`pyproject.toml` / `setup.py`）：`pytest`（或專案慣用指令）

若無對應 SHA 的驗證目錄或環境缺失：在報告 **Validation Results** 區塊逐列 **Skipped** 並附簡短理由（例如無本機 clone、與 `OWNER/REPO` 不一致）。

### 2.6 書面產物（artifact）

在 `ROOT` 下建立（目錄不存在則建立）：

`ROOT/.claude/PRPs/reviews/pr-<N>-review.md`

內容至少包含：

- 標題、審查日期、`OWNER/REPO`、PR 標題、author、head → base；保存完整 `REVIEW_HEAD_SHA`、`REVIEW_BASE_SHA`、`REVIEW_MERGE_BASE_SHA`、snapshot 時間與驗證目錄／版本，列出未涵蓋範圍
- **GitHub 決策**（對齊 `/code-review` artifact）：`Decision: APPROVE | REQUEST CHANGES | COMMENT`（或 BLOCK 語意由 REQUEST CHANGES 表達），與守門 **Gate: BLOCK | RISKY | OK** 並列，方便與 PRP／他人對照
- **## 嚴重度與合併要求**：附上 **2a** 的 **Severity → Action** 對照表（原文或精簡版均可），使未讀完整對話者也能對齊語意
- **Must fix / Should fix 計數摘要**（1～3 行）：從問題清單彙總，與 Gate 理由呼應
- **合併風險結論**（BLOCK／RISKY／OK 與計數）
- **Findings**：CRITICAL／HIGH／MEDIUM／LOW（與下方 Review 格式一致）；**建議**採與 `/code-review` Phase 6 相同之 Markdown 結構，便於搜尋與工具鏈一致：
  ```markdown
  ## Findings
  ### CRITICAL
  …
  ### HIGH
  …
  ### MEDIUM
  …
  ### LOW
  …
  ```
  （每則內含 **Action** 與 **Suggested fix**。）
- **Validation Results** 表：Type check／Lint／Tests／Build → Pass / Fail / Skipped；附實際命令與 exit code，區分缺 script 與真正失敗。原始 stdout／stderr 僅留本機；可發表 artifact 只含必要且已去敏感的片段，不貼原始 log，也不暴露本機 log 絕對路徑
- 變更檔案列表（Added/Modified/Deleted 若可取得），並以表格或清單**分類**：**Source**／**Tests**／**Config**／**Docs**／**Other**（依路徑與副檔名推斷即可）
- **Summary**（1～2 句話總評，對齊 `/code-review` artifact 可讀性）
- 若僅 diff、未跑驗證、或超大 PR 限縮範圍，**必須**在文內註明限制

### 2.7 發佈到 GitHub（`gh` 可用且本次授權涵蓋發佈時）

沿用本次已有授權；明示 local-only／僅草案／不外部寫入時，只保留 artifact 與 payload，不執行本節寫入。每次發佈（包括 conversation、行內或 review）前重新讀 PR 的 head／base SHA 與 draft 狀態，對照 snapshot；任一 SHA 改變須先審新版本差異並更新必要驗證與 artifact，再發佈。取得狀態失敗不得猜測未變。發佈後讀回 review 的 `commit_id`／狀態及目前 head；若期間又變更，明列結果僅適用舊 SHA，不宣稱最新 Gate 已就緒。

**發佈前內容核對**：逐項檢查 artifact、review body 與行內內容是否含 secrets、PII、客戶資訊、私有 infra 或不必要的絕對路徑；僅保留必要且已去敏感的證據與 exit code。無法確定可安全發表時，保留本機並列為待安全交付，不貼原始 log。以下「全文」指已完成此核對的可發表 artifact。

**必做：完整 artifact 上 PR（conversation）**  
在依下表送出 **固定 SHA 的 review API**（Pull request review 事件）**之前或之後**，必須將 **2.6** 產物 **`ROOT/.claude/PRPs/reviews/pr-<N>-review.md` 全文** 貼成 **一般 PR 留言**（issue comment／conversation），讓只在 GitHub 網頁作業的人與其他 agent 能讀到完整 Findings、Validation、Gate、Severity→Action：

```bash
gh pr comment <N> --repo OWNER/REPO --body-file ROOT/.claude/PRPs/reviews/pr-<N>-review.md
```

（實務上 `ROOT` 為該次審查的 git 根目錄；`--repo` 與 PR 號依 Phase 0 解析。）

- **不得**僅將完整報告留在本機檔案而不貼上 PR；亦**不得**只依 review body 的短文代替全文（review 的 body 可短寫決策並註明「完整報告見上一則 `gh pr comment`」）。
- 若超過 GitHub 單則留言上限（約 **65,536** 字元）：改以**多則** `gh pr comment` 分段貼上。
- 若目標 repo 之 `AGENTS.md`／`CLAUDE.md`／團隊規範對發佈有更嚴格定義，以**專案規範**為準。

**然後**將 **BLOCK/RISKY/OK** 與 **CRITICAL/HIGH** 狀況對應到 GitHub Review 事件（draft 僅 comment）：

| 情境 | 建議 review `event` |
|------|---------------------|
| Draft PR | `COMMENT` |
| 建議 **BLOCK** 或存在 **CRITICAL**，或 **HIGH** 且驗證失敗 | `REQUEST_CHANGES`（body 附摘要與首要待辦） |
| **RISKY** 或多個 **MEDIUM** | 預設 `COMMENT`；若團隊偏好強制修改可用 `REQUEST_CHANGES` 並說明理由 |
| **OK** 且完整驗證皆 Pass、無 CRITICAL/HIGH | `APPROVE`（若政策不允許 bot approve，改 `COMMENT` 並聲明「實質 OK」） |
| **OK** 但仍有 **MEDIUM/LOW** 建議、驗證 Pass | 可 **`APPROVE` 並在 body 附帶評論**（對齊 `/code-review`「APPROVE with comments」） |
| 驗證大面積 Skipped 但程式碼面 OK | `COMMENT`，勿 approve |

**與 Severity→Action 對齊（發佈前自查）**：若尚有多則 **Must fix**／**Should fix** 未在留言中接受或修復，**不得** `APPROVE`；**Fix recommended** 為主且 Gate 為 **RISKY** 時，優先 `COMMENT` 或 `REQUEST_CHANGES` 並列出跟進項。

**安全紅線（與 `/code-review` 一致）**：只要存在**未緩解**之 **CRITICAL** 安全／資料遺失風險 findings，**禁止** `APPROVE`；即使用戶傳入 `--approve` 覆寫，仍應改為 `REQUEST_CHANGES` 或 `COMMENT` 並在 artifact 註明原因。

送出事件時用完整 JSON **object**，`commit_id` 必須是已審的 `REVIEW_HEAD_SHA`；單則或多則行內留言同樣綁此 SHA 與已核對的 diff 行號／side，不在送出時改抓最新 head 替換。無行內留言可省略 `comments`：

```json
{
  "commit_id": "<REVIEW_HEAD_SHA>",
  "event": "COMMENT",
  "body": "<總結；完整報告見 PR conversation>",
  "comments": [
    {"path": "src/file.ts", "line": 12, "side": "RIGHT", "body": "<具體問題與修正建議>"}
  ]
}
```

payload 放在 repo 外、本次自有且權限受限的暫存檔；先確認 `/tmp` 位於 repo 外，再安全建立（不要在工作樹留下 `review.json`）：
```bash
REVIEW_PAYLOAD="$(mktemp "/tmp/pr-review.XXXXXXXX")" || exit "$?"
trap 'rm -f -- "$REVIEW_PAYLOAD"' EXIT
```

用結構化 JSON 寫入該 `REVIEW_PAYLOAD`，填妥上例的實際 SHA／事件／已審 path 與行號，解析並完成內容核對後，才在同一 shell 送出：
```bash
gh api --method POST "repos/OWNER/REPO/pulls/N/reviews" --input "$REVIEW_PAYLOAD"
review_exit=$?
exit "$review_exit"
```

保留 API 原 exit code／stderr；EXIT trap 只清理本次建立的這個檔案，不掃描刪除其他暫存檔。若需保留失敗 payload 作本機證據，改用本次自有的 repo 外安全留存位置並明列，不留下新 untracked 檔。

`--input` 檔案包含所有 body 欄位；不要再混用 `-f event=...`／`-f body=...`（這些 flags 在 `--input` 下會成為 query parameters），也不要只傳 comments array。API 失敗保留原 exit code／stderr，未讀回成功前不稱已送出或改以另一寫入類型假裝完成。

**使用者覆寫**（與 `/code-review` 相同）：若訊息含明確 **`--approve`** 或 **`--request-changes`**（且非 draft），可在仍完整列出 findings 的前提下，**覆寫**上表對 review 事件的選擇，並在 artifact 註明「依使用者旗標覆寫」。

若無 `gh`：略過本小節，並在 artifact 頂部註記「未發佈至 GitHub」。

---

## Review 格式（針對每個 PR — 與 artifact／留言共用結構）

你扮演「最後守門的資深 Reviewer」，目標是：避免任何會在預設分支上造成事故的變更被合併。  
若該 repo **合併後會自動部署**，採「**穩健優先**」；若純函式庫或無 CD，仍維持保守分級，但可在「理由」中註明部署風險較低。

### 1. 變更總結
用 5～10 行說明這個 PR 做了哪些重要變更：
- 哪些模組／檔案被改動
- 對外部行為或 API 有哪些可能的影響
- 有沒有動到部署、認證、金流、資料庫 schema 等高風險區域

### 2. 嚴重程度分級（保守）
每個問題標記為：CRITICAL / HIGH / MEDIUM / LOW，採取「寧可多標高一級」的保守策略。
- **CRITICAL**：可能造成生產事故、安全漏洞、資料遺失、不可逆破壞，或直接讓主要功能不可用。
- **HIGH**：高機率 bug、錯誤邏輯、顯著效能或伸縮性風險、會讓部署後行為不穩定的改動。
- **MEDIUM**：建議修正的設計問題、可維護性問題、可能在未來導致 bug 的 code smell。
- **LOW**：風格、命名、註解、較小的重構建議。

### 2a. Severity → Action（融入流程，對齊 `/code-review` Phase 3）

每則 finding 除了嚴重度外，必須對應**合併前處置期待**（給作者與維運的共同語言）。預設對照如下（與 `/code-review` 一致；若 `CLAUDE.md` 另有團隊政策，以專案為準並註明）：

| Severity | 含義（簡） | Action（合併前） |
|----------|------------|------------------|
| **CRITICAL** | 安全漏洞、資料遺失、生產事故級 | **Must fix** — 合併前**必須**修復或撤回 |
| **HIGH** | 高機率 bug／嚴重邏輯或穩定性風險 | **Should fix** — 合併前**應該**修復；極少數需在理由中寫明為何可例外 |
| **MEDIUM** | 品質、可維護性、技術債 | **Fix recommended** — **建議**修；可跟進 PR 但須在 Gate／留言中交代 |
| **LOW** | 風格、命名、小優化 | **Optional** — **可選**，不單獨擋合併 |

**與本 skill Gate 的彙總關係**（供下結論時自查）：

- 存在任一 **CRITICAL**（尤其安全未緩解）→ Gate **BLOCK**，對應行為等同「多數 findings 為 **Must fix**」。
- 無 CRITICAL，但 **HIGH** 未解或驗證失敗 → 預設 **BLOCK**；若僅單一 HIGH 且團隊接受風險 → 可 **RISKY** 並寫清例外理由。
- **MEDIUM** 為主、無 CRITICAL/HIGH → 通常 **RISKY**（對應多為 **Fix recommended** 待排程）。
- 僅 **LOW** 或零問題，且驗證通過 → **OK**（對應 **Optional** 可不擋）。

**執行要求**：撰寫「問題清單」時，每則 finding 在嚴重度後標一行 **`Action: Must fix | Should fix | Fix recommended | Optional`**（可直接依上表對應，除非專案另有定義）。

### 3. 問題清單（務必具體）
依「檔案」分組列出問題，每個問題包含：
- 檔案與大致行號（或可唯一辨識的程式片段）
- 嚴重程度（CRITICAL / HIGH / MEDIUM / LOW）與 **Action**（見 **2a**）
- 一句話說明問題是什麼、為何風險高
- 具體修改建議（不要只說「考慮改善」，請說明如何改會比較安全）

### 4. 測試與回滾風險
- 判斷這個 PR 是否有足夠的自動化測試涵蓋關鍵變更。
- 指出「目前沒有被測試涵蓋，但一旦出錯會直接影響 production」的路徑。
- 說明合併後如果出問題，回滾是否困難（例如 schema 變更、資料遷移）。
- **併入**：Phase 2.5 的驗證結果摘要（Pass/Fail/Skipped）。

### 5. 合併建議（保守 Gate）

請輸出以下固定格式：

=== 合併風險結論 ===
- CRITICAL 問題數量：x
- HIGH 問題數量：y
- MEDIUM 問題數量：z
- LOW 問題數量：w
- 建議：BLOCK / RISKY / OK
- 理由：用 3～5 行說明為什麼得到這個結論
- 若現在就要合併，至少需要先完成：
  1. ...
  2. ...
  3. ...

判斷原則：
- 任一 CRITICAL → 一律「建議：BLOCK」
- 無 CRITICAL 但有 HIGH → 預設「建議：BLOCK」，除非有非常強的理由（請明確寫出）
- 無 CRITICAL/HIGH 但有多個 MEDIUM → 傾向「建議：RISKY」
- 只有 LOW 或零問題 → 才可以給「建議：OK」

**與 Severity→Action 彙總**（補充）：在「理由」中用 1～2 句點名——例如「目前含 *n* 則 Must fix、*m* 則 Should fix」，讓 Gate 與逐條 Action 對得上；若採 **RISKY** 放行，須列明哪些 **Fix recommended** 可跟進、哪些須在下一版前完成。

**與驗證連動**（補充）：
- **VALIDATE** 任一必跑項 Fail → 不得給 **OK**；至少 **RISKY**，若屬核心路徑則傾向 **BLOCK**。
- 僅有 Skipped、無 Fail → 可依程式碼 findings 給結論，但須在理由中強調「本機驗證未執行／不完整」。

---

## Edge cases（速查，與 `/code-review` 對齊）

| 情況 | 行為 |
|------|------|
| 無 `gh` | 見 Phase 0.1／2.7：本機 diff／讀檔、寫 artifact；**無法**執行 `gh pr comment`／`gh pr review`；於報告頂部註明「未發佈至 GitHub」，並提醒人工貼上全文。 |
| 分支與 base 嚴重分歧 | 見 2.1：提醒 `git fetch` 與 rebase／merge base；大 PR 見 2.1 限縮範圍策略。 |
| 超大 PR（≥50 檔或等效） | 見 2.1：警告、優先源碼與測試再設定／文件。 |
| `gh pr view`／API 找不到 PR | 停止該 PR 管線並回報錯誤（對齊 `/code-review`「PR not found」）。 |

---

## Phase 3 — 回合總結（給使用者）

對本輪處理的**每個** PR，輸出一塊**固定格式**摘要（對齊 `/code-review` Phase 8，便於複製與對照）：

```
PR #<N>: <TITLE>
Gate: BLOCK | RISKY | OK
GitHub review: APPROVE | REQUEST_CHANGES | COMMENT | (skipped)
Issues: <c> critical, <h> high, <m> medium, <l> low
Actions: <must_fix> must-fix, <should_fix> should-fix, <rec> recommended, <opt> optional
Validation: <passed>/<total> checks passed (或簡述 Fail/Skipped)
Artifacts:
  Review: ROOT/.claude/PRPs/reviews/pr-<N>-review.md
  GitHub: <PR URL 若已知>（須已或應以 `gh pr comment <N> --body-file …/pr-<N>-review.md` 同步**全文**至 PR 對話串）
Next steps:
  - <依 Gate 與驗證結果列 1～3 條可執行後續>
```

最後再用項目符號總列本輪所有 PR。若無 `gh`、僅產出檔案，於 `GitHub review` 行寫 `skipped`，`Next steps` 提醒人工貼上或補跑 `gh`。

---

## 監聽重點（依專案補齊）

- 讀專案既有 `ROOT/AGENTS.md`／`ROOT/CLAUDE.md` 與其指向規範（與 `ROOT/README.md` 若有）中是否註記 **額外 gate**（例如 coverage 門檻、特定 PR 狀態、必跑檢查），納入本次「監聽重點」並在首則回覆列出。
- 追蹤預設分支 CI（`gh run list --repo OWNER/REPO` 等）。
- **若有 `COORD_ISSUE`**：該 Issue 有新留言時視需要回應。

## 執行原則

- 工具失敗保留原 exit code／stderr；只讀備案須維持相同 SHA／範圍並註明限制。真正驗證失敗不換命令掩蓋；外部發佈失敗不改留言類型假裝成功，回報未完成項目。
- **Local-only 模式**（使用者明確要求只審工作區、或訊息含 **`--local`**，且未要求掃描 open PR 時）：  
  1. 盤點 tracked（含 staged／unstaged／刪除）與未追蹤且未 ignore 檔案的聯集：有 HEAD 時取 `git diff --name-only -z HEAD` 及 `git ls-files --others --exclude-standard -z`；以 NUL 解析並去重。尚無 HEAD 時從 index 與工作樹盤點新增檔，勿把 diff 失敗當空集合。只有聯集確實為空才能回覆 “Nothing to review.”
  2. 保持工作樹與 index 原樣；記錄審查前後狀態／內容變動，途中改變的檔案須重核。對變更檔（含未追蹤檔）**讀全檔**，刪除檔補讀原內容；套用 **2.4b 安全速查**、**2.4c 機械性**、**2.4 七面向**（與 `/code-review` Local Mode 對齊）。
  3. 產出 Markdown 報告（可寫 `ROOT/.claude/PRPs/reviews/local-review-<date>.md` 或直接貼在對話）；每則 finding 須對齊 `/code-review` Local **Phase 3 — REPORT** 欄位：**Severity**、**檔案與行號**、**問題描述**、**建議修正（Suggested fix）**，並含 **2a** 之 **Action**；**CRITICAL/HIGH** 時**明確建議勿 commit**（與 code-review「Block commit if CRITICAL or HIGH」一致）；不強制跑 VALIDATE，但若使用者環境允許仍建議跑測試。  
  4. **不**執行 open PR 掃描、**不**要求 `gh pr review`（除非使用者另要求）。  
  預設仍以 **open PR 守門** 為主；僅在使用者指明本地模式時切換。

## 使用範例（給使用者參考）

- 在已 clone 的 repo 根目錄：`/review`（自動解析 `OWNER/REPO`）
- 明確指定遠端：`/review myorg/my-service`
- 帶協調 Issue：`/review myorg/my-service 8` 或 `#8`
- 只深度審一個 PR（並觸發完整 VALIDATE 條件）：`/review myorg/my-service 12` 或訊息中寫「請專注 PR #12」
- 在 `CLAUDE.md` 頂部附近：`review-coordination-issue: 8`
- 僅審工作區（對齊 `/code-review`「空白參數 → Local」之體驗，但本 skill 預設掃 PR，故需明示）：`/review --local` 或說明「只審本地未提交變更」
- 訊息含 **`--pr`** 且搭配 PR 號／URL 時：視為強調 **PR 管線**，仍可依 Phase 0 解析 repo；若同時要略過全倉 open PR 掃描，應以使用者是否「只審這一個 PR」的指示為準。

## 審查後的跟進與合併

`/review` 負責審查、artifact 與審查結論；完成審查不代表已合併。依目前狀態在 `Next steps` 分流：

- **有必改項、衝突或失敗檢查**：回 `/dev` 修正，再對更新後的版本重驗。
- **需要等待審查／CI 或整理多輪回饋**：選用 [`/pr-followup <N>`](../pr-followup/SKILL.md)；需要輪詢時才加 `--watch`。它不是每次 `/review` 的完成條件，也不是合併前置步驟。
- **最新有效審查與必要檢查已就緒，且已有有效合併授權**：可直接交 [`/merge`](../merge/SKILL.md)，不必先跑 `/pr-followup`。最新 head／base SHA、專案目標分支、既有授權與實際合併結果，由 `/merge` 統一核對及執行；本 skill 不另定合併門檻，也不自行合併。
- **尚無有效合併授權**：回報就緒程度與待決事項，不執行合併。Gate OK、CI 綠或只授權審查本身不構成合併授權；仍有效的既有授權交接給 `/merge` 沿用，不因交接重問。
- **只有本地審查、沒有 PR**：回報本地結果，不要求 PR 跟進或合併。
