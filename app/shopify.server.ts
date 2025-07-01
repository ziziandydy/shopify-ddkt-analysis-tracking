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

      // 查詢現有 ScriptTag
      console.log('【afterAuth】查詢現有 ScriptTag...');
      const { body } = await admin.rest.get({ path: 'script_tags' });
      console.log('【afterAuth】註冊前所有 ScriptTag:', JSON.stringify(body.script_tags));

      // 刪除舊的 ScriptTag
      for (const tag of body.script_tags) {
        if (tag.src && tag.src.startsWith(`${appUrl}/pixel.js`)) {
          console.log('【afterAuth】刪除舊 ScriptTag:', tag.id, tag.src);
          await admin.rest.delete({ path: `script_tags/${tag.id}` });
          console.log('【afterAuth】已刪除舊 ScriptTag:', tag.id);
        }
      }

      // 註冊新的 ScriptTag
      console.log('【afterAuth】註冊新的 ScriptTag...');
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
      console.log('【afterAuth】ScriptTag 註冊成功:', JSON.stringify(result.body));

      // 再查詢一次 ScriptTag 確認
      const { body: afterBody } = await admin.rest.get({ path: 'script_tags' });
      console.log('【afterAuth】註冊後所有 ScriptTag:', JSON.stringify(afterBody.script_tags));

      console.log('【afterAuth】安裝流程完成！');
    } catch (e: any) {
      console.error('【afterAuth】ScriptTag 註冊流程失敗:', e);
      console.error('【afterAuth】錯誤詳情:', {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        status: e?.status,
        statusText: e?.statusText
      });

      // 如果是 API 錯誤，記錄更多詳情
      if (e?.status) {
        console.error('【afterAuth】API 錯誤狀態:', e.status, e.statusText);
        if (e?.body) {
          console.error('【afterAuth】API 錯誤回應:', JSON.stringify(e.body));
        }
      }

      throw e; // 重新拋出錯誤以確保安裝失敗
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
