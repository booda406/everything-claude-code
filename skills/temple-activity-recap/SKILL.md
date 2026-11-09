---
name: temple-activity-recap
description: >
  longtantemple_web 專屬：撰寫並發布「活動花絮」靜態文章的完整流程。
  涵蓋資料夾骨架、圖片優化與命名、HTML 範本與圖庫版型、史實查證、
  all.json 索引更新、commit/PR/部署等步驟。當使用者要新增「活動花絮」、
  「朝聖之旅」、「法會記錄」等 `public/activities/{slug}/` 下的新文章時觸發。
origin: ECC
---

# 龍潭慈惠堂 — 活動花絮撰寫流程

從「整理出遊照片」到「上線發布」的端到端流程。本 skill 專屬 `longtantemple_web` 專案，
活動文章為自包含 HTML（含 inline `<style>`），透過 `dangerouslySetInnerHTML` 注入 SSG 頁面。

## When to Activate

- 使用者要新增「活動花絮」、「朝聖之旅」、「法會記錄」等活動文章
- 使用者在 `public/activities/` 下準備新 slug 資料夾
- 使用者上傳大量未優化照片並提到要寫成花絮
- 使用者明確輸入 `/activity-recap` 或類似指令

## Canonical Reference

**所有結構問題優先參考：** `public/activities/114-yunnan/index.html`
（最近一次經 review／a11y 修正完成的範本）

不要從零組裝 HTML；複製 114-yunnan 的 `<head>` + 章節 + `lightbox` 標記，
只替換內容與圖片路徑。

---

## Step 1 — 確認主題與資料夾骨架

1. 與使用者確認：**slug**、**title**、**日期 (YYYY-MM-DD)**、**地點**、**主軸**
   - slug 格式：`{民國年}-{地點縮寫}`，例如 `114-yunnan`、`114-salvation`、`108-kunlun`
2. 建立資料夾：

```bash
mkdir -p public/activities/{slug}/images
```

3. 提醒使用者把原始照片（任何尺寸）放進 `images/`，**先別自己改名或壓縮**，
   稍後會在 Step 2 統一處理。

---

## Step 2 — 圖片優化（**絕對先做、不可跳過**）

> **教訓：** 過去曾發生未壓縮就 commit，導致單一活動頁 100MB+ 資產進入 git。
> **目標：** 每張 ~400–600KB，總和 ~5–10MB。

### 2.1 命名規範（強制）

**檔名只能用 ASCII，禁止空格與中文。**
原因：S3／CloudFront 對 URL 編碼處理不一致，含空格的路徑容易 404。

格式範例：`dali-NN.jpg`、`yunnan-NN.jpg`、`salvation-NN.jpg`

### 2.2 一次完成「重命名 + 壓縮 + 去 EXIF」

```bash
cd public/activities/{slug}/images

# 範例：重命名（保留原編號利於追溯）
# 假設原檔形如 "乙巳年- 1008大理朝聖22.jpg"
for f in *.jpg; do
  num=$(echo "$f" | sed 's/.*\([0-9]\+\)\.jpg$/\1/')
  padded=$(printf "%02d" "$num")
  git mv "$f" "dali-${padded}.jpg"
done

# 壓縮（ImageMagick）：限長邊 1920px、quality 82、移除 EXIF
for f in *.jpg; do
  magick "$f" -auto-orient -resize '1920x1920>' -quality 82 -strip "$f"
done

# 驗證總大小（應在 10MB 以下）
du -sh .
```

### 2.3 檢查清單

- [ ] 所有檔名為 ASCII，無空格
- [ ] 單檔 < 1MB，目標 ~500KB
- [ ] 總目錄 < 10MB
- [ ] `-auto-orient` 已套用（避免手機照片旋轉錯誤）

---

## Step 3 — 蒐集內容素材

向使用者請求：

- 行程 PDF／筆記／訊息紀錄
- 行程亮點、特殊體驗、文化典故
- 想強調的人物／場景／心情
- 對應每張照片的 caption 想法（可選）

**若使用者提供文件**：用 Read 工具讀完整份，提取地名、人物、年代、典故。

---

