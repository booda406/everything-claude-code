---
name: commit
description: >
  End-of-day Git workflow: analyze changes, lessons learned (CLAUDE.md + lessons-learned.mdc),
  implementation notes, docs hygiene, English Conventional Commits with Co-authored-by, then commit.
disable-model-invocation: true
---

# 每日工作結束：Commit 流程

工作告一段落時，請依照本流程協助完成 git commit。

## 你要做的事

1. **分析變更 (Analyze Changes)**
   - **全面檢查**：執行 `git status` 與 `git diff --stat` 列出所有變更檔案。
   - **深入檢視**：針對清單中不熟悉的檔案，務必執行 `git diff <filename>` 確認具體修改內容（避免遺漏早期實作的功能）。
   - **分類歸納**：依修改內容，歸納「今日工作內容」（包含：功能 feat、修復 fix、重構 refactor、效能 perf、測試 test、文件 docs 等）。

2. **歸納學習經驗 (Lessons Learned)**
   - **回顧對話與決策**：回想本次開發過程中，是否有「需反覆提醒 AI 的行為」或「本次實作／根因紀錄」值得留存。
   - **判斷類型後更新對應檔案**（二選一，勿混用）：
     - **AI 行為規則**（你會一而再提醒 AI 的準則）→ **同時** 更新以下兩個檔案：
       - **`CLAUDE.md`**（專案根目錄）：Claude Code 自動載入，讓每次對話都生效
       - **`.cursor/rules/lessons-learned.mdc`**：Cursor 讀取用
       範例：Commit 前必須全量 git diff、重構後要檢查 import、部署問題先本機釐清、containedIn 過長要分批、mock 要覆蓋 named exports。
       格式：簡短規則 + 必要時 do/don't 範例；不寫成單次修法紀錄。
     - **專案實作／根因筆記**（單次修法、根因分析、規格決定）→ 更新 **`docs/context/implementation-notes.md`**
       範例：某次統計 fallback 順序修正、某次 RangeError 根因與 patch、Print 斗燈 arrObj 修法、睡眠喚醒 loadWithTimeout 實作。
       格式：日期 + 標題 + 現象/根因/修法，供人類查閱與除錯。
   - **判斷標準**：若「三個月後你還會對 AI 說一次」→ 行為規則；若「查 code 或除錯時才會翻」→ 實作筆記。

3. **文件檢視與整理**
   - **該更新的要更新**：依今日程式變更，檢查 `docs/` 與 README 是否需同步更新（例如架構改動後更新 ARCHITECTURE.md、FOLDER_STRUCTURE.md；新增功能或流程時更新 TESTING.md、TROUBLESHOOTING.md、README 連結等）。
   - **短暫／中途文檔要清理**：辨識開發過程中產生的**暫時性**文檔（例如單次 session 筆記、僅供當日參考的 checklist、重複或已被合併的說明）。這類檔案應：
     - 若內容已無保留價值 → 建議刪除，或從版控移除（並可加入 .gitignore 若為個人筆記）。
     - 若內容有價值但屬過渡 → 建議合併進正式文件（如 TESTING.md、某個 E2E 說明）後刪除原檔。
   - 將「建議更新／建議刪除或合併」的具體項目列出給使用者確認，再執行對應的編輯或刪除；若有爭議可交由使用者決定。

4. **Notion 專案同步（若 CLAUDE.md 有設定）**

   讀取 `CLAUDE.md` 的 `## Notion Task Board` 區塊，取出 `Data source ID`。若不存在，跳過本步驟。

   以頂尖 PM 的視角，根據本次工作段落（Step 1 歸納的變更 + 對話中浮現的問題），依序執行以下四個動作：

   **4a. 關閉已完成的任務**
   - 用 `notion-search`（指定 data source）找出與本次工作相關、尚未關閉的任務
   - 確認真正完成（功能已上線或 PR 已 merge）才標 Done，**不確定就先跳過**
   - 標 Done 後一律補 `## 完成記錄` 區塊（格式見下方），並將所有 Sub-tasks 勾選為 `- [x]`

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
   | Task type | Bug → `🐞 Bug`；新功能 → `💬 Feature request`；品質 → `💅 Polish`；重構 → `♻️ Refactor` |
   | Priority | 生產事故級 → High；影響核心流程 → Medium；其他 → Low |
   | Effort level | 影響面廣或根因複雜 → Medium/Large；局部修改 → Small |
   | Status | `Not started` |
   | Description | 症狀、影響範圍、發現來源（PR / session）、修正方向、Sub-tasks 框架 |

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
   - 今日有部分推進但未完成的任務 → 在 Description 補充最新進度與發現
   - Scope 比預期大 → 調整 Effort level 或 Priority

   **4d. 重新審視優先順序**
   - 今日的修法是否讓某個舊任務失去意義？→ 標 `Tracking` 或 Cancelled，說明原因
   - 有沒有新的高風險點浮現，需要立刻提升 Priority？

   > **CLAUDE.md 設定範例**（各 repo 自行加入）：
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
   - `git add -A` 將所有變更（含未追蹤的合理檔案）加入 staging
   - 若有**不應被 commit 的暫存檔**（例如僅用來寫 message 的 .txt），先 `git restore --staged <file>` 取消
   - 使用 `git commit -m "..."` 或 `git commit -F <message-file>` 送出
   - **若 log 底端出現非本流程撰寫的 `Made-with: Cursor`（或其它非預期尾註）**：多為 IDE／全域 **`commit-msg` hook** 自動附加。請以正確訊息 **`git commit --amend -F <message-file> --no-verify`** 重寫（`--no-verify` 略過該 hook）；**勿**在訊息中保留 `Made-with:`（與 **`skills/dev/SKILL.md`** 一致）。
   - commit 完成後，可刪除僅用於本次的暫存檔（如 message 檔）

7. **回覆使用者**
   - 顯示 commit hash 與完整 message
   - 用簡表或條列摘要「今日工作內容」，方便留底或日報
   - 提醒本次若有更新：**AI 行為規則**已同步記入 `CLAUDE.md` 與 `.cursor/rules/lessons-learned.mdc`，**實作／根因筆記**已記入 `docs/context/implementation-notes.md`
   - 若執行了 Step 4，摘要 Notion 更新結果：關閉哪些任務、新建哪些任務、調整哪些 Priority

## 使用者規則提醒

- Git commit 訊息請遵從**良好格式的英文版**（已反映在上述 message 撰寫原則）。

## 範例觸發說法

- 「今天工作到一個段落了，請依照 `/commit` 協助我 commit」
- 「工作結束了，跑 commit skill」
