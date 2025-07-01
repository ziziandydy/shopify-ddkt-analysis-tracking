import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  AdminApiContext,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  afterAuth: async ({ admin, shop }: any) => {
    console.log('【安裝 afterAuth】被呼叫！');
    // 產生 tracking ID
    const base64 = Buffer.from(shop).toString('base64').replace(/=+$/, '');
    const trackingId = `spfy-${base64}`;
    const scriptUrl = `https://506e-111-249-187-217.ngrok-free.app/pixel.js?tid=${trackingId}`;
    console.log('【安裝 afterAuth】shop:', shop);
    console.log('【安裝 afterAuth】trackingId:', trackingId);
    console.log('【安裝 afterAuth】scriptUrl:', scriptUrl);
    try {
      // 查詢現有 ScriptTag
      const { body } = await admin.rest.get({ path: 'script_tags' });
      console.log('【安裝 afterAuth】註冊前所有 ScriptTag:', body.script_tags);
      for (const tag of body.script_tags) {
        if (tag.src && tag.src.startsWith('https://506e-111-249-187-217.ngrok-free.app/pixel.js')) {
          await admin.rest.delete({ path: `script_tags/${tag.id}` });
          console.log('【安裝 afterAuth】已刪除舊 ScriptTag:', tag.id, tag.src);
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
      console.log('【安裝 afterAuth】ScriptTag 註冊成功:', scriptUrl, result);
      // 再查詢一次 ScriptTag
      const { body: afterBody } = await admin.rest.get({ path: 'script_tags' });
      console.log('【安裝 afterAuth】註冊後所有 ScriptTag:', afterBody.script_tags);
    } catch (e) {
      console.error('【安裝 afterAuth】ScriptTag 註冊失敗:', e);
    }
    // 額外記錄 admin user 資訊
    try {
      const shopInfo = await admin.rest.get({ path: 'shop' });
      console.log('【安裝 afterAuth】shopInfo:', shopInfo);
    } catch (e) {
      console.error('【安裝 afterAuth】取得 shopInfo 失敗:', e);
    }
    console.log('【安裝 afterAuth】安裝流程結束！');
  },
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
