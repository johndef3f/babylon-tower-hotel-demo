# Babylon Tower Hotel Demo

## 專案概述
Three.js 蒸氣龐克風格的建築視覺化 Demo，載入 FBX 場景並提供互動式攝影機與即時燈光調整介面。

## 技術棧
- **Vite** — 開發伺服器與建置工具
- **Three.js** (latest) — 3D 渲染
- **lil-gui** — 即時參數調整面板
- **FBXLoader** — 載入 FBX 場景檔

## 專案結構
```
Babylon_Tower_Hotel_Demo/
├── assets/
│   └── Demo_Sences.fbx       # 主場景（vite publicDir，不進版控）
├── src/
│   └── main.js               # 全部 Three.js 邏輯
├── index.html
├── package.json
└── vite.config.js            # 含 saveParamsPlugin（GUI 儲存到 main.js）
```

## 新裝置首次設定

### 1. 安裝必要工具（Windows，若尚未安裝）
```powershell
winget install OpenJS.NodeJS
winget install Git.Git
winget install --id GitHub.cli
```
安裝完後**重新開啟終端機**，然後登入 GitHub：
```powershell
gh auth login
# 選 GitHub.com → HTTPS → 用瀏覽器登入
```

### 2. Clone 專案
```powershell
git clone https://github.com/johndef3f/babylon-tower-hotel-demo.git
cd babylon-tower-hotel-demo
```

### 3. 放回 FBX（不進版控，需手動複製）
`assets/Demo_Sences.fbx` 沒有上傳 GitHub（檔案太大）。
請從原始電腦複製 `Demo_Sences.fbx`，放到專案根目錄下的 `assets/` 資料夾。

### 4. 安裝套件並啟動
```powershell
npm install
npm run dev
# 開啟 http://localhost:5173
```

---

## 日常開發流程

### 開始前（拉最新版）
```powershell
git pull
```

### 改完後（推回 GitHub）
```powershell
git add .
git commit -m "說明這次改了什麼"
git push
```

---

## 啟動開發環境
```bash
npm install
npm run dev
# 開啟 http://localhost:5173
```

## 操作方式
| 操作 | 功能 |
|------|------|
| 左鍵拖曳 | 水平旋轉攝影機（繞模型中心） |
| 滾輪 | 調整焦距（望遠 / 廣角） |
| GUI 面板 | 攝影機、燈光、Bloom 即時調整 |
| 💾 儲存至 main.js | 把 GUI 數值寫回原始碼（需 `npm run dev` 執行中） |

## 攝影機系統
使用球面座標系 `(theta, phi, radius)`：
- `phi` 固定 `Math.PI / 4`（45 度俯角），不隨拖曳改變
- `theta` 隨水平拖曳改變（360 度旋轉）
- 旋轉靈敏度：`src/main.js` 搜尋 `theta -= dx *`

## 燈光配置
- **AmbientLight** — 環境補光
- **keyLight** (DirectionalLight) — 主光源，位置在 `keyLight.position.set(...)`
- **dirLight** (DirectionalLight) — Fill Light 補色
- **neonCyan1 / neonPink / neonCyan2** (PointLight) — 霓虹點光源，FBX 載入後依場景尺寸重新定位

## GUI 儲存機制
`vite.config.js` 內有 `saveParamsPlugin`，提供 `POST /api/save-params` endpoint。
GUI 儲存按鈕會把 `params` 物件 POST 過去，plugin 用 regex 替換 `main.js` 內 `§PARAMS_START` 區塊的數值。

**注意**：`radius`（攝影機距離）不在 `params` 內，每次 FBX 載入後由場景尺寸自動計算。

## Fog
`scene.fog = new THREE.FogExp2(color, density)`，位於 `main.js:12`。
顏色需與 `scene.background` 保持一致，否則遠景會有色差。

## Post-processing
`EffectComposer` → `RenderPass` → `UnrealBloomPass` → `OutputPass`
Bloom 參數全部在 `params` 內，可透過 GUI 調整後儲存。
