---
name: commit
description: >
  End-of-day Git workflow: analyze scoped changes, project lessons (AGENTS.md/CLAUDE.md and existing rules),
  implementation notes, docs hygiene, English Conventional Commits with Co-authored-by, then commit.
disable-model-invocation: true
---

# 每日工作結束：Commit 流程

工作告一段落時，請依照本流程協助完成 git commit。沿用本次已授權的 repo、branch、檔案／hunk 與外部同步範圍；工作區既有變更不會因本流程自動變成本次提交。已明示不同步、不提交或只要草案時，遵守該界線。

## 你要做的事

1. **分析變更 (Analyze Changes)**
   - **全面檢查**：執行 `git status` 與 `git diff --stat` 列出所有變更檔案。
   - **深入檢視**：針對清單中不熟悉的檔案，務必執行 `git diff <filename>` 確認具體修改內容（避免遺漏早期實作的功能）。
   - **分類歸納**：依修改內容，歸納「今日工作內容」（包含：功能 feat、修復 fix、重構 refactor、效能 perf、測試 test、文件 docs 等）。
   - **提交範圍**：從本次任務與既有授權列出精確檔案／hunk；分開記錄範圍外的 staged、unstaged、untracked 變更，不移除、不順便納入。同檔混有他人或本次範圍外修改時，僅選入已授權 hunk；無法安全分離時才把該項列入待確認清單。

2. **歸納學習經驗 (Lessons Learned)**
   - **回顧對話與決策**：回想本次開發過程中，是否有「需反覆提醒 AI 的行為」或「本次實作／根因紀錄」值得留存。
   - **判斷類型後更新對應檔案**（二選一，勿混用）：
     - **AI 行為規則**（你會一而再提醒 AI 的準則）→ 先讀專案既有入口與共用／轉介約定，在本次授權範圍內窄幅更新：
       - **`AGENTS.md`**：Codex 的專案入口；不把只寫 `CLAUDE.md` 當成 Codex 已可讀取
       - **`CLAUDE.md`**、**`.cursor/rules/lessons-learned.mdc`**：依專案現有 Claude／Cursor 用法維護；已有共用或轉介時沿用，不為本次收尾另建三份重複全文
       範例：Commit 前必須全量 git diff、重構後要檢查 import、部署問題先本機釐清、containedIn 過長要分批、mock 要覆蓋 named exports。
       格式：簡短規則 + 必要時 do/don't 範例；不寫成單次修法紀錄。
       **重要**：這類修改**必須在觸發它的功能 PR 的同一 branch 上 commit**，隨功能一起進 PR，**不可**等功能 PR 合併後再補開獨立薄 PR。若已錯過，在下一個功能 PR 帶入，而非單獨開一個 2 行的 docs PR。
     - **專案實作／根因筆記**（單次修法、根因分析、規格決定）→ 更新 **`docs/context/implementation-notes.md`**
       範例：某次統計 fallback 順序修正、某次 RangeError 根因與 patch、Print 斗燈 arrObj 修法、睡眠喚醒 loadWithTimeout 實作。
       格式：日期 + 標題 + 現象/根因/修法，供人類查閱與除錯。
   - **判斷標準**：若「三個月後你還會對 AI 說一次」→ 行為規則；若「查 code 或除錯時才會翻」→ 實作筆記。
   - **Skill 流程缺口**：若發現 `/commit`、`/done`、`/dev` 等 skill 有問題，先列出具體修正與正本位置；只有本次授權包含技能維護時才更新該正本。不要把收尾擴成修改安裝副本、跨 harness 同步或個人記憶寫入。

3. **文件檢視與整理**
   - **該更新的要更新**：依今日程式變更，檢查 `docs/` 與 README 是否需同步更新（例如架構改動後更新 ARCHITECTURE.md、FOLDER_STRUCTURE.md；新增功能或流程時更新 TESTING.md、TROUBLESHOOTING.md、README 連結等）。
   - **短暫／中途文檔要清理**：辨識開發過程中產生的**暫時性**文檔（例如單次 session 筆記、僅供當日參考的 checklist、重複或已被合併的說明）。這類檔案應：
     - 若內容已無保留價值 → 建議刪除，或從版控移除（並可加入 .gitignore 若為個人筆記）。
     - 若內容有價值但屬過渡 → 建議合併進正式文件（如 TESTING.md、某個 E2E 說明）後刪除原檔。
   - 將「建議更新／建議刪除或合併」的具體項目列出給使用者確認，再執行對應的編輯或刪除；若有爭議可交由使用者決定。

