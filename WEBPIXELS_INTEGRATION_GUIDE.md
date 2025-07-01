# Shopify Web Pixels API 整合指南

## 概述

您的 pixel.js 現在支援 Shopify Web Pixels API，可以更深入地整合 Shopify 的電子商務事件和數據。我們提供了三個版本的 pixel 腳本，每個版本都有不同的功能和複雜度。

## Pixel 版本比較

### 1. 基礎版本 (`/pixel.js`)
- **功能**: 基本的頁面瀏覽追蹤
- **適用**: 簡單的追蹤需求
- **特點**: 輕量級，相容性好

### 2. Web Pixels API 版本 (`/pixel-webpixels.js`)
- **功能**: 支援 Shopify 核心事件
- **適用**: 需要 Shopify 特定事件追蹤
- **特點**: 自動檢測 Shopify 環境，追蹤購物車、結帳等事件

### 3. 進階版本 (`/pixel-webpixels-advanced.js`)
- **功能**: 完整的 Web Pixels API 整合
- **適用**: 需要詳細的電子商務分析
- **特點**: 可配置、調試模式、自定義事件支援

## 支援的事件類型

### 自動追蹤事件
- **page_view**: 頁面瀏覽
- **product_view**: 產品瀏覽
- **cart_update**: 購物車更新
- **checkout_start**: 結帳開始
- **checkout_complete**: 結帳完成
- **search**: 搜尋行為
- **collection_view**: 分類瀏覽

### 自定義事件
- 可通過 `window.trackShopifyEvent()` 函數觸發
- 支援任意事件名稱和數據

## 整合方法

### 方法 1: 通過 ScriptTag 自動註冊
您的應用程式會在安裝時自動註冊 ScriptTag，無需手動操作。

### 方法 2: 手動測試
1. 訪問 `/webpixels-test` 路由
2. 選擇要測試的版本
3. 複製腳本 URL
4. 在商店中手動載入測試

### 方法 3: 主題整合
將腳本添加到商店主題的 `<head>` 標籤中：

```html
<script src="https://your-app-url.com/pixel-webpixels-advanced.js?tid=spfy-your-tracking-id"></script>
```

## 配置選項

### 進階版本配置
```javascript
// 啟用調試模式
window.ShopifyPixelTracker.setDebug(true);

// 自定義事件追蹤
window.trackShopifyEvent('custom_event', {
  event_data: '自定義數據',
  user_id: 'user123'
});

// 使用進階追蹤器
window.ShopifyPixelTracker.trackCustomEvent('advanced_event', {
  message: '進階事件'
});
```

## 數據結構

### 標準事件數據
每個事件都包含以下標準字段：
```javascript
{
  tracking_id: "spfy-your-tracking-id",
  timestamp: "2024-01-01T00:00:00.000Z",
  platform: "shopify",
  event_name: "product_view",
  user_agent: "Mozilla/5.0...",
  language: "zh-TW"
}
```

### Shopify 特定數據
```javascript
{
  shopify_data: {
    shop: "your-store.myshopify.com",
    currency: "TWD",
    customer: {
      id: "123456789",
      email: "customer@example.com"
    },
    cart: {
      token: "cart-token",
      item_count: 2,
      total_price: "1000"
    },
    checkout: {
      token: "checkout-token",
      order_id: "123456789",
      total_price: "1000",
      currency: "TWD"
    }
  }
}
```

## 測試和調試

### 1. 使用測試工具
訪問 `/webpixels-test` 查看：
- 商店資訊
- 支援的事件類型
- 各版本的功能說明
- 測試指南

### 2. 控制台調試
在瀏覽器控制台中：
```javascript
// 檢查追蹤器狀態
console.log(window._ghq);
console.log(window.ShopifyPixelTracker);

// 啟用調試模式
window.ShopifyPixelTracker.setDebug(true);

// 手動觸發事件
window.trackShopifyEvent('test_event', { test: true });
```

### 3. 事件監控
在控制台中查看事件輸出：
```
【Pixel】追蹤事件: product_view {product_id: "123", ...}
【Pixel】追蹤事件: cart_update {cart_token: "abc", ...}
```

## 最佳實踐

### 1. 選擇合適的版本
- **簡單追蹤**: 使用基礎版本
- **Shopify 整合**: 使用 Web Pixels API 版本
- **完整分析**: 使用進階版本

### 2. 性能優化
- 進階版本包含調試模式，生產環境可關閉
- 使用 CDN 載入腳本以提高速度
- 考慮使用 async 載入

### 3. 隱私合規
- 確保追蹤符合 GDPR 等隱私法規
- 提供用戶選擇退出機制
- 不要追蹤敏感個人資訊

### 4. 錯誤處理
- 腳本包含錯誤處理機制
- 在控制台中查看錯誤日誌
- 使用 try-catch 包裝自定義事件

## 故障排除

### 常見問題

1. **腳本未載入**
   - 檢查 URL 是否正確
   - 確認網路連接
   - 查看瀏覽器控制台錯誤

2. **事件未觸發**
   - 確認 Shopify 環境檢測
   - 檢查追蹤器初始化
   - 啟用調試模式查看詳細日誌

3. **數據不完整**
   - 確認 Shopify 數據可用性
   - 檢查事件綁定是否成功
   - 驗證追蹤 ID 設定

### 調試步驟
1. 打開瀏覽器開發者工具
2. 檢查控制台是否有錯誤
3. 確認 `window._ghq` 是否存在
4. 測試手動事件觸發
5. 查看網路請求是否成功

## 更新日誌

### v1.0.0 (基礎版本)
- 基本頁面瀏覽追蹤
- 追蹤 ID 支援

### v2.0.0 (Web Pixels API 版本)
- Shopify 事件自動檢測
- 購物車和結帳事件追蹤
- 產品瀏覽事件

### v3.0.0 (進階版本)
- 完整的事件配置系統
- 調試模式支援
- 自定義事件 API
- 詳細的 Shopify 數據整合

## 聯繫支援

如果您在使用過程中遇到問題，請提供：
1. 使用的 pixel 版本
2. 錯誤訊息或日誌
3. 測試步驟
4. 預期行為和實際行為

這樣可以更快地解決問題並提供支援。 