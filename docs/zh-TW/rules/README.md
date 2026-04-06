# Rules（規則）

**English:** 與安裝至 `~/.claude/rules/` 的原文見儲存庫根目錄 `[rules/README.md](../../../rules/README.md)`。

## 結構

規則分為 **common**（通用）層，以及 **依語言／領域** 的子目錄：

```
rules/
├── common/          # 與語言無關的原則（安裝時一併提供）
│   ├── coding-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── performance.md
│   ├── patterns.md
│   ├── hooks.md
│   ├── agents.md
│   └── security.md
├── typescript/      # TypeScript / JavaScript
├── python/
├── golang/
├── web/             # Web 與前端
├── swift/
└── php/
```

- **common/** 只含通用原則，不含特定語言的程式範例。
- **語言目錄** 在 common 之上補上該生態系的工具、慣用法與範例；各檔會引用對應的 common 檔案。

## 安裝

### 方式一：安裝腳本（建議）

```bash
# 安裝 common + 一或多套語言規則
./install.sh typescript
./install.sh python
./install.sh golang
./install.sh web
./install.sh swift
./install.sh php

# 一次安裝多種語言
./install.sh typescript python
```

### 方式二：手動安裝

> **重要：** 請複製**整個目錄**，不要用 `/`* **展平**複製。  
> common 與語言目錄裡有**同名檔案**；若全部 flatten 到同一層，語言版會蓋掉 common，且會破壞語言規則裡對 `../common/` 的相對引用。

```bash
# 通用規則（所有專案建議都要）
cp -r rules/common ~/.claude/rules/common

# 依技術鍵複製語言規則
cp -r rules/typescript ~/.claude/rules/typescript
cp -r rules/python ~/.claude/rules/python
cp -r rules/golang ~/.claude/rules/golang
cp -r rules/web ~/.claude/rules/web
cp -r rules/swift ~/.claude/rules/swift
cp -r rules/php ~/.claude/rules/php

# 請依實際專案需求調整；以上僅為示例。
```

## Rules 與 Skills 的差異

- **Rules**：適用面廣的標準、慣例與檢查清單（例如「覆蓋率 80%」「不得寫死密鑰」）。
- **Skills**（`skills/`）：針對特定任務的可操作參考（例如 `python-patterns`、`golang-testing`）。

語言規則在適當處會指向相關 skills。**Rules 說要做什麼；Skills 說較具體怎麼做。**

## 新增一種語言

若要支援新語言（例如 `rust/`）：

1. 建立 `rules/rust/` 目錄。
2. 新增延伸 common 的檔案，例如：
  - `coding-style.md` — 格式工具、慣用法、錯誤處理
  - `testing.md` — 測試框架、覆蓋率、目錄結構
  - `patterns.md` — 該語言的設計模式
  - `hooks.md`       — PostToolUse 與 formatter／linter／型別檢查
  - `security.md` — 密鑰管理、安全掃描工具
3. 各檔開頭宜標明，例如：
  `> This file extends [common/xxx.md](../common/xxx.md) with <Language> specific content.`
4. 若已有對應 skill 請引用；否則可在 `skills/` 新增。

非語言領域（如 `web/`）若在可重用指引夠多時，也可獨立成套，仍採**分層**模式。

## 規則優先序

當 **語言規則** 與 **common** 衝突時，**以語言／領域規則為準**（具體優於通用），類似 CSS 特異度或 `.gitignore` 遞補。

- `rules/common/`：全專案預設。
- `rules/golang/`、`rules/python/` 等：在慣用法不同時覆寫預設。

### 示例

`common/coding-style.md` 預設強調不可變；`golang/coding-style.md` 可說明慣用 Go 如何用指標 receiver 修改 struct——仍呼應 general 原則，但以該語言慣用法為優先。

### 可能被覆寫的 common 規則

`rules/common/` 裡若某條在特定語言不適用，會標註類似：

> **Language note**: This rule may be overridden by language-specific rules for languages where this pattern is not idiomatic.

---

## 本目錄（`docs/zh-TW/rules/`）的繁體中文對照

與 `**rules/common/`** 對應、方便閱讀的譯文：


| 英文（安裝後路徑）                                                                             | 繁體說明                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [rules/common/security.md](../../../rules/common/security.md)                         | [security.md](./security.md)                         |
| [rules/common/testing.md](../../../rules/common/testing.md)                           | [testing.md](./testing.md)                           |
| [rules/common/git-workflow.md](../../../rules/common/git-workflow.md)                 | [git-workflow.md](./git-workflow.md)                 |
| [rules/common/development-workflow.md](../../../rules/common/development-workflow.md) | [development-workflow.md](./development-workflow.md) |
| [rules/common/coding-style.md](../../../rules/common/coding-style.md)                 | [coding-style.md](./coding-style.md)                 |
| [rules/common/patterns.md](../../../rules/common/patterns.md)                         | [patterns.md](./patterns.md)                         |
| [rules/common/hooks.md](../../../rules/common/hooks.md)                               | [hooks.md](./hooks.md)                               |
| [rules/common/agents.md](../../../rules/common/agents.md)                             | [agents.md](./agents.md)                             |
| [rules/common/performance.md](../../../rules/common/performance.md)                   | [performance.md](./performance.md)                   |


Hooks 專題之長篇說明亦見：`[hooks/README.zh-TW.md](../../../hooks/README.zh-TW.md)`。