4. **Notion 專案同步（專案有設定，且本次授權涵蓋同步時）**

   讀取 `AGENTS.md`／`CLAUDE.md` 及其既有轉介中的 `## Notion Task Board`，取出 `Data source ID` 與欄位約定。未設定、未授權或已明示不做 Notion 同步時，跳過外部寫入並回報待辦；不影響其他已授權的本地工作。

   每次寫入前 fetch 當前任務內容及目標 schema，依現存欄位／選項做最小更新；寫後逐筆 readback 核對內容、狀態與勾選項。fetch／寫入／readback 失敗時保留未確認狀態，不以送出成功取代回讀驗證。

   以頂尖 PM 的視角，根據本次工作段落（Step 1 歸納的變更 + 對話中浮現的問題），依序執行以下四個動作：

   **4a. 關閉已完成的任務**
   - 用 `notion-search`（指定 data source）找出與本次工作相關、尚未關閉的任務
   - **只搜主看板不夠**：若專案設定另含 bug／feature DB，也搜尋本次授權範圍內的相關項目；功能描述有交集只代表候選，不能一併標 Done。搜尋至少兩個 query 角度（功能名稱 + 技術關鍵字），如有權限或分頁缺口則明列，不能宣稱沒有遺漏。
   - **逐項對照驗收條件與證據**：實作、離線測試、PR merge、部署健康、真實事件／正式業務驗收分開記錄。只有符合該任務既定 Done 條件才改 Done；PR merge 或服務已上線本身不代表全部驗收完成。
   - 每個 Sub-task 只在有對應完成證據時勾選；未驗證項保留 `- [ ]`，附「本期未取得」及具體後續查核目標，依專案 schema 保留進行中／Tracking。不得製造交易或其他業務資料補驗收。
   - 補充 `## 完成記錄`（部分完成時用進度記錄）並逐項列證據與缺口；保留原任務與未完成子項，不整段覆蓋或全勾。

   ```markdown
   ## 完成記錄

   **完成日期**：YYYY-MM-DD
   **關聯 PR**：PR #XX（一句話描述）

   ### 實作方案
   - 核心變更條列

   ### 測試結果
   - unit tests 通過情形
   - E2E 驗證結果（若已完成）
   ```

   **4b. 建立新任務（工作中浮現的問題 / 衍生待辦）**
   - 來源：本次修法過程中發現的 bug、技術債、或 review 指出但未在本 PR 處理的項目
   - **先搜尋**確認無重複任務，再建立；若已有相關任務（狀態非 Done）→ 補充 evidence，不重複建立
   - 若同一問題已關閉但今日發現 regression → 新建任務，標明「regression of #XX」

   新任務欄位規範：

   | 欄位 | 規則 |
   |------|------|
   | Task name | 一句話描述症狀，不用「Bug:」前綴 |
   | Task type | Bug → Bug；新功能 → Feature request；品質 → Polish；重構 → Refactor（右側僅語意標籤；實際值依下方 schema 規則） |
   | Priority | 生產事故級 → High；影響核心流程 → Medium；其他 → Low |
   | Effort level | 影響面廣或根因複雜 → Medium/Large；局部修改 → Small |
   | Status | `Not started` |
   | Description | 症狀、影響範圍、發現來源（PR / session）、修正方向、Sub-tasks 框架 |

   **Task type 寫入規則**：先讀取目標 data source 的 schema，依上述語意對應唯一的既有選項，使用該選項完整的 `name` 原字串（包含原值既有的圖示前綴及 variation selector，若有），依欄位型別傳入；不可直接把表格標籤當成選項值、刪除前綴或自行新增選項。若專案使用其他分類欄位，遵循專案已設定的 schema 對照；若沒有該欄位或無法唯一對應，略過該欄位並回報待確認，不猜值。

   Sub-tasks 標準框架：
   ```
   ## Sub-tasks
   - [ ] 問題分析
   - [ ] 規劃修改
   - [ ] 代碼修改
   - [ ] 部署測試
   - [ ] 文件更新
   - [ ] 代碼上傳
   ```

   **4c. 更新進行中任務的進度**
   - 今日有部分推進但未完成的任務 → 在當前 Description 補充最新進度、逐項驗收證據與尚未取得的證據；保留既有內容及未完成勾選項
   - Scope 比預期大 → 調整 Effort level 或 Priority

   **4d. 重新審視優先順序**
   - 今日的修法是否讓某個舊任務失去意義？→ 標 `Tracking` 或 Cancelled，說明原因
   - 有沒有新的高風險點浮現，需要立刻提升 Priority？

   > **專案既有入口設定範例**（可在 `AGENTS.md`／`CLAUDE.md` 或其轉介維護，不因本流程自動新增）：
   > ```markdown
   > ## Notion Task Board
   > - **Data source ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   > - **Parent page**: https://www.notion.so/...
   > ```

