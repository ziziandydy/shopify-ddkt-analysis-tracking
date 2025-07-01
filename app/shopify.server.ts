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
let sessionStorageInstance;
try {
  console.log("=== PrismaSessionStorage 實例化開始 ===");
  sessionStorageInstance = new PrismaSessionStorage(prisma);
  console.log("=== PrismaSessionStorage 實例化成功 ===");
} catch (e) {
  console.error("[Log] PrismaSessionStorage 實例化失敗", e);
  throw e;
}

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
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  afterAuth: async ({ admin, shop }: any) => {
    console.log("=== 進入 afterAuth callback ===", { shop, env: process.env.NODE_ENV });
    console.log('【afterAuth】觸發！shop:', shop, 'env:', process.env.NODE_ENV, 'appUrl:', process.env.SHOPIFY_APP_URL);
    // 產生 tracking ID
    const base64 = Buffer.from(shop).toString('base64').replace(/=+$/, '');
    const trackingId = `spfy-${base64}`;
    const appUrl = process.env.SHOPIFY_APP_URL || 'https://shopify-ddkt-analysis-tracking.vercel.app';
    const scriptUrl = `${appUrl}/pixel.js?tid=${trackingId}`;
    console.log('【afterAuth】產生 trackingId:', trackingId, 'scriptUrl:', scriptUrl);
    try {
      // 查詢現有 ScriptTag
      const { body } = await admin.rest.get({ path: 'script_tags' });
      console.log('【afterAuth】註冊前所有 ScriptTag:', JSON.stringify(body.script_tags));
      for (const tag of body.script_tags) {
        if (tag.src && tag.src.startsWith(`${appUrl}/pixel.js`)) {
          await admin.rest.delete({ path: `script_tags/${tag.id}` });
          console.log('【afterAuth】已刪除舊 ScriptTag:', tag.id, tag.src);
        }
      }
      // 註冊新的 ScriptTag
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
      console.log('【afterAuth】ScriptTag 註冊成功:', scriptUrl, JSON.stringify(result));
      // 再查詢一次 ScriptTag
      const { body: afterBody } = await admin.rest.get({ path: 'script_tags' });
      console.log('【afterAuth】註冊後所有 ScriptTag:', JSON.stringify(afterBody.script_tags));
    } catch (e) {
      console.error('【afterAuth】ScriptTag 註冊流程失敗:', e);
    }
    // 額外記錄 admin user 資訊
    try {
      const shopInfo = await admin.rest.get({ path: 'shop' });
      console.log('【afterAuth】shopInfo:', JSON.stringify(shopInfo));
    } catch (e) {
      console.error('【afterAuth】取得 shopInfo 失敗:', e);
    }
    console.log('【afterAuth】安裝流程結束！');
  },
});
console.log("=== Shopify app 初始化結束 ===");

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