## Step 4 — 撰寫 HTML 文章

### 4.1 從 canonical reference 複製範本

```bash
cp public/activities/114-yunnan/index.html public/activities/{slug}/index.html
```

刪除內文 sections，保留：

- 完整 `<head>`（含 Noto Serif TC + Noto Sans TC、CSS 變數、所有 `.section-*` 與 `.image-gallery.*` 樣式）
- `lightbox` DOM 標記（在 `</body>` 前）
- `prefers-reduced-motion` 區塊

### 4.2 標準章節結構（10 段為佳）

1. **Hero 段**：`<div class="hero-image-container">` + 開場 pull-quote
2. **緣起**：為何成行、與龍潭慈惠堂的因緣
3. **抵達／首站**：首日重點
4. **主軸事件**（核心 1–2 段）：朝聖、法會、參拜的主場
5. **文化／歷史小知識**（散插）：地方典故、史實
6. **風景／民俗段**
7. **美食／生活段**
8. **特殊體驗段**（演出、夜景、突發插曲）
9. **回程／反思**
10. **結尾 pull-quote**：呼應開場、留韻

### 4.3 圖庫版型選擇

| 版型 class | 適用情境 | 高度 |
|-----------|---------|------|
| `.image-gallery.single` | 單張獨立紀實 | 自動 |
| `.image-gallery.wide` | 全景、橫向風景、合照 | 380px |
| `.image-gallery.portrait` | 神像、高聳建築、人像 | 480px |
| `.image-gallery.feature` | 1 大 + 2 小編輯版型（如演出序列） | 自動 |

**每個 gallery item 標準屬性**：

```html
<div class="gallery-item not-prose"
     data-src="/activities/{slug}/images/dali-22.jpg"
     data-caption="香煙繚繞中的大理慈惠堂正殿門面">
  <img src="/activities/{slug}/images/dali-22.jpg"
       alt="大理慈惠堂正面"
       class="gallery-image"
       loading="lazy">
</div>
```

**注意：** `tabindex` / `role` / `aria-label` **不需要手動加**，
`LightboxProvider` 在執行時會自動補上。

### 4.4 文字裝飾元件

- `.section-title.featured`：核心段落的強調標題（含 ❖ 雙線）
- `.pullquote`：開場／結尾的詩意引言
- `.section-divider`：段落間的 ❋ 分隔線

### 4.5 **絕對不可做**

- **不要**在 `index.html` 內加 inline `<script>`
  → 透過 `dangerouslySetInnerHTML` 注入的 `<script>` **不會執行**。
  Lightbox 完全由 `src/components/lightbox/lightbox-provider.tsx` 處理。
- **不要**在 gallery item 手動加 `tabindex` / `onclick`
  → Provider 端會自動處理，手動加反而衝突。
- **不要**用 emoji 當圖示
  → 用 ❖ ❋ 等排版符號或 SVG。

---

## Step 5 — 史實／知識查證（**核心品質關卡**）

> **教訓：** 過去稿件曾誤寫「鄭回出身成都」「洱海 256 km²」「四大古城含蘇州」，
> 上線後才被使用者發現要改。**所有可驗證的事實**都要查證。

### 5.1 列出所有事實性陳述

把稿件內所有「具體可驗證的知識」（人名、年代、面積、地名清單、皇帝賜匾來源等）
逐一列出。

### 5.2 用 WebSearch／WebFetch 查證

優先順序：
1. Wikipedia（中文／英文交叉比對）
2. 百度百科
3. 地方官方網站、學術論文

### 5.3 修正策略

- 確定錯 → 用正確版本改寫
- 不確定 → 改寫為保守表述（「相傳」「據傳」「一說」）
- 無權威來源 → 刪除該細節，不要硬留

---

## Step 6 — 更新 `public/activities/all.json`

把新文章**置頂**：

```json
{
  "slug": "{slug}",
  "title": "{title}",
  "date": "YYYY-MM-DD",
  "thumbnail": "/activities/{slug}/images/dali-22.jpg",
  "description": "150–200 字摘要，呼應主軸"
}
```

`thumbnail` 選擇代表性照片（通常為主場景的正面照）。

