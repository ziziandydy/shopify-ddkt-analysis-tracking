import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { logCookieInfo, logCookieHeaders } from "../utils/cookie-logger";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("=== Auth 路由被觸發 ===", request.url);
  console.log("【Auth】請求 URL:", request.url);
  console.log("【Auth】請求方法:", request.method);
  console.log("【Auth】User-Agent:", request.headers.get("user-agent"));
  console.log("【Auth】Referer:", request.headers.get("referer"));
  console.log("【Auth】Host:", request.headers.get("host"));

  // 詳細記錄 Cookie 資訊
  logCookieHeaders("Auth", request);
  logCookieInfo("Auth", request);

  console.log("【Auth】環境變數檢查:", {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "已設定" : "未設定",
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "已設定" : "未設定",
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "未設定",
    NODE_ENV: process.env.NODE_ENV || "未設定"
  });

  try {
    console.log("【Auth】開始執行 authenticate.admin...");
    const result = await authenticate.admin(request);
    console.log("【Auth】authenticate.admin 成功完成");
    console.log("【Auth】認證結果:", {
      session: result.session ? "已建立" : "未建立",
      admin: result.admin ? "已建立" : "未建立",
      shop: result.session?.shop || "未取得"
    });
    return null;
  } catch (error: any) {
    console.error("【Auth】認證過程發生錯誤:");
    console.error("【Auth】錯誤類型:", error?.constructor?.name);
    console.error("【Auth】錯誤訊息:", error?.message);
    console.error("【Auth】錯誤堆疊:", error?.stack);
    console.error("【Auth】錯誤狀態:", error?.status);
    console.error("【Auth】錯誤狀態文字:", error?.statusText);

    // 如果是重定向錯誤，記錄重定向資訊
    if (error?.status >= 300 && error?.status < 400) {
      console.log("【Auth】檢測到重定向:", {
        status: error.status,
        headers: Object.fromEntries(error.headers?.entries() || []),
        url: error.headers?.get("location")
      });
    }

    // 如果是 401 或 403 錯誤，可能是權限問題
    if (error?.status === 401) {
      console.error("【Auth】認證失敗 - 401 Unauthorized");
    } else if (error?.status === 403) {
      console.error("【Auth】權限不足 - 403 Forbidden");
    }

    throw error;
  }
};
