# Hooks（鉤子）

Hooks 是依事件觸發的自動化：在 Claude Code **執行工具之前或之後** 執行。用於維持程式品質、及早發現錯誤，並把重複性檢查自動化。

**English:** [README.md](./README.md)

## Hooks 如何運作

```
使用者請求 → Claude 選擇工具 → PreToolUse hook 執行 → 工具執行 → PostToolUse hook 執行
```

- **PreToolUse**：在工具執行**前**執行。可**阻擋**（離開碼 2）或**僅警告**（寫入 stderr，不阻擋）。
- **PostToolUse**：在工具**完成後**執行。可分析輸出，**無法**阻擋工具。
- **Stop**：在每一次 Claude **回覆結束後**執行。
- **SessionStart / SessionEnd**：在**工作階段**生命週期邊界執行。
- **PreCompact**：在**內容壓縮（compact）之前**執行，可用來儲存狀態。

## 本插件中的 Hooks

### PreToolUse

| Hook | Matcher | 行為 | 離開碼 |
|------|---------|------|--------|
| **開發伺服器阻擋** | `Bash` | 在 tmux 外執行 `npm run dev` 等會被擋下 — 確保日誌可存取 | 2（阻擋） |
| **Tmux 提醒** | `Bash` | 對長時間指令（npm test、cargo build、docker 等）建議使用 tmux | 0（警告） |
| **Git push 提醒** | `Bash` | 在 `git push` 前提醒檢視變更 | 0（警告） |
| **Pre-commit 品質檢查** | `Bash` | 在 `git commit` 前執行品質檢查：對已暫存檔案跑 lint、若透過 `-m/--message` 提供訊息則檢查慣例、偵測 console.log／debugger／敏感資訊 | 2（嚴重時阻擋）／0（警告） |
| **文件路徑警告** | `Write` | 對非慣例的 `.md`／`.txt` 建立行為提出警告（允許 README、CLAUDE、CONTRIBUTING、CHANGELOG、LICENSE、SKILL、docs/、skills/ 等）；路徑處理跨平台 | 0（警告） |
| **策略性 compact 提醒** | `Edit\|Write` | 約每 50 次工具呼叫建議手動執行 `/compact` | 0（警告） |
| **InsAIts 安全監控（選用）** | `Bash\|Write\|Edit\|MultiEdit` | 針對高訊號工具輸入做選用式安全掃描。除非設定 `ECC_ENABLE_INSAITS=1`，否則停用。嚴重問題會阻擋，其餘警告，審計日誌寫入 `.insaits_audit_session.jsonl`。需 `pip install insa-its`。[細節](../scripts/hooks/insaits-security-monitor.py) | 2（嚴重阻擋）／0（警告） |

### PostToolUse

| Hook | Matcher | 作用 |
|------|---------|------|
| **PR 記錄** | `Bash` | 在 `gh pr create` 後記錄 PR 網址與 review 指令 |
| **建置分析** | `Bash` | 建置類指令後在背景分析（async、不阻擋） |
| **品質門檻** | `Edit\|Write\|MultiEdit` | 編輯後執行快速品質檢查 |
| **設計品質檢查** | `Edit\|Write\|MultiEdit` | 前端編輯過於像通用樣板時提出警告 |
| **Prettier 格式化** | `Edit` | 編輯後以 Prettier 自動格式化 JS/TS 檔 |
| **TypeScript 檢查** | `Edit` | 編輯 `.ts`/`.tsx` 後執行 `tsc --noEmit` |
| **console.log 警告** | `Edit` | 對編輯內容中的 `console.log` 提出警告 |

### 生命週期 Hooks

| Hook | 事件 | 作用 |
|------|------|------|
| **工作階段開始** | `SessionStart` | 載入先前情境並偵測套件管理員 |
| **Pre-compact** | `PreCompact` | 在內容壓縮前儲存狀態 |
| **Console.log 稽核** | `Stop` | 每次回覆後檢查已修改檔案中的 `console.log` |
| **工作階段摘要** | `Stop` | 在可取用 transcript 路徑時持久化工作階段狀態 |
| **模式擷取** | `Stop` | 評估工作階段是否可擷取可重複模式（continuous learning） |
| **成本追蹤** | `Stop` | 輸出輕量 run-cost 遙測標記 |
| **桌面通知** | `Stop` | 以 macOS 桌面通知送出任務摘要（standard 及以上 profile） |
| **工作階段結束標記** | `SessionEnd` | 生命週期標記與清理日誌 |

## 自訂 Hooks

### 停用某一個 Hook