---

## Step 7 — UI/UX 排版檢視（建議）

可選：呼叫 `ui-ux-pro-max` skill 或請 `ui-ux-designer` agent 跑一輪 review，
針對版型節奏、視覺層次、留白進行最後調整。

---

## Step 8 — Build 驗證

```bash
npm run build
```

確認：
- 新 slug 出現在 SSG 路由清單
- 無 type error
- 無新 lint error（既有 warnings 可忽略）

可選用 `npm run dev` 在瀏覽器實機檢視：
- 桌面寬度
- 手機寬度（375px）
- 鍵盤 Tab 可聚焦圖片、Enter 開 Lightbox

---

## Step 9 — Commit

先確認目前請求或仍適用的既有授權涵蓋這次本機 commit。只有文章撰寫或預覽授權時，
交付 Step 8 的本機成果與驗證結果，將提交及發布列為待辦。

已授權時，呼叫 `/commit` skill，由它依實際助手身分加入署名。Commit message 範例：

```
feat(activities): 新增{民國年}年{地點}朝聖之旅活動花絮

- 新增 public/activities/{slug}/ 活動花絮（{N} 段、{N} 張優化圖片）
- 圖片優化 {原始}MB → {壓縮後}MB（1920px / q82 / strip EXIF）
- 更新 all.json，文章置頂
```

---

## Step 10 — PR / Merge / Deploy

逐項確認目前請求或仍適用的既有授權是否涵蓋 push、建立 PR、合併及正式環境部署。
到達第一項未獲授權的步驟時，停在已完成的階段並回報待辦。

1. 確認專案目標分支，依已授權範圍 push 並開 PR。
2. 有合併授權時，交給 `/merge` 確認最新提交、目標分支、審查與 CI。
3. 有正式部署授權時，在主 worktree 確認部署來源是已驗證的合併版本，再執行部署指令。

```bash
npm run deploy:prod
```

部署到 `s3://longtantemple-web-prod`。

---

## 完整檢查清單（執行前最後過一次）

### 內容
- [ ] 章節 8–10 段，有開場與結尾 pull-quote
- [ ] 至少 3 處 `.section-divider` 分段
- [ ] 所有事實性陳述已查證
- [ ] 每張照片有合理 caption

### 圖片
- [ ] 檔名全 ASCII，無空格
- [ ] 單檔 < 1MB，總和 < 10MB
- [ ] thumbnail 選定且有代表性

### 程式碼
- [ ] **無 inline `<script>`**
- [ ] gallery item 有 `data-src` 與 `data-caption`
- [ ] gallery item **沒有**手動的 `tabindex` / `role`
- [ ] 圖庫 class 選擇符合內容類型

### 流程
- [ ] `all.json` 新文章置頂
- [ ] `npm run build` 通過
- [ ] Lightbox 在 dev server 實際開過
- [ ] 鍵盤導覽（Tab → Enter → Esc）可正常作動

---

## 反例（Anti-Patterns）

### 反例：在活動 HTML 加 inline script

```html
<!-- 永遠不會執行 -->
<script>
  document.querySelectorAll('.gallery-item').forEach(...)
</script>
```

→ **正解：** 什麼都不做，`LightboxProvider` 會接管。

### 反例：含空格／非 ASCII 的圖片檔名

```
images/乙巳年- 1008大理朝聖22.jpg
```

→ **正解：** `images/dali-22.jpg`

### 反例：未壓縮的原始照片

```
images/IMG_4523.jpg  (8.2 MB, 4365×2910)
```

→ **正解：** ImageMagick 壓到 ~500KB，1920px 長邊。

### 反例：史實照搬使用者口述，未查證

「康熙親賜『文獻名邦』匾額」（其實是雲南提督偏圖請康熙御賜）

→ **正解：** 改寫為「康熙年間御賜」或補上完整來源。

---

## Related Skills

- `commit` — Step 9 的 commit 流程（含 Co-authored-by 自識別）
- `merge` — Step 10 的 PR squash merge 流程
- `ui-ux-pro-max` — Step 7 的版型 review
- `review` — PR 上線前的守門審查
