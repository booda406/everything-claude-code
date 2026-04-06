# 開發工作流程

**English:** [`rules/common/development-workflow.md`](../../../rules/common/development-workflow.md)

> 本檔延伸 [common/git-workflow.md](./git-workflow.md)，補上 **進入 Git 操作之前** 的完整功能開發流程。

「功能實作工作流程」描述開發管線：**調研、規劃、TDD、程式碼審查**，之後才 commit／push。

## 功能實作工作流程

0. **調研與重用**（任何新實作前**必做**）
   - **先搜 GitHub：** 撰寫全新程式前，用 `gh search repos`、`gh search code` 找既有實作、樣板與模式。
   - **再查套件文件：** 用 Context7 或官方文件確認 API 行為、套件用法與版本差異。
   - **僅在前兩步不足時用 Exa：** 在 GitHub 與一手文件之後，再做較廣的網路調研。
   - **查套件註冊庫：** 在 npm、PyPI、crates.io 等搜尋，**優先**用成熟函式庫，避免重造輪子。
   - **找可改寫的實作：** 尋找能解決 80% 以上問題且可 fork、移植或包一層的開源專案。
   - 若既有作法已符合需求，**優先採用或移植**，少寫從零開始的程式。

1. **先規劃**
   - 使用 **planner** agent 撰寫實作計畫。
   - 寫程式前先產出規劃文件：PRD、架構、system_design、tech_doc、task_list。
   - 列出相依與風險。
   - 切成多個階段。

2. **TDD**
   - 使用 **tdd-guide** agent。
   - 先寫測試（RED）。
   - 實作至測試通過（GREEN）。
   - 重構（IMPROVE）。
   - 確認覆蓋率 **80%+**。

3. **程式碼審查**
   - 寫完程式**立刻**用 **code-reviewer** agent。
   - 處理 **CRITICAL** 與 **HIGH**。
   - **MEDIUM** 能修則修。

4. **Commit 與 Push**
   - Commit 訊息具體、完整。
   - 遵循 **Conventional Commits**。
   - 訊息格式與 PR 流程見 [git-workflow.md](./git-workflow.md)。

5. **送審前檢查**
   - 確認 CI／自動檢查皆通過。
   - 解決 merge 衝突。
   - 分支與目標分支同步。
   - **上述皆通過後**再請人 review。