在 `hooks.json` 移除或註解該 hook 項目。若以插件安裝，可在 `~/.claude/settings.json` 覆寫合併：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [],
        "description": "Override: allow all .md file creation"
      }
    ]
  }
}
```

### 執行期控制（建議）

不必改 `hooks.json`，可用環境變數控制行為：

```bash
# minimal | standard | strict（預設：standard）
export ECC_HOOK_PROFILE=standard

# 停用特定 hook id（逗號分隔）
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"
```

Profile 說明：

- `minimal` — 僅保留必要生命週期與安全相關 hooks。
- `standard` — 預設；品質與安全檢查平衡。
- `strict` — 額外提醒與較嚴格護欄。

### 撰寫自己的 Hook

Hook 為 shell 指令：從 **stdin** 讀取 JSON 形式的工具輸入，且必須在 **stdout** 輸出 JSON。

**基本結構：**

```javascript
// my-hook.js
let data = '';
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  const input = JSON.parse(data);

  // 存取工具資訊
  const toolName = input.tool_name;        // "Edit", "Bash", "Write", 等
  const toolInput = input.tool_input;      // 工具專屬參數
  const toolOutput = input.tool_output;    // 僅 PostToolUse 有

  // 警告（不阻擋）：寫到 stderr
  console.error('[Hook] Warning message shown to Claude');

  // 阻擋（僅 PreToolUse）：離開碼 2
  // process.exit(2);

  // 務必將原始資料輸出到 stdout
  console.log(data);
});
```

**離開碼：**

- `0` — 成功（繼續執行）
- `2` — 阻擋該次工具呼叫（僅 PreToolUse）
- 其他非零 — 錯誤（記錄，但**不**阻擋）

### Hook 輸入結構

```typescript
interface HookInput {
  tool_name: string;          // "Bash", "Edit", "Write", "Read", 等
  tool_input: {
    command?: string;         // Bash：即將執行的指令
    file_path?: string;       // Edit/Write/Read：目標檔案
    old_string?: string;      // Edit：被替換的文字
    new_string?: string;      // Edit：替換後文字
    content?: string;         // Write：檔案內容
  };
  tool_output?: {             // 僅 PostToolUse
    output?: string;          // 指令／工具輸出
  };
}
```

### 非同步 Hooks

不應阻塞主流程時（例如背景分析）：

```json
{
  "type": "command",
  "command": "node my-slow-hook.js",
  "async": true,
  "timeout": 30
}
```

非同步 hook 在背景執行，**無法**阻擋工具執行。

## 常用 Hook 範例

### 對 TODO 註解提出警告

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const ns=i.tool_input?.new_string||'';if(/TODO|FIXME|HACK/.test(ns)){console.error('[Hook] New TODO/FIXME added - consider creating an issue')}console.log(d)})\""
  }],
  "description": "Warn when adding TODO/FIXME comments"
}
```

### 阻擋建立過大檔案

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const c=i.tool_input?.content||'';const lines=c.split('\\n').length;if(lines>800){console.error('[Hook] BLOCKED: File exceeds 800 lines ('+lines+' lines)');console.error('[Hook] Split into smaller, focused modules');process.exit(2)}console.log(d)})\""
  }],
  "description": "Block creation of files larger than 800 lines"
}
```

### 以 ruff 自動格式化 Python

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "node -e \"let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/\\.py$/.test(p)){const{execFileSync}=require('child_process');try{execFileSync('ruff',['format',p],{stdio:'pipe'})}catch(e){}}console.log(d)})\""
  }],
  "description": "Auto-format Python files with ruff after edits"
}
```

### 新增原始碼時提醒一併建立測試

```json
{
  "matcher": "Write",
  "hooks": [{
    "type": "command",
    "command": "node -e \"const fs=require('fs');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const i=JSON.parse(d);const p=i.tool_input?.file_path||'';if(/src\\/.*\\.(ts|js)$/.test(p)&&!/\\.test\\.|\\.spec\\./.test(p)){const testPath=p.replace(/\\.(ts|js)$/,'.test.$1');if(!fs.existsSync(testPath)){console.error('[Hook] No test file found for: '+p);console.error('[Hook] Expected: '+testPath);console.error('[Hook] Consider writing tests first (/tdd)')}}console.log(d)})\""
  }],
  "description": "Remind to create tests when adding new source files"
}
```

## 跨平台說明

Hook 邏輯以 **Node.js** 實作，在 Windows、macOS、Linux 上行為一致。少數 **shell** 包裝仍用於 continuous-learning 觀察用 hooks；這些包裝會依 profile 啟用，並具 Windows 安全後備行為。

## 相關

- [rules/common/hooks.md](../rules/common/hooks.md) — Hook 架構指引（英文規則庫）
- [skills/strategic-compact/](../skills/strategic-compact/) — 策略性 compact 技能
- [scripts/hooks/](../scripts/hooks/) — Hook 腳本實作目錄
