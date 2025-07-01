# OAuth 調試指南

## 概述

這個指南說明如何使用新增的錯誤處理和日誌記錄功能來診斷 OAuth 流程中的問題。

## 新增的功能

### 1. 詳細的錯誤日誌記錄

所有關鍵文件都已增加詳細的 console.log 和錯誤處理：

- **shopify.server.ts**: 環境變數檢查、初始化過程、afterAuth 回調
- **auth.$.tsx**: 認證路由的詳細日誌
- **app.tsx**: 應用程式路由的認證過程
- **entry.server.tsx**: 伺服器請求處理的完整追蹤

### 2. 錯誤處理工具

#### `app/utils/error-logger.ts`
提供統一的錯誤處理和日誌記錄功能：

```typescript
import { logError, logRequest, logEnvironment, validateEnvironment } from "./utils/error-logger";

// 記錄錯誤
logError("Auth", error, { additionalInfo: "額外資訊" });

// 記錄請求資訊
logRequest("Auth", request);

// 記錄環境變數
logEnvironment("Auth");

// 驗證環境變數
validateEnvironment();
```

#### `app/utils/oauth-monitor.ts`
專門用於追蹤 OAuth 流程的工具：

```typescript
import { createOAuthMonitor, logOAuthStep } from "./utils/oauth-monitor";

// 創建監控實例
const monitor = createOAuthMonitor("session-123");

// 記錄步驟
monitor.logStep("認證開始", true);
monitor.logStep("認證失敗", false, null, error);

// 獲取總結
const summary = monitor.getSummary();
```

### 3. 調試路由

#### `/debug-oauth`
訪問 `https://your-app-url/debug-oauth` 可以查看：

- 認證狀態
- Session 資訊
- 環境變數狀態
- OAuth 流程步驟
- 錯誤詳情

## 常見問題診斷

### 1. 環境變數問題

檢查控制台輸出中的環境變數檢查部分：

```
【Environment】環境變數檢查: {
  SHOPIFY_API_KEY: "已設定",
  SHOPIFY_API_SECRET: "已設定",
  SHOPIFY_APP_URL: "https://your-app-url.com",
  SCOPES: "read_products,write_products",
  NODE_ENV: "production"
}
```

如果看到 "未設定"，請檢查：
- `.env` 文件是否正確設定
- 部署平台的環境變數設定
- 變數名稱是否正確

### 2. 認證失敗

查看認證相關的日誌：

```
【Auth】認證過程發生錯誤:
【Auth】錯誤類型: Response
【Auth】錯誤狀態: 401
【Auth】錯誤狀態文字: Unauthorized
```

常見原因：
- API 金鑰或密鑰錯誤
- Redirect URL 不匹配
- 應用程式未正確安裝

### 3. afterAuth 回調失敗

檢查 afterAuth 的詳細日誌：

```
【afterAuth】ScriptTag 註冊流程失敗: Error
【afterAuth】錯誤詳情: {
  message: "Access denied",
  status: 403,
  statusText: "Forbidden"
}
```

常見原因：
- 權限不足
- API 調用失敗
- 網路問題

### 4. 重定向問題

查看重定向相關日誌：

```
【Auth】檢測到重定向: {
  status: 302,
  url: "https://shop.myshopify.com/admin/oauth/authorize"
}
```

檢查：
- Redirect URL 是否與 Shopify Partner Dashboard 中的設定一致
- 應用程式 URL 是否正確

## 使用步驟

### 1. 安裝應用程式時

1. 打開瀏覽器開發者工具的控制台
2. 開始安裝流程
3. 觀察控制台輸出，尋找錯誤訊息
4. 如果安裝失敗，訪問 `/debug-oauth` 查看詳細資訊

### 2. 調試現有問題

1. 訪問 `/debug-oauth` 路由
2. 查看認證狀態和錯誤資訊
3. 檢查 OAuth 流程步驟
4. 根據錯誤類型採取相應措施

### 3. 日誌分析

在控制台中搜尋以下關鍵字：

- `【Auth】` - 認證相關
- `【App】` - 應用程式路由
- `【Server】` - 伺服器處理
- `【afterAuth】` - 安裝後回調
- `【OAuth Monitor】` - OAuth 流程監控

## 錯誤代碼對照

| 錯誤代碼 | 含義 | 解決方案 |
|---------|------|----------|
| 401 | Unauthorized | 檢查 API 金鑰和密鑰 |
| 403 | Forbidden | 檢查應用程式權限 |
| 404 | Not Found | 檢查 URL 和路由 |
| 500 | Server Error | 檢查伺服器日誌 |
| 302 | Redirect | 檢查 Redirect URL 設定 |

## 最佳實踐

1. **開發環境**：保持詳細日誌開啟
2. **生產環境**：可以減少日誌輸出，但保留錯誤處理
3. **監控**：定期檢查 `/debug-oauth` 路由
4. **備份**：保存重要的錯誤日誌以供分析

## 聯繫支援

如果問題持續存在，請提供：

1. 控制台的完整錯誤日誌
2. `/debug-oauth` 路由的輸出
3. 環境變數設定（隱藏敏感資訊）
4. 重現步驟

這樣可以更快地診斷和解決問題。 