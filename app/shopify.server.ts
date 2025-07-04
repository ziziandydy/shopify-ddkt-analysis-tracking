import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  AdminApiContext,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

console.log("=== Shopify app 初始化開始 ===");
console.log("=== 環境變數檢查 ===");
console.log("SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY ? "已設定" : "未設定");
console.log("SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET ? "已設定" : "未設定");
console.log("SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL || "未設定");
console.log("SCOPES:", process.env.SCOPES || "未設定");
console.log("NODE_ENV:", process.env.NODE_ENV || "未設定");
console.log("SHOP_CUSTOM_DOMAIN:", process.env.SHOP_CUSTOM_DOMAIN || "未設定");

// 驗證必要的環境變數
const requiredEnvVars = {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
  SCOPES: process.env.SCOPES,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error("=== 缺少必要的環境變數 ===", missingEnvVars);
  throw new Error(`缺少必要的環境變數: ${missingEnvVars.join(", ")}`);
}

let sessionStorageInstance;
try {
  console.log("=== PrismaSessionStorage 實例化開始 ===");
  sessionStorageInstance = new PrismaSessionStorage(prisma);
  console.log("=== PrismaSessionStorage 實例化成功 ===");
} catch (e) {
  console.error("[Log] PrismaSessionStorage 實例化失敗", e);
  throw e;
}

console.log("=== 開始配置 shopifyApp ===");
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: sessionStorageInstance,
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: false,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  afterAuth: async ({ admin, shop, session }: any) => {
    console.log("=== [DEBUG] 進入 afterAuth callback ===", new Date().toISOString());
    console.log("[DEBUG] shop:", shop);
    console.log("[DEBUG] session:", session);
    console.log("[DEBUG] admin:", admin);
    console.log("[DEBUG] session?.accessToken:", session?.accessToken);
    console.log("[DEBUG] admin.session?.accessToken:", admin?.session?.accessToken);
    console.log("【afterAuth】session:", session);
    console.log("【afterAuth】admin.session:", admin.session);
    console.log("【afterAuth】accessToken:", session?.accessToken, admin.session?.accessToken);
    console.log("=== 進入 afterAuth callback ===");
    console.log("【afterAuth】觸發時間:", new Date().toISOString());
    console.log("【afterAuth】shop:", shop);
    console.log("【afterAuth】session:", {
      id: session?.id,
      shop: session?.shop,
      state: session?.state,
      isOnline: session?.isOnline,
      scope: session?.scope,
      expires: session?.expires,
      accessToken: session?.accessToken ? "已設定" : "未設定"
    });
    console.log("【afterAuth】admin 物件:", admin ? "已建立" : "未建立");
    console.log("【afterAuth】環境變數:", {
      NODE_ENV: process.env.NODE_ENV,
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
      SCOPES: process.env.SCOPES
    });

    if (!shop) {
      console.error("【afterAuth】錯誤: shop 參數為空");
      throw new Error("Shop 參數為空");
    }

    if (!admin) {
      console.error("【afterAuth】錯誤: admin 物件為空");
      throw new Error("Admin 物件為空");
    }

    if (!session?.accessToken) {
      console.error("【afterAuth】錯誤: accessToken 未取得");
      throw new Error("Access Token 未取得");
    }

    try {
      // 新增 debug log
      const accessToken = session?.accessToken;
      console.log("[DEBUG] Access Token:", accessToken ? "存在" : "不存在");
      const shopDomain = session?.shop;
      console.log("[DEBUG] Shop Domain:", shopDomain);
      console.log("[DEBUG] admin.rest.get:", typeof admin.rest.get);
      console.log("[DEBUG] SHOPIFY_API_KEY:", process.env.SHOPIFY_API_KEY ? "存在" : "不存在");
      console.log("[DEBUG] SHOPIFY_API_SECRET:", process.env.SHOPIFY_API_SECRET ? "存在" : "不存在");
      console.log("[DEBUG] SHOPIFY_APP_URL:", process.env.SHOPIFY_APP_URL);
      console.log("[DEBUG] 準備查詢 ScriptTag，header:", {
        "X-Shopify-Access-Token": accessToken ? "存在" : "不存在"
      });

      // 產生 tracking ID
      const base64 = Buffer.from(shop).toString('base64').replace(/=+$/, '');
      const trackingId = `spfy-${base64}`;
      const appUrl = process.env.SHOPIFY_APP_URL || 'https://shopify-ddkt-analysis-tracking.vercel.app';
      const scriptUrl = `${appUrl}/pixel.js?tid=${trackingId}`;
      console.log('【afterAuth】產生 trackingId:', trackingId);
      console.log('【afterAuth】scriptUrl:', scriptUrl);

      // 測試 admin API 連接
      console.log('【afterAuth】測試 admin API 連接...');
      const shopInfo = await admin.rest.get({ path: 'shop' });
      console.log('【afterAuth】shopInfo 取得成功:', JSON.stringify(shopInfo.body));

      // 檢查 Web Pixel Extension 狀態
      try {
        console.log('【Extension】=== 開始檢查 Web Pixel Extension 狀態 ===');
        console.log('【Extension】觸發時間:', new Date().toISOString());
        console.log('【Extension】商店:', shop);
        console.log('【Extension】環境變數:', {
          SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
          NODE_ENV: process.env.NODE_ENV
        });

        // 新增 debug log
        const accessToken = session?.accessToken;
        console.log("[DEBUG] Extension 檢查 - Access Token:", accessToken ? "存在" : "不存在");
        const shopDomain = session?.shop;
        console.log("[DEBUG] Extension 檢查 - Shop Domain:", shopDomain);
        console.log("[DEBUG] Extension 檢查 - admin.rest.get:", typeof admin.rest.get);
        console.log("[DEBUG] Extension 檢查 - 準備查詢 web_pixels，header:", {
          "X-Shopify-Access-Token": accessToken ? "存在" : "不存在"
        });

        // 查詢 Web Pixels - 嘗試不同的 API 路徑
        let webPixels;

        try {
          // 嘗試標準的 web_pixels 路徑
          const response = await admin.rest.get({ path: 'web_pixels' });
          webPixels = response.body;
          console.log("【Extension】使用 web_pixels 路徑成功");
        } catch (error: any) {
          console.log("【Extension】web_pixels 路徑失敗，嘗試其他路徑:", error?.status, error?.statusText);

          try {
            // 嘗試 web_pixel_extensions 路徑
            const response = await admin.rest.get({ path: 'web_pixel_extensions' });
            webPixels = response.body;
            console.log("【Extension】使用 web_pixel_extensions 路徑成功");
          } catch (error2: any) {
            console.log("【Extension】web_pixel_extensions 路徑也失敗:", error2?.status, error2?.statusText);

            try {
              // 嘗試 extensions 路徑
              const response = await admin.rest.get({ path: 'extensions' });
              webPixels = response.body;
              console.log("【Extension】使用 extensions 路徑成功");
            } catch (error3: any) {
              console.log("【Extension】所有路徑都失敗，拋出錯誤");
              throw error3;
            }
          }
        }
        console.log('【Extension】Web Pixels API 回應類型:', typeof webPixels);
        console.log('【Extension】Web Pixels API 回應 keys:', Object.keys(webPixels || {}));
        // 避免循環引用問題，只記錄基本資訊
        if (webPixels && typeof webPixels === 'object') {
          console.log('【Extension】Web Pixels API 回應基本資訊:', {
            hasWebPixels: !!(webPixels as any).web_pixels,
            webPixelsCount: Array.isArray((webPixels as any).web_pixels) ? (webPixels as any).web_pixels.length : 0,
            webPixelsTitles: Array.isArray((webPixels as any).web_pixels) ? (webPixels as any).web_pixels.map((p: any) => p.title) : []
          });
        }
        console.log('【Extension】現有 Web Pixels 數量:', webPixels.web_pixels?.length || 0);
        console.log('【Extension】所有 Web Pixels 標題:', webPixels.web_pixels?.map((p: any) => p.title) || []);

        // 檢查是否有我們的 extension
        const ourPixel = webPixels.web_pixels?.find((pixel: any) =>
          pixel.title === 'DDKT Analysis Tracking' ||
          pixel.title === 'ddkt-tracking' ||
          pixel.title?.includes('ddkt')
        );

        if (ourPixel) {
          console.log('【Extension】✅ 找到我們的 Web Pixel Extension');
          console.log('【Extension】Extension ID:', ourPixel.id);
          console.log('【Extension】Extension 狀態:', ourPixel.status);
          console.log('【Extension】Extension 標題:', ourPixel.title);
          console.log('【Extension】Extension 創建時間:', ourPixel.created_at);
          console.log('【Extension】Extension 更新時間:', ourPixel.updated_at);
          console.log('【Extension】Extension 詳細資訊:', JSON.stringify(ourPixel, null, 2));
        } else {
          console.log('【Extension】❌ 未找到我們的 Web Pixel Extension');
          console.log('【Extension】可能的原因:');
          console.log('【Extension】1. Extension 尚未在 Partner 後台部署');
          console.log('【Extension】2. Extension 名稱不匹配');
          console.log('【Extension】3. 需要重新安裝 App');
          console.log('【Extension】4. Partner 後台設定問題');
          console.log('【Extension】建議操作:');
          console.log('【Extension】1. 檢查 Partner 後台 Extension 設定');
          console.log('【Extension】2. 重新執行 npx shopify app deploy');
          console.log('【Extension】3. 重新安裝 App 到商店');
          console.log('【Extension】4. 到商店後台手動新增像素');
        }

        console.log('【Extension】=== Web Pixel Extension 檢查完成 ===');
      } catch (webPixelErr) {
        console.error('【Extension】❌ 查詢 Web Pixels 失敗:', (webPixelErr as any)?.message);
        console.error('【Extension】錯誤詳情:', (webPixelErr as any)?.stack);
        console.error('【Extension】錯誤狀態:', {
          status: (webPixelErr as any)?.status,
          statusText: (webPixelErr as any)?.statusText,
          name: (webPixelErr as any)?.name
        });
        console.error('【Extension】可能的原因:');
        console.error('【Extension】1. API 權限不足');
        console.error('【Extension】2. Access Token 無效');
        console.error('【Extension】3. API 版本不支援');
        console.error('【Extension】4. 網路連接問題');
      }

      // 查詢現有 ScriptTag
      console.log('【afterAuth】[步驟1] 查詢現有 ScriptTag...');
      const { body } = await admin.rest.get({ path: 'script_tags' });
      if (body && Array.isArray(body.script_tags)) {
        console.log("[DEBUG] ScriptTag API 回傳 script_tags 數量:", body.script_tags.length);
      } else {
        console.log("[DEBUG] ScriptTag API 回傳內容:", typeof body, body && Object.keys(body));
      }
      console.log('【afterAuth】[步驟1] 查詢完成，註冊前所有 ScriptTag:', JSON.stringify(body.script_tags));

      // 刪除舊的 ScriptTag
      for (const tag of body.script_tags) {
        if (tag.src && tag.src.startsWith(`${appUrl}/pixel.js`)) {
          try {
            console.log('【afterAuth】[步驟2] 刪除舊 ScriptTag:', tag.id, tag.src);
            await admin.rest.delete({ path: `script_tags/${tag.id}` });
            console.log('【afterAuth】[步驟2] 已刪除舊 ScriptTag:', tag.id);
          } catch (deleteErr) {
            console.error('【afterAuth】[步驟2] 刪除 ScriptTag 失敗:', tag.id, (deleteErr as any)?.message, (deleteErr as any)?.stack);
          }
        }
      }

      // 註冊新的 ScriptTag
      try {
        console.log('【afterAuth】[步驟3] 註冊新的 ScriptTag...');
        const result = await admin.rest.post({
          path: 'script_tags',
          data: {
            script_tag: {
              event: 'onload',
              src: scriptUrl,
            },
          },
          type: 'application/json',
        });
        console.log('【afterAuth】[步驟3] ScriptTag 註冊成功:', JSON.stringify(result.body));
      } catch (registerErr) {
        console.error('【afterAuth】[步驟3] ScriptTag 註冊失敗:', (registerErr as any)?.message, (registerErr as any)?.stack);
        throw registerErr;
      }

      // 再查詢一次 ScriptTag 確認
      try {
        const { body: afterBody } = await admin.rest.get({ path: 'script_tags' });
        console.log('【afterAuth】[步驟4] 註冊後所有 ScriptTag:', JSON.stringify(afterBody.script_tags));
      } catch (finalQueryErr) {
        console.error('【afterAuth】[步驟4] 註冊後查詢 ScriptTag 失敗:', (finalQueryErr as any)?.message, (finalQueryErr as any)?.stack);
      }

      console.log('【afterAuth】安裝流程完成！');
    } catch (e: any) {
      console.error('【afterAuth】ScriptTag 註冊流程失敗:', e?.message, e?.stack);
      throw e;
    }
  },
});
console.log("=== Shopify app 初始化完成 ===");

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