5. **撰寫 commit message（英文、良好格式）**
   - 採用 **Conventional Commits** 風格：`type(scope): short description`
   - 常用 type：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`
   - 內文用條列式列出主要變更，方便日後 `git log` 查閱
   - **附上 AI 助手署名**：若該次變更由 AI 助手協助完成，請在訊息最末端加入對應的 `Co-authored-by`。
     - **一般原則**：`Co-authored-by` 的 **email 請用各平台官方建議地址**；**模型／產品識別寫在姓名（name）欄**，便於 `git log` 閱讀與事後追溯。
     - **Cursor（含 Auto 模式）**：執行本流程的**就是當前這個對話裡的助手**。**預設必須**在 `Co-authored-by` 裡**寫出本助手在這輪對話中的可識別名稱**（由**模型自己**依下文步驟填寫，不要省略括號、不要請使用者代填）。
       - **自識別步驟（執行 commit 前在內部做完）**：
         1. **盤點線索**：系統／開發者訊息中的 **model**、產品／工具對本對話的模型說明、使用者可見的模型選單標籤、或本輪對話開頭對助手的稱呼（含 **Opus / Sonnet / Haiku**、代次如 **4.5**、**4** 等）。
         2. **盡量寫滿版本粒度（在證據範圍內）**：括號內字串優先採 **「家族 + 分支 + 可確定的最細代次／版本」**，例如 `Claude Sonnet 4.5`、`Claude Opus 4.1`、`GPT-5.2`；**能寫出數字代次就寫**，不要刻意縮成僅 `Claude` 了事。若線索只到「Sonnet」無小版本，則 `Claude Sonnet` 或 `Claude Sonnet 4`（以線索為準）。
         3. **與 Cursor UI 對齊**：若同一模型在介面上以固定字串顯示（如 `Claude Sonnet 4.5`），括號內**優先使用該字串**（必要時將空格／標點微調為單行 `git` trailer 安全字元）。
         4. **禁止**：略過括號；虛構線索中**不存在**的細版本或內部 build 號。若僅能確定「Claude 系列」無分支資訊，才用 `Claude`——仍優於無括號退路。
       - 格式：`Co-authored-by: Cursor (<你的模型顯示名稱>) <cursoragent@cursor.com>`
       - 範例（僅示意，**以你自識到的最細版本為準**）：`Co-authored-by: Cursor (Claude Sonnet 4.5) <cursoragent@cursor.com>`
       - **僅當**完成上述自識別步驟後仍**毫無**可查線索時，才退回：`Co-authored-by: Cursor <cursoragent@cursor.com>`。
     - **Claude（非 Cursor 包裝時）** 範例：`Co-authored-by: Claude Sonnet 4.5 <noreply@anthropic.com>`
     - **Gemini** 範例：`Co-authored-by: Gemini <gemini-cli@google.com>`

6. **執行 commit**
   - 只對 Step 1 已授權路徑執行 `git add -- <path> ...`；部分 hunk 用 `git add -p -- <path>`。不得用 `git add -A`／`git add .` 擴大範圍，也不取消他人既有 staging。檔名作獨立參數並正確引用；程式批次傳遞路徑用 NUL 分隔。
   - 提交前核對 `git diff --cached --name-status`、`git diff --cached` 與本次範圍；message 暫存檔放 repo 外。若有範圍外 staged，保留原 staging；只有指定檔案的**全部工作樹修改**均已授權並檢視時，才可用 `git commit --only -F <message-file> -- <path> ...` 隔離提交。此模式會取工作樹內容，不適用同檔只授權部分 hunk。部分 hunk 可採已驗證的暫存 index 隔離方案；新 HEAD 產生後**不可直接 restore 舊 index bytes**，必須把原範圍外 staged delta 重建在新 HEAD 上，並核對 `git diff --cached`、工作樹與實際 commit diff，確保已提交內容未被反向 staged、原待提交內容精確保留。優先沿用既有授權完成安全分離；同檔重疊等情況若無法證明精確保留，才停止該提交項並列待確認，不擅自 stash、reset 或改動他人 index。
   - staging 全部屬本次時，用 `git commit -F <message-file>`（或等價結構化參數）送出；保持專案 hooks 執行，保留失敗的 exit code 與 stderr，先修正真正失敗原因。
   - **署名或非預期尾註**：先檢查最終 `git log -1 --format=%B` 與 hook／IDE 設定，回報實際來源；不得只為加 `Co-authored-by` 或去 `Made-with:` 自動加 `--no-verify`、關閉 hook 或改已 push／他人 commit。未發布且本次新建的 commit，只有既有授權明確涵蓋訊息修正時才可正常 `--amend`，修正後仍跑 hooks 並讀回；已發布 commit 保留，必要的歷史改寫另列待確認，不自行 force push。
   - 讀回 commit hash、message、`git show --stat`／實際提交差異及剩餘 `git status`，確認沒有帶入範圍外變更且原有工作仍保留。只清除本次建立的 repo 外暫存檔。

7. **回覆使用者**
   - 顯示 commit hash 與完整 message
   - 用簡表或條列摘要「今日工作內容」，方便留底或日報
   - 只列實際更新並讀回的檔案：專案 AI 規則入口（`AGENTS.md`／`CLAUDE.md`／既有 Cursor rules）及實作筆記；未做的同步不得稱完成
   - 若執行了 Step 4，摘要 Notion 已讀回的更新、逐項仍未驗收的 Sub-tasks、Tracking 與缺證據；需使用者決定的項目集中列清單，沿用已有效授權，不重問。

## 使用者規則提醒

- Git commit 訊息請遵從**良好格式的英文版**（已反映在上述 message 撰寫原則）。

## 範例觸發說法

- 「今天工作到一個段落了，請依照 `/commit` 協助我 commit」
- 「工作結束了，跑 commit skill」
