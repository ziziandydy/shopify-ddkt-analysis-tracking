# SNAPSHOT: AI ONLY, DO NOT EDIT OR DELETE
# 本檔案僅供 AI 快速理解專案結構與功能，無需可讀性，請勿用於開發或文件。

[PROJECT_OVERVIEW]
DDKT Analysis Tracking = Shopify Web Pixel App + Multiple Pixel Implementations + Tracking System
Purpose: Comprehensive Shopify e-commerce tracking with multiple implementation approaches
Main Architecture: Shopify App with Web Pixel Extension + Public Pixel Files + Admin Dashboard

[APP_CONFIG]
name=DDKT Analysis Tracking
handle=ddkt-analysis-tracking
app_url=https://shopify-ddkt-analysis-tracking.vercel.app
scopes=write_products,write_script_tags,read_script_tags,read_pixels,write_pixels,read_customer_events
webhooks=app/uninstalled,app/scopes_update

[EXTENSION] 
name=ddkt-tracking
type=web_pixel_extension
context=strict
settings=[Account ID: single_line_text_field, min=1]
privacy=analytics/marketing true, preferences false, sale_of_data enabled

[DIR_STRUCTURE]
extensions/ddkt-tracking/
  - shopify.extension.toml: extension 設定
  - package.json: 依賴 @shopify/web-pixels-extension
  - src/index.ts: Web Pixel Extension 主要邏輯 (all_standard_events -> violet.ghtinc.com/tracking/track/v2)
  - dist/: build 輸出 (自動產生,可略過)

[ROUTES]
app/routes/
  - app._index.tsx: 主 dashboard, Web Pixels 狀態檢查, 多路徑 API 查詢 (web_pixels/web_pixel_extensions/extensions)
  -像素.js.tsx: 基礎 pixel 路由
  - pixel-webpixels.js: Web Pixels API 版本
  - pixel-webpixels-advanced.js: 進階版本
  - pixel-andism.js: 特定商店 andism.myshopify.com 的追蹤
  - pixel-extension.$shop.js: 動態商店追蹤 (params.shop)
  - webpixels-test.tsx: 測試介面, 三個版本比較
  - webpixel-status.tsx: Extension 狀態檢查
  - install-extension.tsx: Extension 安裝協助
  - scripttags.tsx: ScriptTags 管理
  - *_index/route.tsx: Root 路由
  - auth.*.tsx: 認證相關
  - webhooks.*.tsx: Webhooks 處理

[PUBLIC_PIXELS]
public/"
  - pixel.js: 基礎版本 - groundhog-tracker.js, /track/v2 endpoint
  - pixel-webpixels.js: 支援 Shopify Web Pixels API
  - pixel-webpixels-advanced.js: 完整版本, 可配置事件, 調試模式, 自定義事件支援
  - pixel-andism.js: Web Pixel Extension 語法, andism.myshopify.com 專用

[TRACKING_ENDPOINTS]
primary=https://violet.ghtinc.com/tracking/track/v2
fallback=https://violet.ghtinc.com/tracking
groundhog=https://violet.ghtinc.com/tracking/groundhog-tracker.js

[EVENT_TYPES]
automatic=[page_view, product_view, cart_update, checkout_start, checkout_complete, search, collection_view]
custom=window.trackShopifyEvent() function
web_pixels=all_standard_events subscription

[FUNCTION_IMPLEMENTATIONS]
1. Web Pixel Extension: analytics.subscribe("all_standard_events") -> POST payload with trackid spfyex-timestamp
2. Public Pixel Files: Multiple versions with different complexity levels
3. Dynamic Routes: Shop-specific tracking with base64 encoded trackid
4. Admin Dashboard: Web Pixels status checking, multiple API path fallbacks
5. Testing Interface: Manual pixel testing and configuration

[TRACKID_GENERATION]
Extension: spfyex-${Date.now()}
Routes: spfyex-${Buffer.from(shopDomain).toString("base64").replace(/=+$/, "")}
Static: Query param tid or spfy-test default

[NOTES]
- app._index.tsx 為主 dashboard 與管理介面
- public/pixel-*.js 為客戶端追蹤檔案
- extensions/ddkt-tracking/ 為 Web Pixel Extension
- dist/ 內容可略過
- 支援三種整合方式: ScriptTag 自動註冊, 手動測試, 主題整合
- 包含完整的調試與狀態檢查功能