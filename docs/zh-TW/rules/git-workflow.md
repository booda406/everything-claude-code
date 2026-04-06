# Git 工作流程

**English:** [`rules/common/git-workflow.md`](../../../rules/common/git-workflow.md)

## Commit 訊息格式

```
<type>: <description>

<optional body>
```

類型：`feat`、`fix`、`refactor`、`docs`、`test`、`chore`、`perf`、`ci`

注意：歸屬（attribution）可透過 `~/.claude/settings.json` 全域關閉。

## Pull Request 流程

建立 PR 時：

1. 分析**完整** commit 歷史（不要只看最新一筆）。
2. 使用 `git diff [base-branch]...HEAD` 檢視**全部**變更。
3. 撰寫**完整**的 PR 摘要。
4. 附上測試計畫（可含待辦 **TODO**）。
5. 若為新分支，推送時使用 `-u`。

> 在 Git 操作**之前**的完整開發過程（規劃、TDD、code review）見 [development-workflow.md](./development-workflow.md)。
